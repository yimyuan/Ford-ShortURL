import { getRedis } from '../../infrastructure/redis.js';
import { withRedisDeadline } from '../../infrastructure/deadline.js';
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export function createLinksCache(connect = getRedis, timeout = 150) {
  return {
    async get(code) {
      try {
        const id = await withRedisDeadline(
          connect,
          (client) => client.get(`shorturl:link:${code}`),
          timeout,
        );
        return uuid.test(id || '') ? id : null;
      } catch {
        return null;
      }
    },
    async set(code, id) {
      try {
        await withRedisDeadline(
          connect,
          (client) => client.set(`shorturl:link:${code}`, id, { EX: 300 }),
          timeout,
        );
      } catch {
        /* Database remains authoritative. */
      }
    },
  };
}
export const linksCache = createLinksCache();
