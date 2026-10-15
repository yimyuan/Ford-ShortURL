import { randomBytes } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { getSupabase } from '../src/infrastructure/supabase.js';
import { normalizeAdminEmail } from '../src/modules/setup/setup.dto.js';
import { createSetupRepository } from '../src/modules/setup/setup.repository.js';
import { createSetupService } from '../src/modules/setup/setup.service.js';

try {
 const service = createSetupService(createSetupRepository(await getSupabase()));
 if (await service.getPrimaryAdmin()) {
  console.log('มี Admin หลักแล้ว ไม่สร้างซ้ำและไม่เปลี่ยนรหัสผ่าน');
 } else {
  const email = normalizeAdminEmail(process.env.BOOTSTRAP_ADMIN_EMAIL || 'admin@shorturl.local');
  const suppliedPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  const password = suppliedPassword || randomBytes(24).toString('base64url');
  if (!suppliedPassword) {
   // Save generated credentials before the request, so a network timeout cannot lose them.
   // Exclusive creation prevents overwriting credentials from a previous uncertain attempt.
   const path = fileURLToPath(new URL('../.admin-bootstrap-credentials.json', import.meta.url));
   await writeFile(path, JSON.stringify({ email, password }, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
   console.log('บันทึกรหัสผ่านที่สุ่มใน backend/.admin-bootstrap-credentials.json แล้ว เก็บไฟล์นี้ไว้หากเครือข่ายขัดข้อง');
  }
  await service.createPrimaryAdmin({ email, password });
  console.log('สร้าง Admin หลักสำเร็จ: ' + email);
 }
} catch (error) {
 console.error('ตั้งค่า Admin ไม่สำเร็จ (' + (error.code || 'ADMIN_SETUP_FAILED') + ')');
 if (error.code === 'EEXIST') console.error('มีไฟล์ข้อมูลตั้งค่าเดิมอยู่แล้ว ใช้อีเมล/รหัสผ่านในไฟล์นั้นผ่าน BOOTSTRAP_ADMIN_EMAIL / BOOTSTRAP_ADMIN_PASSWORD เพื่อลองซ้ำ ห้ามสุ่มใหม่เมื่อไม่แน่ใจว่าครั้งก่อนสำเร็จหรือไม่');
 process.exitCode = 1;
}
