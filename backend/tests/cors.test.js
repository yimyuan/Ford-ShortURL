import test from 'node:test';
import assert from 'node:assert/strict';
import { createCors } from '../src/middleware/cors.js';
import { createAuthenticate } from '../src/middleware/authenticate.js';
import express from 'express';
const origin = 'https://yimyuan.github.io';
const cors = createCors({ appOrigin: origin, production: true });
function run(headers, method = 'OPTIONS') {
  const response = {
    headers: {},
    vary() {},
    set(name, value) {
      this.headers[name] = value;
      return this;
    },
    sendStatus(value) {
      this.status = value;
    },
  };
  let error;
  cors({ method, get: (name) => headers[name] }, response, (value) => {
    error = value;
  });
  return { response, error };
}
test('Pages preflight permits only configured origin, methods and bearer/idempotency headers', () => {
  const ok = run({
    origin,
    'access-control-request-method': 'POST',
    'access-control-request-headers': 'authorization, content-type, idempotency-key',
  });
  assert.equal(ok.response.status, 204);
  assert.equal(ok.response.headers['Access-Control-Allow-Origin'], origin);
  assert.equal(ok.response.headers['Access-Control-Allow-Credentials'], undefined);
  assert.equal(run({ origin: 'https://evil.example' }).error.status, 403);
  assert.equal(run({ origin, 'access-control-request-method': 'DELETE' }).error.status, 403);
  assert.equal(
    run({
      origin,
      'access-control-request-method': 'POST',
      'access-control-request-headers': 'x-shorturl-client-ip',
    }).error.status,
    403,
  );
});
test('cookie alone never authenticates; bearer identity is attached for logout', async () => {
  const auth = createAuthenticate(async (token) => {
    assert.equal(token, 'access');
    return { id: 'u', role: 'user' };
  });
  let error;
  await auth({ cookies: { shorturl_access: 'access' }, get: () => '' }, {}, (value) => {
    error = value;
  });
  assert.equal(error.status, 401);
  const req = { get: () => 'Bearer access' };
  await auth(req, {}, (value) => assert.equal(value, undefined));
  assert.equal(req.accessToken, 'access');
});

test('one trusted Render hop uses the nearest forwarded client, not an attacker-supplied prefix', () => {
  const app = express();
  app.set('trust proxy', 1);
  function client(ip) {
    const req = Object.create(app.request);
    req.headers = {'x-forwarded-for':`203.0.113.200, ${ip}`, 'x-shorturl-client-ip':'203.0.113.201'};
    req.socket = {remoteAddress:'10.0.0.1'};
    return req;
  }
  assert.equal(client('198.51.100.1').ip,'198.51.100.1');
  assert.equal(client('198.51.100.2').ip,'198.51.100.2');
  app.set('trust proxy',0);
  assert.equal(client('198.51.100.1').ip,'10.0.0.1');
});
