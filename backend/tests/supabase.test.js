import test from 'node:test';
import assert from 'node:assert/strict';
import { createBackendClient, checkSupabaseConnection } from '../src/infrastructure/supabase.js';
const settings = { supabaseUrl: 'https://example.supabase.co', supabaseSecretKey: 'sb_secret_test' };
test('backend client enforces HTTPS and backend keys; disables auth persistence', () => {
 let actual;
 createBackendClient(settings, (...args) => { actual = args; return {}; });
 assert.equal(actual[2].db.schema, 'app');
 assert.equal(actual[2].auth.persistSession, false);
 assert.equal(actual[2].auth.autoRefreshToken, false);
 for (const supabaseUrl of ['http://example.supabase.co', 'postgresql://host/db', 'https://user:pass@example.com', 'https://example.com/rest/v1']) {
  assert.throws(() => createBackendClient({ ...settings, supabaseUrl }, () => {}), { code: 'SUPABASE_URL_INVALID' });
 }
 for (const supabaseSecretKey of ['', 'sb_publishable_test', 'not-a-key']) {
  assert.throws(() => createBackendClient({ ...settings, supabaseSecretKey }, () => {}), { code: 'SUPABASE_SECRET_KEY_INVALID' });
 }
});
function mockClient(results, calls) {
 return { from(table) {
  calls.push(table);
  return { select(columns, options) {
   assert.equal(columns, 'id'); assert.equal(options, undefined);
   return { limit(n) { assert.equal(n, 0); return { abortSignal(signal) { assert.ok(signal instanceof AbortSignal); return Promise.resolve(results[table]); } }; } };
  } };
 } };
}
test('readiness checks both tables without fetching rows and accepts empty tables', async () => {
 const calls = [];
 await checkSupabaseConnection(mockClient({ users: { error: null }, links: { error: null } }, calls));
 assert.deepEqual(calls, ['users', 'links']);
});
test('missing tables or permissions fail readiness without leaking server details', async () => {
 const calls = [];
 await assert.rejects(checkSupabaseConnection(mockClient({ users: { error: null }, links: { error: { code: '42501', message: 'sensitive details' }, status: 403 } }, calls)), { code: '42501', message: '42501' });
 await assert.rejects(checkSupabaseConnection(mockClient({ users: { error: { message: 'secret' }, status: 401 } }, [])), { code: 'HTTP_401' });
});

test('schema exposure errors preserve the actionable PostgREST code', async () => {
 await assert.rejects(checkSupabaseConnection(mockClient({ users: { error: { code: 'PGRST106' }, status: 406 } }, [])), { code: 'PGRST106' });
});
