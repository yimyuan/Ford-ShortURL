import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {
  defaultQrStyle,
  parseQrStyle,
  parseQrQuery,
  parseQrUpdate,
} from '../src/modules/links/qr.schema.js';
import { renderLinkQr, qrShapeCells } from '../src/modules/links/qr.renderer.js';
import { PNG } from 'pngjs';
import { createLinksService } from '../src/modules/links/links.service.js';
import { createLinksRepository } from '../src/modules/links/links.repository.js';

test('QR validation allows unrestricted opaque colors but rejects malformed styles and unconfirmed writes', () => {
  assert.deepEqual(parseQrStyle({ dark: '#1E3A5F', light: '#F1F5F9', size: 1024 }), {
    dark: '#1e3a5f',
    light: '#f1f5f9',
    size: 1024,
    shape: 'square',
  });
  for (const style of [
    { ...defaultQrStyle, dark: '#ffffff', light: '#111827' },
    { ...defaultQrStyle, dark: '#aaaaaa', light: '#bbbbbb' },
  ])
    assert.deepEqual(parseQrStyle(style), style);
  for (const style of [
    null,
    [],
    { ...defaultQrStyle, dark: '#00000000' },
    { ...defaultQrStyle, light: 'transparent' },
    { ...defaultQrStyle, size: 99999 },
    { ...defaultQrStyle, logo: '<svg/>' },
    { ...defaultQrStyle, shape: 'logo' },
  ])
    assert.throws(() => parseQrStyle(style), { status: 422 });
  assert.deepEqual(parseQrQuery({}), { format: 'svg', style: undefined });
  assert.equal(
    parseQrQuery({ format: 'png', dark: '#111827', light: '#ffffff', size: '256' }).style.size,
    256,
  );
  for (const query of [
    { format: 'jpeg' },
    { dark: '#111827' },
    { format: ['png'] },
    { size: '1e3' },
  ])
    assert.throws(() => parseQrQuery(query), { status: 422 });
  const input = { confirmed: true, style: defaultQrStyle, version: '0' };
  assert.equal(parseQrUpdate(input).version, '0');
  for (const mutation of [
    { confirmed: false },
    { version: 0 },
    { version: '9223372036854775808' },
    { userId: randomUUID() },
  ])
    assert.throws(() => parseQrUpdate({ ...input, ...mutation }), { status: 422 });
});

test('styled SVG and PNG encode the short URL with the selected palette, size and opaque quiet zone', async () => {
  const style = { dark: '#1e3a5f', light: '#f1f5f9', size: 1024 };
  const svg = await renderLinkQr('https://short.example/r/summer-sale', style);
  assert.match(svg, /width="1024"/);
  assert.match(svg, /#1e3a5f/);
  assert.match(svg, /#f1f5f9/);
  const png = await renderLinkQr('https://short.example/r/summer-sale', style, 'png');
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(png.readUInt32BE(16), 1024);
  assert.equal(png.readUInt32BE(20), 1024);
});

test('QR preview and save are owner scoped; saved styles survive reload and formats use the same short URL', async () => {
  const owner = { id: randomUUID() };
  const id = randomUUID();
  const style = { dark: '#14532d', light: '#f0fdf4', size: 256 };
  const row = { id, short_code: 'sale-code', qr_style: style, qr_version: '8' };
  const calls = [];
  const service = createLinksService(
    {
      findById: async (linkId, userId) => {
        assert.equal(linkId, id);
        assert.equal(userId, owner.id);
        return row;
      },
      saveQr: async (...args) => {
        calls.push(args);
        return { qrStyle: style, qrVersion: '9' };
      },
    },
    { settings: { publicBaseUrl: 'https://short.example' }, renderQr: async (...args) => args },
  );
  assert.deepEqual(await service.qr(owner, id), [
    'https://short.example/r/sale-code',
    style,
    'svg',
  ]);
  assert.deepEqual(await service.qr(owner, id, { ...defaultQrStyle, size: '512', format: 'png' }), [
    'https://short.example/r/sale-code',
    defaultQrStyle,
    'png',
  ]);
  assert.deepEqual(await service.saveQr(owner, id, { style, version: '8', confirmed: true }), {
    qrStyle: style,
    qrVersion: '9',
  });
  assert.equal(calls[0][0], owner.id);
  assert.equal(calls[0][1], id);
  assert.equal((await service.get(owner, id)).qrVersion, '8');
  const foreign = createLinksService({
    findById: async () => null,
    saveQr: () => assert.fail('Must not write foreign QR'),
  });
  await assert.rejects(foreign.saveQr(owner, id, { style, version: '8', confirmed: true }), {
    status: 404,
  });
  await assert.rejects(foreign.qr(owner, id), { status: 404 });
});

test('QR persistence uses an atomic revision RPC and returns safe conflict errors', async () => {
  let captured;
  const db = {
    rpc(name, args) {
      captured = { name, args };
      return {
        abortSignal: async () => ({
          data: { qrStyle: defaultQrStyle, qrVersion: '1' },
          error: null,
        }),
      };
    },
  };
  await createLinksRepository(db).saveQr('owner', 'link', { style: defaultQrStyle, version: '0' });
  assert.deepEqual(captured, {
    name: 'save_link_qr',
    args: { p_actor: 'owner', p_link: 'link', p_style: defaultQrStyle, p_version: '0' },
  });
  for (const [message, code] of [
    ['QR_CHANGED', 'QR_CHANGED'],
    ['LINK_NOT_FOUND', 'LINK_NOT_FOUND'],
    ['private details', 'DATABASE_UNAVAILABLE'],
  ]) {
    const failing = createLinksRepository({
      rpc: () => ({ abortSignal: async () => ({ error: { message } }) }),
    });
    await assert.rejects(failing.saveQr('owner', 'link', { style: defaultQrStyle, version: '0' }), {
      code,
    });
  }
});

test('rounded and circular data modules retain square reserved patterns in PNG/SVG without embedded images', async () => {
  const url = 'https://short.example/r/shape-test';
  const modules = qrShapeCells(url);
  const size = 512,
    extent = modules.size + 8;
  for (const shape of ['square', 'rounded', 'dots']) {
    const style = { dark: '#000000', light: '#ffffff', size, shape };
    assert.equal(parseQrStyle(style).shape, shape);
    assert.equal(parseQrQuery({ ...style, size: String(size) }).style.shape, shape);
    const svg = await renderLinkQr(url, style);
    assert.ok(!svg.includes('<image'));
    if (shape === 'dots') assert.match(svg, /<circle/);
    if (shape === 'rounded') assert.match(svg, /rx="0.22"/);
    const png = PNG.sync.read(await renderLinkQr(url, style, 'png'));
    assert.equal(png.width, size);
    assert.equal(png.height, size);
    for (let row = 0; row < modules.size; row++)
      for (let col = 0; col < modules.size; col++) {
        if (!modules.isReserved(row, col)) continue;
        for (const offset of [0.12, 0.5, 0.88]) {
          const x = Math.floor(((col + 4 + offset) * size) / extent);
          const y = Math.floor(((row + 4 + offset) * size) / extent);
          const pixel = png.data[(y * size + x) * 4];
          assert.equal(
            pixel,
            modules.get(row, col) ? 0 : 255,
            `${shape} reserved module ${row},${col}`,
          );
        }
      }
  }
});
