import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createAdminLinksService } from '../src/modules/admin/admin-links.service.js';
import { createAdminLinksRepository } from '../src/modules/admin/admin-links.repository.js';
import {
  parseOwnerList,
  parseOwnerLinks,
  parseLinkAction,
} from '../src/modules/admin/admin-links.dto.js';
import { parseAuditQuery } from '../src/modules/admin/admin.dto.js';
const root = { id: randomUUID(), role: 'admin', isPrimaryAdmin: true };
const owner = {
  id: randomUUID(),
  email: 'owner@example.com',
  role: 'user',
  is_active: true,
  is_primary_admin: false,
  password_hash: 'private',
};
const row = {
  id: randomUUID(),
  user_id: owner.id,
  short_code: 'Ab123456',
  original_url: 'https://example.com/',
  click_count: '9007199254740993',
  management_version: '2',
  is_active: true,
  created_at: '2026-10-16T00:00:00Z',
  last_clicked_at: null,
};
const settings = { publicBaseUrl: 'https://short.example', production: true };
test('owner and link APIs reject normal users before privileged database access', async () => {
  const denied = () => assert.fail('Privileged query must not run');
  const service = createAdminLinksService(
    { owners: denied, list: denied, detail: denied, manage: denied },
    { findById: denied },
    settings,
  );
  for (const call of [
    () => service.owners({ role: 'user' }, {}),
    () => service.list(null, owner.id, {}),
    () => service.detail({ role: 'user' }, owner.id, row.id),
    () => service.manage({ role: 'user' }, owner.id, row.id, {}),
  ])
    await assert.rejects(call, { status: 403 });
});
test('owner-scoped link responses expose readable status and exact counts without owner credentials', async () => {
  let currentOwner = { ...owner };
  let currentLink = { ...row };
  const service = createAdminLinksService(
    {
      detail: async (ownerId, id) => {
        assert.equal(ownerId, owner.id);
        assert.equal(id, row.id);
        return currentLink;
      },
      list: async () => ({
        owner: { id: owner.id, isActive: false },
        items: [currentLink],
        total: 1,
        page: 1,
        pageSize: 10,
      }),
    },
    { findById: async () => currentOwner },
    settings,
  );
  let result = await service.detail(root, owner.id, row.id);
  assert.equal(result.link.shortUrl, 'https://short.example/r/Ab123456');
  assert.equal(result.link.clickCount, '9007199254740993');
  assert.equal(result.link.status, 'active');
  assert.equal(result.link.version, '2');
  assert.equal(result.owner.password_hash, undefined);
  assert.equal(result.link.user_id, undefined);
  currentOwner.is_active = false;
  result = await service.detail(root, owner.id, row.id);
  assert.equal(result.link.status, 'owner_suspended');
  currentLink.is_active = false;
  result = await service.detail(root, owner.id, row.id);
  assert.equal(result.link.status, 'inactive');
  currentLink.is_active = true;
  result = await service.list(root, owner.id, {});
  assert.equal(result.items[0].status, 'owner_suspended');
  currentOwner.role = 'admin';
  result = await service.detail({ id: randomUUID(), role: 'admin' }, owner.id, row.id);
  assert.equal(result.canManage, false);
  currentLink = null;
  await assert.rejects(service.detail(root, owner.id, row.id), {
    status: 404,
    code: 'LINK_NOT_FOUND',
  });
});
test('link management validates explicit confirmation, version, ownership path and deletion code', async () => {
  let saved;
  const service = createAdminLinksService(
    {
      manage: async (args) => {
        saved = args;
        return { auditId: 'audit' };
      },
    },
    {},
    settings,
  );
  const input = {
    action: 'link_delete',
    version: '2',
    confirmed: true,
    codeConfirmation: 'Ab123456',
  };
  for (const invalid of [
    { ...input, confirmed: false },
    { ...input, version: 2 },
    { ...input, codeConfirmation: 'ba' },
    { ...input, userId: randomUUID() },
    { ...input, action: 'delete_user' },
  ])
    await assert.rejects(service.manage(root, owner.id, row.id, invalid), { status: 422 });
  assert.equal(saved, undefined);
  await service.manage(root, owner.id, row.id, input);
  assert.deepEqual(saved, {
    p_actor: root.id,
    p_owner: owner.id,
    p_link: row.id,
    p_action: 'link_delete',
    p_version: '2',
    p_code_confirmation: 'Ab123456',
  });
  assert.equal(
    parseLinkAction({ confirmed: true, version: '0', action: 'link_disable' }).action,
    'link_disable',
  );
});

test('admin deletion accepts every supported custom-name shape and preserves exact case for SQL confirmation', async () => {
  const calls = [];
  const service = createAdminLinksService(
    {
      manage: async (args) => {
        calls.push(args);
        return { auditId: 'audit' };
      },
    },
    {},
    settings,
  );
  for (const code of ['abc', 'Summer-sale', 'A'.repeat(40), 'Ab123456']) {
    await service.manage(root, owner.id, row.id, {
      action: 'link_delete',
      confirmed: true,
      version: '2',
      codeConfirmation: code,
    });
    assert.equal(calls.at(-1).p_code_confirmation, code);
  }
  assert.equal(calls.length, 4);
  for (const code of [
    'ab',
    'A'.repeat(41),
    '-sale',
    'sale-',
    'summer sale',
    'Summer-sale ',
    null,
  ]) {
    await assert.rejects(
      service.manage(root, owner.id, row.id, {
        action: 'link_delete',
        confirmed: true,
        version: '2',
        codeConfirmation: code,
      }),
      { status: 422 },
    );
  }
  assert.equal(calls.length, 4);
});
test('owner queries allow only supported filters, ten rows, bounded search and audit link actions', () => {
  assert.equal(parseOwnerList({ page: '2', filter: 'inactive' }).pageSize, 10);
  assert.equal(parseOwnerLinks({ page: '3', filter: 'owner_suspended' }).filter, 'owner_suspended');
  for (const input of [{ filter: 'admin' }, { query: 'a'.repeat(255) }, { pageSize: '100' }])
    assert.throws(() => parseOwnerList(input), { status: 422 });
  assert.throws(() => parseOwnerLinks({ filter: 'user' }), { status: 422 });
  assert.equal(parseAuditQuery({ action: 'link_delete' }).action, 'link_delete');
});
test('detail repository requires both owner and link ID, and RPC owner lists receive server pagination', async () => {
  const calls = [];
  const query = {
    select() {
      return this;
    },
    eq(...args) {
      calls.push(args);
      return this;
    },
    maybeSingle() {
      return this;
    },
    abortSignal: async () => ({ data: row, error: null }),
  };
  const repository = createAdminLinksRepository({
    from: () => query,
    rpc: (name, args) => {
      calls.push([name, args]);
      return query;
    },
  });
  await repository.detail(owner.id, row.id);
  assert.deepEqual(calls, [
    ['user_id', owner.id],
    ['id', row.id],
  ]);
  calls.length = 0;
  await repository.owners(root.id, { page: 2, query: 'owner@example.com', filter: 'all' });
  assert.deepEqual(calls, [
    [
      'admin_link_owners',
      { p_actor: root.id, p_page: 2, p_query: 'owner@example.com', p_filter: 'all' },
    ],
  ]);
});
test('admin QR encodes the selected owner link, not the destination URL', async () => {
  let encoded;
  const service = createAdminLinksService(
    { detail: async () => row },
    { findById: async () => owner },
    settings,
    async (url) => {
      encoded = url;
      return '<svg/>';
    },
  );
  assert.equal(await service.qr(root, owner.id, row.id), '<svg/>');
  assert.equal(encoded, 'https://short.example/r/Ab123456');
});
