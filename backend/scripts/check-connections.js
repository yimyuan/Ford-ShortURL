import { config } from '../src/config.js';
import { checkSupabaseConnection } from '../src/infrastructure/supabase.js';
import { getRedis, closeRedis } from '../src/infrastructure/redis.js';
async function check(name, configured, action) {
 if (!configured) { console.error(name + ': not configured'); process.exitCode = 1; return; }
 try { await action(); console.log(name + ': connected'); }
 catch (error) {
  console.error(name + ': failed (' + (error.code || 'CONNECTION_ERROR') + ')');
  const hints = {
   SUPABASE_SDK_MISSING: 'รัน npm install ที่โฟลเดอร์หลักเพื่อติดตั้ง Supabase SDK',
   SUPABASE_URL_INVALID: 'SUPABASE_URL ต้องเป็น URL โปรเจกต์แบบ HTTPS ไม่ใช่ PostgreSQL URI',
   SUPABASE_SECRET_KEY_INVALID: 'ใช้ Secret API key หรือ legacy service_role สำหรับหลังบ้าน ไม่ใช่ anon/publishable key',
   PGRST106: 'เปิด Data API และเพิ่ม app ใน Exposed schemas ของ Supabase',
   PGRST205: 'สร้างตารางด้วย backend/sql/001_initial_schema.sql แล้วรัน 002_supabase_data_api.sql',
   '42P01': 'ไม่พบตาราง ตรวจ SQL สำหรับสร้าง app.users และ app.links',
   '42501': 'ตรวจสิทธิ์ service_role โดยรัน backend/sql/002_supabase_data_api.sql',
   HTTP_401: 'ตรวจ Secret API key ว่าถูกต้องและเป็นของโปรเจกต์นี้',
   HTTP_403: 'ตรวจสิทธิ์ Data API และ Secret API key',
   SUPABASE_REQUEST_FAILED: 'ติดต่อ Supabase HTTPS ไม่สำเร็จ ตรวจ DNS เครือข่าย และการเปิด Data API'
  };
  if (hints[error.code]) console.error(hints[error.code]);
  process.exitCode = 1;
 }
}
try {
 await Promise.all([
  check('Supabase HTTPS (PostgreSQL)', config.supabaseUrl && config.supabaseSecretKey, () => checkSupabaseConnection()),
  check('Redis', config.redisUrl, async () => (await getRedis()).ping())
 ]);
} finally { await closeRedis(); }
