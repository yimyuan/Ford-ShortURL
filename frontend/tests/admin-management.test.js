import test from 'node:test';
import assert from 'node:assert/strict';
import { manageUser, getUserImpact, listAdminHistory } from '../src/features/admin/api.js';
import { auditDescription } from '../src/features/admin/audit.js';
test('management API sends explicit confirmation and conflict revision; history filters are encoded', async () => {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (path, options) => {
    calls.push({ path, options });
    return new Response(JSON.stringify({ auditId: 'id', items: [], total: 0, page: 2, pageSize: 10 }), { status: 200 });
  };
  try {
    const body = {
      action: 'delete_user',
      confirmed: true,
      version: '4',
      emailConfirmation: 'user@example.com',
      linkCount: 3,
    };
    await getUserImpact('user-id');
    await manageUser('user-id', body);
    await listAdminHistory({
      query: 'user+test@example.com',
      action: 'delete_user',
      from: '2026-10-01',
      to: '2026-10-15',
      page: 2,
    });
    assert.equal(calls[0].path, '/api/admin/users/user-id/impact');
    assert.equal(calls[1].options.method, 'PATCH');
    assert.deepEqual(JSON.parse(calls[1].options.body), body);
    assert.equal(calls[1].options.credentials, 'include');
    const params = new URL(calls[2].path, 'https://example.com').searchParams;
    assert.equal(params.get('query'), 'user+test@example.com');
    assert.equal(params.get('page'), '2');
  } finally {
    globalThis.fetch = original;
  }
});
test('audit descriptions include role direction and affected links without a separate before/after column', () => {
  assert.equal(
    auditDescription({ action: 'change_role', details: { from: 'user', to: 'admin' } }),
    'เปลี่ยนสิทธิ์ User → Admin',
  );
  assert.equal(
    auditDescription({ action: 'delete_user', details: { deletedLinks: 5 } }),
    'ลบบัญชีถาวร พร้อมลิงก์ 5 รายการ',
  );
  assert.equal(auditDescription({ action: 'reset_password', details: {} }), 'รีเซ็ตรหัสผ่าน');
});
