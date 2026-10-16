import { getRedis } from '../../infrastructure/redis.js';
import { AppError } from '../../errors/app-error.js';
import { withRedisDeadline } from '../../infrastructure/deadline.js';

// Short-lived server session allows immediate logout and current-account checks.
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
    createSession: (id, session) =>
      run(async (client) => {
        const result = await client.set(key(id), JSON.stringify(session), {
          EXAT: session.expiresAt,
          NX: true,
        });
        if (result !== 'OK') throw new Error('Session collision');
      }),
    findSession: (id) =>
      run(async (client) => {
        const raw = await client.get(key(id));
        return raw ? JSON.parse(raw) : null;
      }),
    revokeSession: (id) => run((client) => client.del(key(id))),
  };
}
export const authRepository = createAuthRepository();
