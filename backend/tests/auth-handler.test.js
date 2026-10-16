import test from 'node:test';
import assert from 'node:assert/strict';
import { authService } from '../src/modules/auth/auth.service.js';
import * as handler from '../src/modules/auth/auth.handler.js';
function response() {
  return {
    locals: { input: { email: 'user@example.com', password: 'test-password' } },
    headers: {},
    cookie() {
      assert.fail('No authentication cookies');
    },
    set(name, value) {
      this.headers[name] = value;
      return this;
    },
    status(value) {
      this.statusCode = value;
      return this;
    },
    json(value) {
      this.body = value;
      return this;
    },
    sendStatus(value) {
      this.statusCode = value;
      return this;
    },
  };
}
test('login returns only safe account, short-lived access token and expiry without cookies', async (t) => {
  const session = {
    user: { id: 'u', email: 'user@example.com', role: 'admin' },
    accessToken: 'memory-access',
    expiresAt: 2000000000,
    unusedSecret: 'hidden',
  };
  t.mock.method(authService, 'login', async () => session);
  const res = response();
  await handler.login({}, res);
  assert.deepEqual(res.body, {
    user: session.user,
    accessToken: session.accessToken,
    expiresAt: session.expiresAt,
  });
  assert.equal(res.headers['Cache-Control'], 'no-store');
  assert.equal(res.statusCode, 200);
});
test('logout revokes the authenticated bearer session', async (t) => {
  t.mock.method(authService, 'logout', async (token) => assert.equal(token, 'bearer-token'));
  const res = response();
  await handler.logout({ accessToken: 'bearer-token' }, res);
  assert.equal(res.statusCode, 204);
});
test('session outage never claims logout succeeded', async (t) => {
  t.mock.method(authService, 'logout', async () => {
    throw Object.assign(new Error('Unavailable'), { status: 503 });
  });
  const res = response();
  await assert.rejects(handler.logout({ accessToken: 'token' }, res), { status: 503 });
  assert.equal(res.statusCode, undefined);
});
