import { getRedis } from '../../infrastructure/redis.js';
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export function createLinksCache(connect = getRedis) {
 return {
  async get(code) {
   try { const id = await (await connect()).get(`shorturl:link:${code}`); return uuid.test(id || '') ? id : null; }
   catch { return null; }
  },
  async set(code, id) {
   try { await (await connect()).set(`shorturl:link:${code}`, id, { EX: 300 }); } catch { /* Database remains authoritative. */ }
  }
 };
}
export const linksCache = createLinksCache();
