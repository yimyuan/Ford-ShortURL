import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  createLinksService,
  createShortCode,
} from "../src/modules/links/links.service.js";
import { createLinksRepository } from "../src/modules/links/links.repository.js";
import { createLinksCache } from "../src/modules/links/links.cache.js";
import {
  parseLinkPage,
  parseCreateLink,
} from "../src/modules/links/links.dto.js";
import { AppError } from "../src/errors/app-error.js";
import QRCode from "qrcode";
import { createLinkRateLimit } from "../src/middleware/rate-limit.js";

const settings = { publicBaseUrl: "https://short.example", production: true };
const owner = { id: randomUUID() };
const row = {
  id: randomUUID(),
  user_id: owner.id,
  short_code: "Ab123xyZ",
  original_url: "https://example.com/path?q=1",
  click_count: "9007199254740993",
  created_at: "2026-10-15T00:00:00Z",
  is_active: true,
};
const cache = { get: async () => null, set: async () => {} };

test("custom names persist exactly, reject malformed input and never retry or silently randomize a taken name", async () => {
  let calls = 0;
  const service = createLinksService(
    {
      create: async (input) => {
        calls++;
        assert.equal(input.shortCode, "Summer-sale");
        return { ...row, short_code: input.shortCode };
      },
    },
    {
      settings,
      cache,
      generate: () => assert.fail("Custom names must not be randomized"),
    },
  );
  const result = await service.create(owner, {
    originalUrl: row.original_url,
    customCode: " Summer-sale ",
  });
  assert.equal(result.shortUrl, "https://short.example/r/Summer-sale");
  assert.equal(calls, 1);
  for (const customCode of [
    "ab",
    "-sale",
    "sale-",
    "hello world",
    "ไทย",
    "../sale",
    "a".repeat(41),
    null,
    12,
  ]) {
    assert.throws(
      () => parseCreateLink({ originalUrl: row.original_url, customCode }),
      { code: "INVALID_CUSTOM_CODE" },
    );
  }
  assert.equal(
    parseCreateLink({ originalUrl: row.original_url, customCode: " " })
      .customCode,
    undefined,
  );
  assert.equal(
    parseCreateLink({
      originalUrl: row.original_url,
      customCode: "a".repeat(40),
    }).customCode.length,
    40,
  );
  let collisions = 0;
  const taken = createLinksService(
    {
      create: async () => {
        collisions++;
        throw new AppError(409, "SHORT_CODE_COLLISION", "taken");
      },
    },
    { settings, cache },
  );
  await assert.rejects(
    taken.create(owner, {
      originalUrl: row.original_url,
      customCode: "Summer-sale",
    }),
    { status: 409, code: "CUSTOM_CODE_TAKEN" },
  );
  assert.equal(collisions, 1);
});

test("custom names resolve through the same authoritative redirect and QR URL", async () => {
  const custom = { ...row, short_code: "my-sale" };
  let qrUrl;
  const service = createLinksService(
    {
      incrementAndResolve: async (code) => {
        assert.equal(code, custom.short_code);
        return custom;
      },
      findById: async () => custom,
    },
    {
      settings,
      cache,
      renderQr: async (url) => {
        qrUrl = url;
        return "svg";
      },
    },
  );
  assert.equal(await service.redirect("my-sale"), row.original_url);
  await service.qr(owner, row.id);
  assert.equal(qrUrl, "https://short.example/r/my-sale");
  await assert.rejects(service.redirect("-bad"), { status: 404 });
});

test("creation retries unique collisions, persists normalized URL/owner and exposes no owner fields", async () => {
  let attempts = 0;
  const service = createLinksService(
    {
      create: async (input) => {
        const { requestId, requestHash, ...record } = input;
        assert.match(requestId, /^[a-f0-9-]{36}$/);
        assert.match(requestHash, /^[a-f0-9]{64}$/);
        assert.deepEqual(record, {
          userId: owner.id,
          shortCode: row.short_code,
          originalUrl: "https://example.com/path?q=1",
        });
        if (++attempts < 3)
          throw new AppError(409, "SHORT_CODE_COLLISION", "Collision");
        return row;
      },
    },
    { settings, cache, generate: () => row.short_code },
  );
  const result = await service.create(owner, {
    originalUrl: " https://example.com/path?q=1 ",
  });
  assert.equal(attempts, 3);
  assert.equal(result.shortUrl, "https://short.example/r/Ab123xyZ");
  assert.equal(result.clickCount, "9007199254740993");
  assert.equal(result.user_id, undefined);
  await assert.rejects(
    service.create(owner, { originalUrl: "javascript:alert(1)" }),
    { status: 422 },
  );
});

test("allocation has bounded collision retry and invalid deployment never writes", async () => {
  let calls = 0;
  const repository = {
    create: async () => {
      calls++;
      throw new AppError(409, "SHORT_CODE_COLLISION", "Collision");
    },
  };
  await assert.rejects(
    createLinksService(repository, { settings, cache }).create(owner, {
      originalUrl: "https://example.com",
    }),
    { code: "SHORT_CODE_UNAVAILABLE" },
  );
  assert.equal(calls, 5);
  await assert.rejects(
    createLinksService(repository, {
      settings: { ...settings, publicBaseUrl: "http://user:pass@bad.example/" },
      cache,
    }).create(owner, { originalUrl: "https://example.com" }),
    { code: "PUBLIC_URL_INVALID" },
  );
  assert.equal(calls, 5);
  for (let index = 0; index < 100; index++)
    assert.match(createShortCode(), /^[A-Za-z0-9]{8}$/);
});

test("owned details, history and QR cannot expose a different user link", async () => {
  const service = createLinksService(
    {
      findById: async (id, userId) => {
        assert.equal(id, row.id);
        assert.equal(userId, owner.id);
        return null;
      },
    },
    {
      settings,
      cache,
      renderQr: () => assert.fail("Must not render foreign QR"),
    },
  );
  await assert.rejects(service.get(owner, row.id), { status: 404 });
  await assert.rejects(service.qr(owner, row.id), { status: 404 });
  await assert.rejects(service.get(owner, "not-a-uuid"), { status: 404 });
  let captured;
  const history = createLinksService(
    {
      listByUser: async (userId, page) => {
        captured = { userId, page };
        return { items: [row], total: 21, ...page };
      },
    },
    { settings, cache },
  );
  const result = await history.list(owner, { page: 2, pageSize: 10 });
  assert.deepEqual(captured, {
    userId: owner.id,
    page: { page: 2, pageSize: 10 },
  });
  assert.equal(result.total, 21);
  assert.equal(result.items[0].shortUrl, "https://short.example/r/Ab123xyZ");
});

test("cached redirects still use authoritative atomic database operation; HEAD does not count", async () => {
  const wrongId = randomUUID();
  const calls = [];
  let cached;
  const service = createLinksService(
    {
      incrementAndResolve: async (...args) => {
        calls.push(args);
        return args[1] === wrongId ? null : row;
      },
    },
    {
      settings,
      cache: {
        get: async () => wrongId,
        set: async (...args) => {
          cached = args;
        },
      },
    },
  );
  assert.equal(await service.redirect(row.short_code, false), row.original_url);
  assert.deepEqual(calls, [
    [row.short_code, wrongId, false],
    [row.short_code, null, false],
  ]);
  assert.deepEqual(cached, [row.short_code, row.id]);
  const unavailable = createLinksService(
    { incrementAndResolve: async () => null },
    { settings, cache },
  );
  await assert.rejects(unavailable.redirect(row.short_code), { status: 404 });
  await assert.rejects(unavailable.redirect("../../secret"), { status: 404 });
});

test("QR renderer receives the public short URL, creates real SVG and uses a scan-friendly quiet zone", async () => {
  const repository = { findById: async () => row };
  const service = createLinksService(repository, { settings, cache });
  const svg = await service.qr(owner, row.id);
  assert.match(svg, /^<svg /);
  assert.match(svg, /viewBox="0 0 \d+ \d+"/);
  let encoded;
  await createLinksService(repository, {
    settings,
    cache,
    renderQr: async (value) => {
      encoded = value;
      return "svg";
    },
  }).qr(owner, row.id);
  assert.equal(encoded, "https://short.example/r/Ab123xyZ");
  const qr = QRCode.create(encoded, { errorCorrectionLevel: "M" });
  assert.ok(qr.modules.size >= 21);
});

test("repository scopes query by owner, preserves bigint text and sanitizes failures", async () => {
  const filters = [];
  const query = {
    select(value) {
      assert.ok(value.includes("click_count::text"));
      return this;
    },
    eq(...args) {
      filters.push(args);
      return this;
    },
    maybeSingle() {
      return this;
    },
    abortSignal: async () => ({ data: null, error: null }),
  };
  assert.equal(
    await createLinksRepository({ from: () => query }).findById(
      row.id,
      owner.id,
    ),
    null,
  );
  assert.deepEqual(filters, [
    ["id", row.id],
    ["user_id", owner.id],
  ]);
  const failing = createLinksRepository({
    rpc: () => ({
      abortSignal: async () => ({ error: { message: "private details" } }),
    }),
  });
  await assert.rejects(failing.incrementAndResolve(row.short_code), {
    status: 503,
    message: "Link data is temporarily unavailable",
  });
});

test("cache outage falls back safely and history pagination rejects unbounded/malformed queries", async () => {
  const failing = createLinksCache(async () => {
    throw new Error("Redis unavailable");
  });
  assert.equal(await failing.get(row.short_code), null);
  await failing.set(row.short_code, row.id);
  assert.deepEqual(parseLinkPage({ page: "2" }), { page: 2, pageSize: 10 });
  for (const input of [
    { page: "-1" },
    { page: ["1", "2"] },
    { page: "1.2" },
    { page: "10000000" },
    { userId: "other" },
  ]) {
    assert.throws(() => parseLinkPage(input), { status: 422 });
  }
});

test("link creation rate limit is tied to verified owner and uses atomic bounded expiry", async () => {
  let input;
  let error;
  await createLinkRateLimit({
    connect: async () => ({
      withCommandOptions() { return this; },
      eval: async (script, query) => {
        input = { script, ...query };
        return 0;
      },
    }),
  })({ user: owner, body: { userId: "attacker" } }, {}, (value) => {
    error = value;
  });
  assert.equal(error.status, 429);
  assert.deepEqual(input.keys, [`shorturl:limit:create:${owner.id}`]);
  assert.deepEqual(input.arguments, ["60", "30"]);
  assert.ok(input.script.includes("redis.call('EXPIRE'"));
});
