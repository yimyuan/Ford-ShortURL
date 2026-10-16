// Disposable localhost services only. Never point these tests at Supabase/production.
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, readdir } from 'node:fs/promises';
import { randomUUID, createHash } from 'node:crypto';
import { createClient } from 'redis';
import { createAuthRepository } from '../src/modules/auth/auth.repository.js';

const database = process.env.TEST_DATABASE_URL;
const redisUrl = process.env.TEST_REDIS_URL;
for (const [value, protocol] of [
  [database, 'postgresql:'],
  [redisUrl, 'redis:'],
]) {
  const url = new URL(value);
  assert.equal(url.protocol, protocol);
  assert.ok(
    ['127.0.0.1', 'localhost'].includes(url.hostname),
    'Integration tests require localhost',
  );
}
assert.equal(
  new URL(database).pathname,
  '/shorturl_test',
  'Use a disposable shorturl_test database',
);
const exec = promisify(execFile);
async function sql(statement) {
  const { stdout } = await exec(
    'psql',
    [database, '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-c', statement],
    { timeout: 30000, maxBuffer: 1024 * 1024 },
  );
  return stdout.trim();
}
// Refuse to wipe or reuse an existing application schema.
assert.equal(await sql("SELECT count(*) FROM pg_namespace WHERE nspname='app'"), '0');
await sql(
  'CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; CREATE ROLE authenticator;',
);
const directory = new URL('../sql/', import.meta.url);
for (const file of (await readdir(directory))
  .filter((name) => /^\d{3}.*\.sql$/.test(name))
  .sort()) {
  // The standard postgres image has no pg_cron. Retention is independent of these tests.
  if (file.startsWith('010_')) continue;
  await sql(await readFile(new URL(file, directory), 'utf8'));
}
await sql("INSERT INTO app.admin_audit_logs(actor_id,actor_email,target_id,target_email,action,created_at) VALUES(gen_random_uuid(),'fixture@example.test',gen_random_uuid(),'fixture@example.test','change_role',now()-interval '2 years')");
assert.equal(await sql("SELECT to_regprocedure('app.prune_admin_audit_logs()') IS NULL"), 't');
assert.equal(await sql("SELECT count(*) FROM app.admin_audit_logs WHERE created_at < now()-interval '1 year'"), '1');
console.log('PASS: unused audit cleanup function is absent and security audit history is retained');
const owner = randomUUID(),
  other = randomUUID();
await sql(
  `INSERT INTO app.users(id,email,password_hash) VALUES('${owner}','owner@example.test','fixture'),('${other}','other@example.test','fixture')`,
);
const hash = createHash('sha256').update('same-payload').digest('hex');
const create = (user, code, key = randomUUID(), fingerprint = hash) =>
  sql(
    `SELECT app.create_short_link('${user}','${code}','https://example.test/','${key}','${fingerprint}')`,
  );
const key = randomUUID();
const created = await Promise.all(
  Array.from({ length: 8 }, (_, i) => create(owner, `retry-${i}`, key)),
);
const link = JSON.parse(created[0]);
assert.ok(created.every((value) => JSON.parse(value).id === link.id));
assert.equal(await sql(`SELECT count(*) FROM app.links WHERE user_id='${owner}'`), '1');
await assert.rejects(create(owner, 'changed', key, 'b'.repeat(64)), /IDEMPOTENCY_CONFLICT/);
console.log('PASS: concurrent/lost-response retries produce one link; changed payload conflicts');

const custom = await Promise.allSettled([create(owner, 'same-name'), create(other, 'same-name')]);
assert.equal(custom.filter((result) => result.status === 'fulfilled').length, 1);
assert.ok(
  custom.some(
    (result) => result.status === 'rejected' && /duplicate key/.test(result.reason.message),
  ),
);
await Promise.all(
  Array.from({ length: 40 }, () =>
    sql(`SELECT * FROM app.resolve_short_link('${link.short_code}')`),
  ),
);
assert.equal(await sql(`SELECT click_count FROM app.links WHERE id='${link.id}'`), '40');
assert.equal(
  await sql(`SELECT sum(click_count) FROM app.link_click_daily WHERE link_id='${link.id}'`),
  '40',
);
await sql(`SELECT * FROM app.resolve_short_link('${link.short_code}',NULL,FALSE)`);
assert.equal(await sql(`SELECT click_count FROM app.links WHERE id='${link.id}'`), '40');
console.log(
  'PASS: custom-code race has one winner; concurrent GET counts match daily totals; HEAD does not count',
);

await sql(`DELETE FROM app.links WHERE id='${link.id}'`);
await assert.rejects(create(owner, link.short_code), /duplicate key/);
await assert.rejects(create(other, link.short_code), /duplicate key/);
await assert.rejects(create(owner, 'new-code', key), /REQUEST_LINK_DELETED/);
await sql(
  `DELETE FROM app.links WHERE user_id='${owner}'; DELETE FROM app.users WHERE id='${owner}'`,
);
await assert.rejects(create(other, link.short_code), /duplicate key/);
await sql(`UPDATE app.users SET is_active=FALSE WHERE id='${other}'`);
await assert.rejects(create(other, 'suspended'), /LINK_CREATE_FORBIDDEN/);
assert.equal(
  await sql("SELECT has_table_privilege('service_role','app.short_code_reservations','DELETE')"),
  'f',
);
console.log(
  'PASS: deletion/account deletion never releases code; old request stays deleted; suspended creation rejected',
);

const client = createClient({
  url: redisUrl,
  socket: { connectTimeout: 2000, socketTimeout: 2000, reconnectStrategy: false },
});
client.on('error', () => {});
await client.connect();
try {
  const repo = createAuthRepository(async () => client);
  const id = randomUUID();
  await repo.createFamily(id, {
    userId: other,
    refreshHash: 'old',
    expiresAt: Math.floor(Date.now() / 1000) + 60,
  });
  const results = await Promise.all([
    repo.rotateRefreshToken(id, 'old', 'next-a', 0),
    repo.rotateRefreshToken(id, 'old', 'next-b', 0),
  ]);
  assert.equal(results.filter(Boolean).length, 1);
  assert.equal(await repo.findFamily(id), null);
  console.log('PASS: real Redis Lua rotates once and revokes replayed token family');
} finally {
  client.destroy();
}
