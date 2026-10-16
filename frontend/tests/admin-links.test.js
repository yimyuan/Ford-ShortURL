import test from 'node:test';
import assert from 'node:assert/strict';
import {
  listLinkOwners,
  listOwnerLinks,
  getAdminLink,
  manageAdminLink,
  getAdminLinkQr,
} from '../src/features/admin/api.js';
import { auditDescription } from '../src/features/admin/audit.js';
test('owner navigation and link actions use the admin owner scope, ten-row contract and explicit confirmation', async (t) => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (path, options) => {
    calls.push({ path, options });
    if (path.endsWith('/qr'))
      return new Response('<svg/>', { headers: { 'Content-Type': 'image/svg+xml' } });
    return new Response(
      JSON.stringify({ items: [], page: 1, pageSize: 10, total: 0, owner: { id: 'owner' } }),
      { status: 200 },
    );
  });
  await listLinkOwners({ page: 1, query: 'a+test@example.com', filter: 'active' });
  await listOwnerLinks('owner', { page: 1, query: 'abc', filter: 'owner_suspended' });
  await getAdminLink('owner', 'link');
  const body = {
    action: 'link_delete',
    version: '4',
    confirmed: true,
    codeConfirmation: 'Ab123456',
  };
  await manageAdminLink('owner', 'link', body);
  assert.equal(await (await getAdminLinkQr('owner', 'link')).text(), '<svg/>');
  assert.ok(calls[0].path.startsWith('/api/admin/link-owners?'));
  assert.equal(
    new URL(calls[1].path, 'https://example.com').searchParams.get('filter'),
    'owner_suspended',
  );
  assert.equal(calls[2].path, '/api/admin/link-owners/owner/links/link');
  assert.equal(calls[3].options.method, 'PATCH');
  assert.deepEqual(JSON.parse(calls[3].options.body), body);
  assert.equal(calls[4].path, '/api/admin/link-owners/owner/links/link/qr');
  assert.ok(calls.every((call) => call.options.credentials === 'omit'));
});
test('link history identifies the exact link whose status changed or was deleted', () => {
  assert.equal(
    auditDescription({ action: 'link_delete', details: { shortCode: 'Ab123456' } }),
    'ลบลิงก์ถาวร · Ab123456',
  );
  assert.equal(
    auditDescription({ action: 'link_disable', details: { shortCode: 'Ab123456' } }),
    'ปิดใช้งานลิงก์ · Ab123456',
  );
});
