import test from 'node:test';
import assert from 'node:assert/strict';
import { createAdminService } from '../src/modules/admin/admin.service.js';
import { parseAdminAction, parseAuditQuery } from '../src/modules/admin/admin.dto.js';
import { createAuthenticate } from '../src/middleware/authenticate.js';
import { createAuthService } from '../src/modules/auth/auth.service.js';
import { assertDatabaseResult } from '../src/modules/admin/admin.repository.js';
const root = { id: '10000000-0000-4000-8000-000000000001', role: 'admin', isPrimaryAdmin: true };
const target = {
  id: '10000000-0000-4000-8000-000000000002',
  email: 'user@example.com',
  role: 'user',
  is_active: true,
  is_primary_admin: false,
  auth_version: '4',
  linkCount: 3,
};
const update = { confirmed: true, action: 'suspend', version: '4' };

test('every administrative write requires explicit confirmation, a revision and valid action', () => {
  for (const input of [
    { ...update, confirmed: false },
    { ...update, confirmed: 'true' },
    { ...update, version: 4 },
    { ...update, action: 'anything' },
    { ...update, isPrimaryAdmin: true },
    { ...update, action: 'delete_user', emailConfirmation: target.email, linkCount: -1 },
  ])
    assert.throws(() => parseAdminAction(input), { status: 422 });
  assert.deepEqual(parseAdminAction(update), update);
  assert.throws(() => parseAuditQuery({ query: 'x),id.neq.null' }), { status: 422 });
  assert.throws(() => parseAuditQuery({ from: '2026-02-30' }), { status: 422 });
  assert.throws(() => parseAuditQuery({ from: '2026-10-16', to: '2026-10-15' }), { status: 422 });
});
test('root and other admins are protected before credential generation or privileged writes', async () => {
  let row = { ...target };
  let writes = 0;
  const service = createAdminService(
    {},
    {},
    {
      impact: async () => row,
      manage: async () => {
        writes++;
      },
    },
    () => assert.fail('must not hash'),
  );
  await assert.rejects(service.updateUser({ role: 'user' }, target.id, update), { status: 403 });
  await assert.rejects(
    service.updateUser({ id: 'other', role: 'admin' }, target.id, {
      ...update,
      action: 'change_role',
      role: 'admin',
    }),
    { status: 403 },
  );
  row = { ...target, role: 'admin' };
  await assert.rejects(service.updateUser({ id: 'other', role: 'admin' }, target.id, update), {
    status: 403,
  });
  row = { ...target, is_primary_admin: true };
  await assert.rejects(
    service.updateUser(root, target.id, { ...update, action: 'reset_password' }),
    { status: 403 },
  );
  row = { ...target, id: root.id };
  await assert.rejects(service.impact(root, root.id), { status: 403 });
  assert.equal(writes, 0);
});
test('reset generates distinct temporary passwords and stores only the hash in the atomic audit operation', async () => {
  const saved = [];
  const service = createAdminService(
    {},
    {},
    {
      impact: async () => target,
      manage: async (args) => {
        saved.push(args);
        return { auditId: 'audit' };
      },
    },
    async (value) => 'hash:' + value,
  );
  const a = await service.updateUser(root, target.id, { ...update, action: 'reset_password' });
  const b = await service.updateUser(root, target.id, { ...update, action: 'reset_password' });
  assert.match(a.temporaryPassword, /^[A-Za-z0-9_-]{24}$/);
  assert.notEqual(a.temporaryPassword, b.temporaryPassword);
  assert.equal(saved[0].p_password_hash, 'hash:' + a.temporaryPassword);
  assert.equal(saved[0].p_actor, root.id);
  assert.equal(saved[0].p_version, '4');
  assert.ok(!('temporaryPassword' in saved[0]));
});
test('database refusals preserve safe conflict and protection errors without exposing database details', () => {
  assert.throws(() => assertDatabaseResult({ message: 'USER_CHANGED' }), {
    status: 409,
    code: 'USER_CHANGED',
  });
  assert.throws(() => assertDatabaseResult({ message: 'PRIMARY_ADMIN_PROTECTED' }), {
    status: 403,
  });
  assert.throws(
    () => assertDatabaseResult({ message: 'private database credential' }),
    (error) => error.status === 503 && !error.message.includes('private'),
  );
});
test('temporary-password sessions cannot call normal or administrative APIs', async () => {
  const middleware = createAuthenticate(async () => ({ ...root, mustChangePassword: true }));
  for (const [baseUrl, path, blocked] of [
    ['/api/admin', '/users', true],
    ['/api/links', '/', true],
    ['/api/users', '/me', true],
    ['/api/auth', '/me', false],
    ['/api/auth', '/change-password', false],
  ]) {
    let result;
    await middleware({ get: () => 'Bearer token', baseUrl, path }, {}, (error) => {
      result = error;
    });
    assert.equal(result?.code, blocked ? 'PASSWORD_CHANGE_REQUIRED' : undefined);
  }
});
test('password change verifies the current password, requires confirmation, and commits against the current revision', async () => {
  let args;
  const service = createAuthService({
    users: { findById: async () => ({ ...target, password_hash: 'old' }) },
    verify: async (value, hash) => value === 'temporary-pass' && hash === 'old',
    hash: async () => 'new-hash',
    changePassword: async (value) => {
      args = value;
    },
  });
  const input = {
    currentPassword: 'temporary-pass',
    newPassword: 'new-long-password',
    confirmed: true,
  };
  await assert.rejects(service.changePassword(root, { ...input, confirmed: false }), {
    status: 422,
  });
  await assert.rejects(service.changePassword(root, { ...input, currentPassword: 'wrong' }), {
    code: 'PASSWORD_INCORRECT',
  });
  assert.equal(args, undefined);
  await service.changePassword(root, input);
  assert.deepEqual(args, { p_user: target.id, p_version: '4', p_password_hash: 'new-hash' });
});
