import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword } from '../src/security/password.js';
import { normalizeAdminEmail } from '../src/modules/setup/setup.dto.js';

test('password hash verifies only the exact password and uses a random salt', async () => {
 const password = 'Example-password-2026';
 const first = await hashPassword(password);
 const second = await hashPassword(password);
 assert.notEqual(first, second);
 assert.ok(first.length <= 255);
 assert.equal(await verifyPassword(password, first), true);
 assert.equal(await verifyPassword('wrong-password', first), false);
 assert.equal(await verifyPassword(password.toUpperCase(), first), false);
});

test('malformed hashes and unreasonable passwords are rejected', async () => {
 await assert.rejects(hashPassword('short'), { code: 'INVALID_PASSWORD' });
 await assert.rejects(hashPassword('a'.repeat(1025)), { code: 'INVALID_PASSWORD' });
 assert.equal(await verifyPassword('password', 'scrypt$999999999$8$1$bad$hash'), false);
 assert.equal(await verifyPassword('password', 'not-a-hash'), false);
});

test('bootstrap normalizes email but preserves the supplied domain', () => {
 assert.equal(normalizeAdminEmail(' Admin@ShortURL.loca '), 'admin@shorturl.loca');
 assert.throws(() => normalizeAdminEmail('not-an-email'), { code: 'INVALID_ADMIN_EMAIL' });
 assert.throws(() => normalizeAdminEmail('a b@example.com'), { code: 'INVALID_ADMIN_EMAIL' });
});
