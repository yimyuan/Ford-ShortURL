import { getRedis } from '../../infrastructure/redis.js';
import { AppError } from '../../errors/app-error.js';
import { withRedisDeadline } from '../../infrastructure/deadline.js';

// One Redis key is the refresh-token family. Replay revokes that entire login.
const rotateScript = `
 local raw = redis.call('GET', KEYS[1])
 if not raw then return {0} end
 local session = cjson.decode(raw)
 if session.refreshHash ~= ARGV[1] then redis.call('DEL', KEYS[1]); return {-1} end
 if tonumber(session.expiresAt) <= tonumber(ARGV[3]) then redis.call('DEL', KEYS[1]); return {0} end
 session.refreshHash = ARGV[2]
 local updated = cjson.encode(session)
 redis.call('SET', KEYS[1], updated, 'EXAT', session.expiresAt)
 return {1, updated}
`;
export function createAuthRepository(connect = getRedis, timeout = 2500) {
  const key = (id) => `shorturl:session:${id}`;
  async function run(operation) {
    try {
      return await withRedisDeadline(connect, operation, timeout);
    } catch {
      throw new AppError(503, 'SESSION_UNAVAILABLE', 'Login session storage is unavailable');
    }
  }
  return {
    createFamily: (id, session) =>
      run(async (client) => {
        const result = await client.set(key(id), JSON.stringify(session), {
          EXAT: session.expiresAt,
          NX: true,
        });
        if (result !== 'OK') throw new Error('Session collision');
      }),
    findFamily: (id) =>
      run(async (client) => {
        const raw = await client.get(key(id));
        return raw ? JSON.parse(raw) : null;
      }),
    rotateRefreshToken: (id, oldHash, nextHash, now) =>
      run(async (client) => {
        const result = await client.eval(rotateScript, {
          keys: [key(id)],
          arguments: [oldHash, nextHash, String(now)],
        });
        return Number(result[0]) === 1 ? JSON.parse(result[1]) : null;
      }),
    revokeFamily: (id) => run((client) => client.del(key(id))),
  };
}
export const authRepository = createAuthRepository();
