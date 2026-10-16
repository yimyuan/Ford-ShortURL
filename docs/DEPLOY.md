# Deploy ฟรี: Netlify + Render

ยังต้องตั้งค่าบน Hosting และทดสอบ URL จริง เอกสารนี้ไม่แปลว่ามีการ Deploy แล้ว

## 1. ตรวจ CI ก่อน

Push โค้ดแล้วดู GitHub Actions → CI ต้องผ่านทั้ง `test-build` และ `database-redis`

- Node 24, npm ci, Backend/Frontend/CLI Tests และ Frontend Build
- Integration ใช้ PostgreSQL 17 และ Redis 7.4 ชั่วคราวบน Runner ไม่ใช้ Secrets หรือฐานข้อมูลจริง
- ทดสอบ Concurrent Creation, Duplicate Custom Code, Click Counter และ Refresh Replay
- Integration รัน Migration 001–019 ยกเว้น 010 เพราะ PostgreSQL image ปกติไม่มี pg_cron; 018–019 รองรับการไม่มี Cron และลบระบบล้างประวัติที่ไม่ใช้งาน
- Tests ปฏิเสธ Database ที่ไม่ใช่ localhost/shorturl_test และไม่ล้าง schema เดิมให้เอง

ในเครื่องที่มี disposable services และ psql ใช้ `TEST_DATABASE_URL` / `TEST_REDIS_URL` แล้วรัน `node backend/scripts/test-integration.js`

## 2. Migration 017 ก่อนใช้ Backend รุ่นนี้

สำรองข้อมูล แล้วรัน `backend/sql/017_link_creation_safety.sql` หนึ่งครั้งใน SQL Editor หลัง 016 ก่อนเปิด Backend รุ่นใหม่ ระหว่างอัปเดตควรหยุดการสร้าง/ลบลิงก์ชั่วคราว

- ชื่อที่ใช้อยู่และชื่อที่ยังพบใน Audit การลบจะถูกสงวน ห้ามนำกลับมาใช้ใหม่
- ชื่อที่ลบไปก่อนหน้านี้และไม่มี Audit เหลืออยู่ ไม่สามารถกู้รายการสงวนย้อนหลังได้จากข้อมูลปัจจุบัน
- Request ID เดิมของ User เดิมและ Payload เดิมได้ลิงก์เดิม; เปลี่ยน Payload ได้ 409
- ลบลิงก์แล้ว Replay Request เดิมได้ 409 ไม่สร้างกลับมาใหม่
- เก็บเพียง Short Code และ Request Fingerprint/Link Reference ไม่มีรูป QR หรือสำเนา URL ในตารางใหม่
- การสร้างตรวจสถานะบัญชีซ้ำภายใน Transaction และล็อก User ก่อนเขียน

Migration นี้ยังไม่ได้ถูกเรียกอัตโนมัติจาก Backend หรือ CI บนฐานข้อมูลจริง

รัน `018_keep_admin_audit_history.sql` เพื่อยกเลิก Cron ลบ Audit Log และปิดฟังก์ชัน prune เดิม โดยไม่มีการลบประวัติที่มีอยู่ ไฟล์นี้ไม่ขึ้นกับ 017 จึงใช้หยุดการลบอัตโนมัติในฐานข้อมูลเดิมที่มี 010 ได้ทันที

ตามด้วย `019_remove_unused_audit_cleanup.sql` เพื่อลบฟังก์ชัน prune ที่ไม่ใช้แล้วออกจริง โดยไม่ลบตารางหรือข้อมูล Audit เก็บ Migration เก่าไว้เป็นประวัติการเปลี่ยน Schema ไม่รันไฟล์เก่าย้อนหลัง

## 3. Render: Web Service Free

เชื่อม Repository และเลือก Branch ที่จะใช้ โดยให้ Root Directory เป็น Root ของ Repository

| การตั้งค่า | ค่า |
| --- | --- |
| Build Command | `npm ci --omit=dev` |
| Start Command | `npm start` |
| Health Check Path | `/api/health` |
| NODE_VERSION | `24` |
| NODE_ENV | `production` |
| HOST | `0.0.0.0` |
| APP_ORIGIN | `https://ชื่อเว็บ.netlify.app` |
| PUBLIC_BASE_URL | Origin เดียวกับ APP_ORIGIN |
| PROXY_MODE | `netlify` |
| PROXY_SECRET | ค่าสุ่มลับอย่างน้อย 32 bytes ให้เหมือน Netlify |

เพิ่ม SUPABASE_URL, SUPABASE_SECRET_KEY, REDIS_URL ของ Upstash แบบ `rediss://`, JWT_SECRET และ CSRF_SECRET จากการตั้งค่าของคุณ ไม่ใส่ BOOTSTRAP_ADMIN_PASSWORD บน Hosting และไม่ Commit Secrets

Free Service พักหลังไม่มี Traffic; Cold Start อาจเกิน Timeout ของ Proxy ต้องรอให้ Backend พร้อมแล้วลองใหม่ก่อนสาธิต ไม่เปิด Render PostgreSQL เพิ่ม ใช้ Supabase เดิม

## 4. Netlify: Frontend และ Edge Proxy

Import Repository โดยใช้ `netlify.toml` ที่ Root: Build `npm run build`, Publish `frontend/dist`, Node 24

ตั้ง Environment Variables ในหน้า Netlify UI ให้รวม Scope **Functions** เพื่อให้ Edge Function อ่านได้ใน Runtime (ห้ามใส่ Secret ใน netlify.toml):

| ตัวแปร | ค่า |
| --- | --- |
| BACKEND_ORIGIN | `https://ชื่อหลังบ้าน.onrender.com` ไม่มี path |
| PROXY_SECRET | ค่าสุ่มเดียวกับ Render ห้ามใช้ VITE_ prefix |

สร้าง Secret ด้วย `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"` แล้วใส่ในหน้า Environment ของทั้งสองบริการ เก็บค่าลับนี้ไว้ส่วนตัว

`netlify/edge-functions/backend-proxy.js` จัดการ `/api/*` และ `/r/*` ก่อน SPA fallback:

- Browser เรียกโดเมน Netlify เท่านั้น จึงใช้ HttpOnly/Secure/SameSite Strict Cookies เดิมได้
- Edge อ่าน Client IP จาก `context.ip` และเขียน Header ใหม่เอง พร้อม Secret ฝั่ง Server
- Backend ไม่เชื่อ X-Forwarded-For จากผู้เรียก และปฏิเสธ API/Redirect ที่ไม่ผ่าน Proxy เมื่อ PROXY_MODE=netlify
- ไม่เปิด trust proxy แบบครอบจักรวาล; Rate Limit ใช้ Client IP ที่ผ่านการตรวจ Secret
- Forward Cookie, Origin, Method และ Body; คืน 302 Location ให้ Browser โดยไม่ Follow ปลายทางใน Edge
- Cache-Control=no-store; การติดต่อ Backend มี Deadline 10 วินาที
- `/api/health` เปิดให้ Render Probe ได้โดยไม่ต้องมี Proxy Secret

Edge Function ใช้โควตาของ Netlify ด้วย ตรวจ Usage ของ Free Plan และไม่เปิดส่วนเสริมเสียเงินโดยไม่จำเป็น

## 5. ทดสอบ URL จริง

1. เปิดหน้าแรกและเปิด `/my-links`, `/dashboard`, `/admin` โดยตรง
2. Login/Refresh/Logout และตรวจ Cookie ว่า HttpOnly, Secure, SameSite Strict
3. ผู้ใช้สองเครือข่ายไม่ควรถูกนับ IP เดียวกัน; เรียก Render API โดยตรงต้องได้ 403
4. สร้าง Random/Custom Link; Retry Request เดิมต้องได้ Link ID เดิม
5. เปิดลิงก์สั้นและสแกน QR ด้วยมือถือ ตรวจยอด GET/HEAD ตามนโยบาย
6. ปิด/ลบลิงก์ ตรวจว่าเปิดไม่ได้และชื่อเดิมจองใหม่ไม่ได้
7. ทดสอบ Redis Failure และ Account Revocation ในระบบทดสอบแยก

ยังต้องยืนยัน Cookie forwarding, Client IP และ Edge behavior บน Netlify จริง เพราะ Unit Tests จำลอง HTTP ไม่ใช่ CDN จริง

## 6. CD หลัง CI ผ่าน

CI Workflow ที่เพิ่มทำหน้าที่ตรวจอย่างเดียว ยังไม่เรียก Deploy Hook

ช่วงแรกปิด Automatic Deploy ของ Render และ Continuous Deployment ของ Netlify แล้ว Deploy ด้วยตนเองจาก Commit ที่ CI ผ่านทั้งสอง Job อย่าเปิด Auto Deploy ทุก Push แล้วถือว่ารอ CI

ถ้าจะเพิ่ม CD ภายหลัง ให้ Job Deploy มี `needs: [test-build, database-redis]`, จำกัด Branch/Production Environment และเก็บ Deploy Hook เป็น GitHub Secrets ก่อนเปิดใช้จริง

อ้างอิง: [Netlify Edge Functions](https://docs.netlify.com/build/edge-functions/overview/), [Render Free](https://render.com/docs/free)
