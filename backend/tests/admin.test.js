import test from 'node:test';
import assert from 'node:assert/strict';
import { createAdminService } from '../src/modules/admin/admin.service.js';
import { createUsersRepository } from '../src/modules/users/users.repository.js';

test('admin read APIs reject normal users before accessing privileged records', async () => {
  const repository = {
    list() {
      assert.fail('Privileged query must not run');
    },
  };
  const service = createAdminService(repository, repository);
  await assert.rejects(service.listUsers({ id: 'normal', role: 'user' }), { status: 403 });
  await assert.rejects(service.listLinks(null), { status: 403 });
});

test('admin read responses strip credentials and preserve exact counts and link precision', async () => {
  const service = createAdminService(
    {
      list: async () => ({
        items: [
          {
            id: 'u',
            email: 'a@example.com',
            role: 'admin',
            is_active: true,
            is_primary_admin: true,
            password_hash: 'private',
            auth_version: 5,
          },
        ],
        total: 1,
        page: 1,
        pageSize: 10,
      }),
    },
    {
      list: async () => ({
        items: [
          {
            id: 'l',
            short_code: 'abc',
            original_url: 'https://example.com/',
            click_count: '9007199254740993',
            is_active: true,
            created_at: '2026-10-15',
            user_id: 'private-id',
          },
        ],
        total: 1,
        page: 1,
        pageSize: 10,
      }),
    },
  );
  const identity = { id: 'u', role: 'admin' };
  assert.deepEqual(await service.listUsers(identity), {
    items: [
      { id: 'u', email: 'a@example.com', role: 'admin', isActive: true, isPrimaryAdmin: true },
    ],
    total: 1,
    page: 1,
    pageSize: 10,
  });
  assert.deepEqual(await service.listLinks(identity), {
    items: [
      {
        id: 'l',
        shortCode: 'abc',
        originalUrl: 'https://example.com/',
        clickCount: '9007199254740993',
        createdAt: '2026-10-15',
        isActive: true,
      },
    ],
    total: 1,
    page: 1,
    pageSize: 10,
  });
});

test('user creation never accepts elevated privileges and sanitizes duplicate database errors', async () => {
  let inserted;
  const repository = createUsersRepository({
    from: (table) => {
      assert.equal(table, 'users');
      return {
        insert(value) {
          inserted = value;
          return {
            select: () => ({
              single: () => ({
                abortSignal: async () => ({
                  error: { code: '23505', message: 'private database details' },
                }),
              }),
            }),
          };
        },
      };
    },
  });
  await assert.rejects(
    repository.create({
      email: 'a@example.com',
      passwordHash: 'hash',
      role: 'admin',
      is_primary_admin: true,
    }),
    { status: 409, code: 'EMAIL_EXISTS', message: 'This email is already registered' },
  );
  assert.deepEqual(inserted, {
    email: 'a@example.com',
    password_hash: 'hash',
    role: 'user',
    is_active: true,
    is_primary_admin: false,
  });
});
