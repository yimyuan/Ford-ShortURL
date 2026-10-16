# Deploy ฟรี: GitHub Pages + Render

Frontend React อยู่ GitHub Pages, Backend Express อยู่ Render, PostgreSQL ใช้ Supabase เดิม และ Redis ใช้ Upstash เดิม ไม่ใช้ Netlify หรือ Reverse Proxy ฝั่ง Frontend

## พฤติกรรม Login

- Login/Register คืน Access JWT และ expiresAt ใน JSON ผ่าน HTTPS
- React เก็บ Token เฉพาะหน่วยความจำ ส่ง Authorization: Bearer ไม่มี Cookie/Refresh Token และไม่เก็บ Token ใน localStorage/sessionStorage
- เปลี่ยนหน้าด้วย Hash Routing ไม่ Reload จึงยัง Login อยู่ รีเฟรช/ปิดแท็บหรือ Token หมดอายุ (เริ่มต้น 15 นาที) ต้อง Login ใหม่
- Redis เก็บ Session ID/Auth Version จน Token หมดอายุ Logout ยกเลิก Session จริง ตรวจ Role/สถานะล่าสุดจาก DB ทุก Protected Request และ Fail Closed เมื่อ Redis ล่ม
- CORS อนุญาตเฉพาะ APP_ORIGIN และ Authorization/Content-Type/Idempotency-Key; คำขอเขียนยังตรวจ Origin + JSON

## 1. Migration

ฐานข้อมูลใหม่รัน 001–019 ตามลำดับ ฐานข้อมูลเดิมรันเฉพาะที่ยังไม่มี ห้ามรันไฟล์เดิมซ้ำ

- 017 สงวน Short Code ถาวรและใช้ Idempotency ป้องกัน Request สร้างซ้ำ
- 018–019 ยกเลิก Cron และลบฟังก์ชันล้าง Audit เก็บประวัติไว้ไม่จำกัดอายุ
- การย้าย Hosting/Authentication ครั้งนี้ไม่ต้องมี Migration ใหม่
- ลิงก์/QR ที่เคยแจกด้วยโดเมนเดิมจะไม่เปลี่ยนในไฟล์ภาพอัตโนมัติ ตรวจ PUBLIC_BASE_URL ก่อนดาวน์โหลด QR สำหรับงานจริง

## 2. Render Web Service — Free

เชื่อม Repository `yimyuan/Ford-ShortURL` ใช้ Root ของ Repository ไม่ตั้ง Root Directory เป็น backend

| ค่า | การตั้งค่า |
| --- | --- |
| Build | `npm ci --omit=dev` |
| Start | `npm start` |
| Health Check | `/api/health` |
| NODE_VERSION | `24` |
| NODE_ENV | `production` |
| HOST | `0.0.0.0` |
| TRUST_PROXY_HOPS | `1` สำหรับ Render Load Balancer; เครื่อง Local ใช้ `0` |
| APP_ORIGIN | `https://yimyuan.github.io` **ไม่มี /Ford-ShortURL/** |
| PUBLIC_BASE_URL | `https://ชื่อหลังบ้าน.onrender.com` **ไม่มี Path** |
| SUPABASE_URL | Project URL เดิม |
| SUPABASE_SECRET_KEY | Backend Secret เดิม |
| REDIS_URL | Upstash URL แบบ `rediss://...` |
| JWT_SECRET | Random Secret อย่างน้อย 32 bytes |
| CSRF_SECRET | Random Secret แยกอีกค่า ใช้ HMAC ใน Rate Limit |
| ACCESS_TOKEN_TTL_SECONDS | `900` (ค่าเริ่มต้น) |

ไม่ต้องตั้ง PROXY_MODE, PROXY_SECRET หรือ REFRESH_TOKEN_TTL_SECONDS อีก และไม่เก็บ Secrets ใน Repository/GitHub Pages

ปิด Automatic Deploy จากทุก Push ไว้ก่อน ใช้ Manual Deploy หลัง CI ผ่าน หรือเลือกโหมดรอ CI checks หาก Render แสดงตัวเลือกนี้ อย่าถือว่า Auto Deploy ทั่วไปรอ GitHub Actions

หลัง Deploy ต้องตรวจ Client IP จากเครือข่ายต่างกันว่า Rate Limit แยกได้จริง ไม่เพิ่ม Trust Proxy แบบไม่จำกัดเพื่อแก้ปัญหา และห้ามนำค่า TRUST_PROXY_HOPS=1 ไปใช้กับ Node ที่เปิดตรงโดยไม่มี Trusted Proxy

Render Free อาจพักเมื่อไม่มี Traffic การเปิดครั้งแรกอาจช้า ต้องเผื่อเวลาให้ Backend พร้อมก่อนสาธิต

## 3. GitHub Pages

เมื่อได้ URL Render:

1. Repository → Settings → Secrets and variables → Actions → **Variables**
2. เพิ่ม `VITE_API_ORIGIN` = `https://ชื่อหลังบ้าน.onrender.com` ไม่มี /api หรือ Path อื่น ค่านี้เป็น Public URL ไม่ใช่ Secret
3. Settings → Pages → Build and deployment → Source = **GitHub Actions**
4. Commit/Push โค้ดเข้า main หรือ Run workflow CI ด้วยตนเอง

Workflow `.github/workflows/ci.yml` จะ:

- ตรวจ Backend/Frontend/CLI Tests และ Build ด้วย Node 24
- ทดสอบ PostgreSQL/Redis ชั่วคราวบน CI Runner ไม่ใช้ข้อมูลจริง
- รอให้ `test-build` และ `database-redis` ผ่านก่อน Job `deploy-pages`
- Build ด้วย `VITE_BASE_PATH=/Ford-ShortURL/` (ดึงชื่อ Repository อัตโนมัติ) และ VITE_API_ORIGIN จาก Repository Variable
- Upload และ Deploy GitHub Pages เฉพาะ main ไม่ Deploy จาก Pull Request
- หากยังไม่ตั้ง VITE_API_ORIGIN จะข้าม Job Deploy โดย Tests ยังทำงาน

URL หน้าเว็บ: `https://yimyuan.github.io/Ford-ShortURL/`

| หน้า | URL ต่อท้าย |
| --- | --- |
| หน้าแรก | `#/` |
| ลิงก์ของฉัน | `#/my-links` |
| ภาพรวม | `#/dashboard` |
| Admin | `#/admin` |

Hash ไม่ถูกส่งไป GitHub server จึงเปิดตรง/รีเฟรชแล้วไม่เกิด 404 แต่ต้อง Login ใหม่ตามนโยบาย Token ในหน่วยความจำ

## 4. ตรวจหลัง Deploy

1. เปิดแต่ละ Hash URL โดยตรง ตรวจรูปพื้นหลังและไฟล์ JS/CSS ว่าไม่ 404
2. Login User/Admin และเปลี่ยนหน้าหลายครั้ง ต้องไม่หลุดระหว่างนำทาง
3. Reload หน้า ต้อง Login ใหม่; Token ไม่ปรากฏใน Cookies/localStorage/sessionStorage
4. เปิด DevTools ตรวจ Preflight, Authorization และ CORS ว่าอนุญาตเฉพาะ Pages Origin ที่ตั้งไว้
5. สร้าง Random/Custom Link; Retry Request เดิมต้องได้ Link ID เดิม
6. Short URL และ QR ต้องเป็นโดเมน Render `/r/:code` เปิดได้และนับ GET ส่วน HEAD ไม่นับ
7. Logout แล้วนำ Token เดิมเรียก API ในระบบทดสอบต้องได้ 401; เปลี่ยน Role/ระงับ/Reset ต้องยกเลิกสิทธิ์เดิม
8. ตรวจการลบลิงก์ การสงวนชื่อ และ Audit History ไม่ลบอัตโนมัติ

## Integration ในเครื่อง

แผนภาพและ schema reference: [DFD/ER](diagrams/short-url-dfd.html), [Data Dictionary](design/DATA_DICTIONARY.md) อ้างอิง source/migrations 001–019 การอัปเดตเอกสารไม่ต้องรัน migration ซ้ำ

ต้องมี psql และ PostgreSQL/Redis ชั่วคราวที่ localhost ตั้ง `TEST_DATABASE_URL` (Database ชื่อ shorturl_test) และ `TEST_REDIS_URL` แล้วรัน `node backend/scripts/test-integration.js`

Tests ปฏิเสธฐานข้อมูลที่ไม่ใช่ localhost และไม่ล้าง Schema เดิมให้เอง รัน Migration 001–019 ยกเว้น 010 เพราะ PostgreSQL image มาตรฐานไม่มี pg_cron

อ้างอิง: [GitHub Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), [Render Free](https://render.com/docs/free)
