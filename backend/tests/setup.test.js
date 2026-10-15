import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSetupAdminInput, toPrimaryAdminDto } from '../src/modules/setup/setup.dto.js';
import { createSetupService } from '../src/modules/setup/setup.service.js';
import { createSetupRepository } from '../src/modules/setup/setup.repository.js';

test('DTO normalizes email without modifying passwords or accepting role injection', () => {
 assert.deepEqual(parseSetupAdminInput({ email: ' ADMIN@ShortURL.loca ', password: '  Keep My Password  ' }), {
  email: 'admin@shorturl.loca', password: '  Keep My Password  '
 });
 assert.throws(() => parseSetupAdminInput({ email: 'a@example.com', password: 'password', role: 'admin' }), { code: 'INVALID_SETUP_INPUT' });
 assert.throws(() => parseSetupAdminInput(null), { code: 'INVALID_SETUP_INPUT' });
});

test('response DTO never includes password, hash or infrastructure fields', () => {
 const dto = toPrimaryAdminDto({ id: 'id', email: 'a@example.com', role: 'admin', is_primary_admin: true, is_active: true,
  password: 'private', password_hash: 'private-hash', secret: 'private-secret' });
 assert.deepEqual(dto, { id: 'id', email: 'a@example.com', role: 'admin', isPrimaryAdmin: true, isActive: true });
 assert.equal(toPrimaryAdminDto(null), null);
});

test('service persists only a hash and returns a safe admin DTO', async () => {
 let saved;
 const service = createSetupService({
  createPrimaryAdmin: async value => { saved = value; return 'new-id'; },
  findPrimaryAdmin: async () => null
 }, { hash: async value => { assert.equal(value, 'original-password'); return 'hashed-password'; } });
 const result = await service.createPrimaryAdmin({ email: 'ADMIN@Example.com', password: 'original-password' });
 assert.deepEqual(saved, { email: 'admin@example.com', passwordHash: 'hashed-password' });
 assert.deepEqual(result, { id: 'new-id', email: 'admin@example.com', role: 'admin', isPrimaryAdmin: true, isActive: true });
 assert.equal(await service.getPrimaryAdmin(), null);
});

test('invalid setup input never reaches hashing or persistence', async () => {
 const service = createSetupService({ createPrimaryAdmin: () => assert.fail('unexpected database write') },
  { hash: () => assert.fail('unexpected hash call') });
 await assert.rejects(service.createPrimaryAdmin({ email: 'invalid', password: 'private' }), { code: 'INVALID_ADMIN_EMAIL' });
});

test('repository preserves atomic duplicate rejection without leaking database errors', async () => {
 const repository = createSetupRepository({ rpc(name, params) {
  assert.equal(name, 'bootstrap_primary_admin');
  assert.deepEqual(params, { p_email: 'a@example.com', p_password_hash: 'hash' });
  return { abortSignal: async () => ({ data: null, error: { code: 'P0001', message: 'database internals' } }) };
 } });
 await assert.rejects(repository.createPrimaryAdmin({ email: 'a@example.com', passwordHash: 'hash' }),
  { code: 'PRIMARY_ADMIN_EXISTS', message: 'PRIMARY_ADMIN_EXISTS' });
});
