import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { app } from '../src/app.js';

test('route refactor preserves health, JSON errors and private setup boundary', async t => {
 const server = app.listen(0, '127.0.0.1');
 await once(server, 'listening');
 const base = `http://127.0.0.1:${server.address().port}`;
 try {
  const health = await fetch(base + '/api/health');
  assert.equal(health.status, 200);
  assert.equal(health.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await health.json(), { status: 'ok', service: 'short-url-api' });
  const malformed = await fetch(base + '/api/links', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{' });
  assert.equal(malformed.status, 400);
  assert.deepEqual(await malformed.json(), { error: { code: 'INVALID_REQUEST', message: 'Invalid request body' } });
  const setup = await fetch(base + '/api/admin/bootstrap', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
  assert.equal(setup.status, 404);
  assert.deepEqual(await setup.json(), { error: { code: 'NOT_FOUND', message: 'Route not found' } });
 } catch (error) {
  if (error.cause?.code === 'EACCES') t.skip('This environment blocks localhost connections');
  else throw error;
 } finally {
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
 }
});
