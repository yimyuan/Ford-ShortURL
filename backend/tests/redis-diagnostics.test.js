import test from 'node:test';
import assert from 'node:assert/strict';
import { logRedisFailure } from '../src/infrastructure/redis-diagnostics.js';

test('Redis diagnostics classify failures without disclosing arbitrary error data', () => {
  const secret = 'rediss://default:private-password@private-host:6379';
  const cases = [
    [{ code: 'ENOTFOUND', message: secret }, 'ENOTFOUND'],
    [new Error(`WRONGPASS ${secret}`), 'AUTHENTICATION'],
    [new Error(`NOPERM ${secret}`), 'PERMISSION'],
    [new Error(`quota exceeded ${secret}`), 'QUOTA'],
    [new Error(`Connection timeout ${secret}`), 'TIMEOUT'],
    [new Error(`Invalid URL ${secret}`), 'INVALID_URL'],
    [{ cause: { code: 'ECONNRESET', message: secret } }, 'ECONNRESET'],
    [{ code: secret, message: secret, stack: secret }, 'UNKNOWN'],
  ];
  for (const [error, reason] of cases) {
    const output = [];
    logRedisFailure('auth-rate-limit', error, (line) => output.push(line));
    assert.deepEqual(output, [`[Redis] operation=auth-rate-limit reason=${reason}`]);
    assert.ok(!output.join('').includes(secret));
  }
  logRedisFailure(secret, new Error(secret), (line) => {
    assert.equal(line, '[Redis] operation=unknown reason=UNKNOWN');
  });
});
