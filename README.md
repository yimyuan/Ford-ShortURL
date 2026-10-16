# Short URL

เว็บย่อลิงก์ สร้างและตกแต่ง QR Code ดูประวัติและสถิติ พร้อมหน้าจัดการสำหรับผู้ใช้และ Admin

ใช้ **React + Vite + Tailwind CSS**, **Node.js + Express**, **PostgreSQL บน Supabase** และ **Redis** โครงสร้าง Backend เดียวที่แยกโมดูลตามฟีเจอร์ ยังไม่ได้แยกเป็น Microservices

## ฟังก์ชันปัจจุบัน

- สมัคร/เข้าสู่ระบบด้วย Email/Password ใช้ Access JWT และ Refresh Token ผ่าน HttpOnly cookies
- กรอก URL ก่อน Login ได้ จากนั้น Login → Popup เลือกชื่อหรือสุ่ม → ยืนยันสร้าง → หน้าลิงก์ของฉัน
- สุ่ม Base62 8 ตัว หรือกำหนดชื่อ 3–40 ตัวด้วย A–Z, a–z, 0–9 และ `-` ขึ้นต้น/ลงท้ายด้วยตัวอักษรหรือตัวเลข แยกตัวพิมพ์เล็กใหญ่ และเปลี่ยนชื่อหลังสร้างไม่ได้
- เปิดลิงก์ผ่าน `/r/:code` ไป URL ต้นฉบับ พร้อมเพิ่มยอดแบบ atomic; HEAD ไม่เพิ่มยอด
- ลิงก์ของฉัน: ตารางบนคอม/รายการกระชับบนมือถือ ค้นหา กรองวันที่/ยอดเปิด เรียงลำดับ และโหลดครั้งละ 10 รายการจาก Backend
- Popup รายละเอียด คัดลอก เปิดลิงก์ และเครื่องมือ QR
- QR เลือกสี ขนาด 256/512/1024 และจุดสี่เหลี่ยม/มุมมน/วงกลม ดาวน์โหลด PNG/SVG ไม่มีรูป/โลโก้ตรงกลาง
- บันทึกแบบ QR แยกตามลิงก์ เก็บเฉพาะค่าสี/ขนาด/รูปแบบ ไม่เก็บไฟล์ภาพ สีปรับอิสระพร้อมคำเตือนการสแกน
- Dashboard ผู้ใช้: จำนวนลิงก์ ยอดเปิดรวม ลิงก์ที่มีคนเปิดแล้ว กราฟ Recharts 7 วัน และลิงก์ยอดนิยม 5 อันดับ
- Admin: ภาพรวม ผู้ใช้ สิทธิ์ สถานะบัญชี รหัสผ่านชั่วคราว ลบบัญชี จัดการลิงก์ตามเจ้าของ และประวัติ
- ยืนยันก่อนบันทึกการเปลี่ยนแปลง เก็บ Audit Log ของ Admin เพื่อใช้ตรวจสอบความปลอดภัยโดยไม่ลบอัตโนมัติ

ยอดเปิดรวมการเปิดซ้ำและบอต ไม่ใช่ผู้เข้าชมที่ไม่ซ้ำ กราฟรายวันเริ่มเก็บตั้งแต่ migration 015; วันก่อนเริ่มเก็บแสดงว่าไม่มีข้อมูล ส่วนยอดสะสมเดิมยังอยู่

## สิ่งที่ต้องเตรียม

1. Node.js **24 ขึ้นไป** พร้อม npm
2. Supabase project ที่เปิด Data API และ PostgreSQL
3. Redis ที่ Backend เข้าถึงได้ เช่น Redis ในเครื่องหรือ Upstash แบบ TCP/TLS

## ติดตั้งจาก Repository

Clone Repository แล้วเข้าโฟลเดอร์ที่มี package.json หลัก จากนั้นรัน:

```sh
npm ci
```

คำสั่งเดียวติดตั้งทั้งสอง workspaces ตาม `package-lock.json` รวม QR/กราฟแล้ว **ไม่ต้องติดตั้งแยกอีกครั้ง** ใช้ npm install เมื่อเพิ่ม/เปลี่ยน dependencies และ commit manifest กับ lock พร้อมกัน

PowerShell หาก npm.ps1 ถูกบล็อก ใช้ npm.cmd แทน npm ได้ทุกคำสั่ง สร้าง backend/.env เฉพาะเมื่อยังไม่มีไฟล์:

```powershell
if (-not (Test-Path backend/.env)) { Copy-Item backend/.env.example backend/.env }
```

macOS/Linux ใช้ `cp -n backend/.env.example backend/.env` แล้วกรอกค่าจริงโดยไม่ส่งขึ้น Git

### ค่าตั้ง Backend

| ตัวแปร | วิธีตั้งค่า |
| --- | --- |
| SUPABASE_URL | Project URL `https://<project>.supabase.co` |
| SUPABASE_SECRET_KEY | Secret API key หรือ legacy service_role เฉพาะ Backend |
| REDIS_URL | redis:// สำหรับในเครื่อง หรือ rediss:// สำหรับ TLS; ไม่ใช่ REST URL/Token |
| JWT_SECRET | ค่าสุ่มอย่างน้อย 32 bytes |
| CSRF_SECRET | ค่าสุ่มอีกค่าที่ต่างจาก JWT secret อย่างน้อย 32 bytes |
| APP_ORIGIN | Origin ของเว็บ; พัฒนาใช้ http://127.0.0.1:5173 |
| PUBLIC_BASE_URL | Origin สำหรับ Short URL/QR; พัฒนาใช้ค่าเดียวกับเว็บ |
| HOST / PORT | ปกติ 127.0.0.1 / 3000; Hosting อาจต้องใช้ HOST=0.0.0.0 |
| NODE_ENV | development ตอนพัฒนา; production เมื่อ Deploy |

สร้าง secret โดยรันแยกสองครั้งเพื่อให้ได้คนละค่า:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

ค่าทางเลือกและอายุ Token อยู่ใน [backend/.env.example](backend/.env.example) ห้ามนำ Secret API key, Redis URL หรือ signing secrets ใส่ VITE_* แอปเชื่อม **Express → Supabase SDK ผ่าน HTTPS → PostgreSQL** ไม่ใช้ Supabase Auth, PostgreSQL connection string หรือ DATABASE_SSL_CA

### เตรียมฐานข้อมูลใหม่

เปิด Supabase SQL Editor แล้วรัน [backend/sql](backend/sql) **001 ถึง 019 ตามลำดับ** ทีละไฟล์ รายละเอียดอยู่ใน [Backend README](backend/README.md#database-migrations)

- ถ้ามี migration แล้วให้รันเฉพาะไฟล์ที่ยังไม่ได้ใช้ ไม่รันไฟล์เดิมซ้ำ
- 003 เปิด schema app ให้ Data API; authenticator.pgrst.db_schemas ในไฟล์นี้ override Dashboard Exposed schemas
- 010 ใช้ pg_cron สำหรับล้าง Audit Log ต้องรันด้วยบัญชีที่มีสิทธิ์จัดการฐานข้อมูล
- ทุกตารางใน app เปิด RLS; งานหลายขั้นตอนที่ต้อง atomic ใช้ PostgreSQL function ผ่าน RPC
- CLI และ npm start ไม่ migrate ให้อัตโนมัติ

### สร้าง Admin หลักครั้งแรก

ตั้ง BOOTSTRAP_ADMIN_EMAIL ใน backend/.env ถ้าไม่ตั้งใช้ admin@shorturl.local แล้วรัน:

```sh
npm run setup:admin
```

หากเว้น BOOTSTRAP_ADMIN_PASSWORD ระบบสุ่มรหัสและบันทึกใน backend/.admin-bootstrap-credentials.json เฉพาะเครื่อง หากกำหนดรหัสเองต้องอย่างน้อย 10 ตัว หลังสำเร็จให้นำค่า password สำหรับ bootstrap ออกจาก environment

คำสั่งไม่สร้าง Admin ซ้ำและไม่เปลี่ยนรหัสเดิม ไม่มี HTTP endpoint สำหรับ setup บัญชีหลักถูกป้องกันการลบ ระงับ หรือลดสิทธิ์ทั้ง Backend/ฐานข้อมูล **ไม่มีรหัสผ่านทดสอบที่ฝังไว้ใน Repository**

## รันในเครื่อง

```sh
npm run check:connections
```

เปิด Terminal สองหน้าต่างจาก root:

```sh
npm run dev:backend
```

```sh
npm run dev:frontend
```

| หน้า | URL ตอนพัฒนา |
| --- | --- |
| หน้าแรก / สร้างลิงก์ | http://127.0.0.1:5173/ |
| ลิงก์ของฉัน | http://127.0.0.1:5173/my-links |
| ภาพรวมผู้ใช้ | http://127.0.0.1:5173/dashboard |
| Admin | http://127.0.0.1:5173/admin |
| API liveness | http://127.0.0.1:3000/api/health |

Vite proxy ส่ง /api และ /r ไป Backend; /user เป็น alias ของหน้าแรก Admin ไป /admin ผู้ใช้ทั่วไปเข้า Admin ไม่ได้ และสร้างลิงก์สำเร็จไป /my-links

/api/health ตรวจ process เท่านั้น ส่วน check:connections ตรวจ Supabase Data API ของ users/links กับ Redis PING ไม่ใช่ตรวจ business function ทุกตัว

### FORD CLI (ทางเลือก)

```sh
node scripts/ford.js install
node scripts/ford.js run
```

Windows ใช้ `.\ford.cmd install` / `.\ford.cmd run` ได้ หากต้องการเรียก ford.cmd จากทุกโฟลเดอร์ให้รัน npm link หนึ่งครั้ง ใช้ลูกศรเลือกและ Enter; Ctrl+C ออก

CLI ตรวจ manifest/lock/dependencies ก่อนติดตั้ง เก็บ .env เดิมไว้ และตรวจ Supabase/Redis ก่อนเปิด Backend เมนูรันทีละฝั่ง ถ้าเปิดพร้อมกันใช้สอง Terminal

## Dependencies สำคัญ

| Workspace | แพ็กเกจ | หน้าที่ |
| --- | --- | --- |
| Backend | qrcode | QR matrix และ QR พื้นฐาน |
| Backend | pngjs | PNG จุดมุมมน/วงกลม |
| Frontend | recharts | กราฟยอดเปิด โหลดแยกเฉพาะ Dashboard |
| Frontend | react, react-dom | UI |
| Backend | express, @supabase/supabase-js, redis | API, PostgreSQL Data API, Redis |

ตรวจด้วย npm ls --all เวอร์ชันติดตั้งซ้ำอ้างอิง package-lock.json จึงต้อง commit lock ด้วย UNMET OPTIONAL DEPENDENCY เฉพาะ OS/เครื่องมือเสริมอาจพบได้โดย npm ls ยังจบ code 0 ไม่จำเป็นต้องลง optional package ทุกตัว

ตรวจช่องโหว่ของ runtime dependencies ด้วย `npm audit --omit=dev` เมื่อเชื่อมต่อ npm registry ได้ หาก DNS/เครือข่ายล้มเหลวจะยังสรุปผลช่องโหว่ไม่ได้ ไม่ใช้ npm audit fix --force โดยไม่ตรวจผลกระทบต่อเวอร์ชันก่อน

## ทดสอบและ Build

```sh
npm run test -w backend
npm run test -w frontend
npm run test:cli
npm run build
```

Backend tests ครอบคลุม Auth/สิทธิ์, ownership, create/redirect/QR, filters/pagination และ Admin Frontend tests ครอบคลุม API contracts, navigation, QR settings, chart data, rendering และ modal behavior

Build สร้าง frontend/dist/ บาง environment บล็อก localhost จึงข้าม HTTP integration test และ Windows บางเครื่องบล็อก junction ทำให้ CLI linked-path test ไม่ผ่าน ต้องตรวจซ้ำในเครื่องที่รองรับ การทดสอบอัตโนมัติและ Build ไม่แทนการทดสอบหลัง Deploy

## แนวทาง Deploy

มี GitHub Actions CI และ Netlify Edge Proxy configuration แล้ว ดูขั้นตอนตั้งค่าและ Migration 017 ใน [คู่มือ Deploy](docs/DEPLOY.md) ต้องตั้ง Secrets บน Hosting และทดสอบจริงก่อนเปิดใช้งาน CI ยังไม่ Deploy อัตโนมัติ

1. ติดตั้ง npm ci แล้ว Build ด้วย npm run build
2. โฮสต์ frontend/dist/ พร้อม SPA fallback ไป index.html สำหรับ /my-links, /dashboard, /admin
3. รัน Backend ด้วย npm start และกำหนด environment ของ Hosting
4. ใช้ HTTPS origin เดียว และ reverse proxy /api กับ /r ไป Backend **ก่อน** SPA fallback
5. ตั้ง NODE_ENV=production, APP_ORIGIN, PUBLIC_BASE_URL เป็น origin จริงที่ตรงกัน Cookie จะใช้ Secure ใน production
6. ทดสอบ Login/Refresh/Logout, User/Admin, สร้าง/เปิดลิงก์, QR มือถือ, กราฟ/ตัวกรอง และ Cron บนโดเมนจริง

npm start เปิดเฉพาะ Express ไม่ serve Frontend หรือสร้าง proxy ให้ ยังไม่มี URL Deploy/บัญชีสาธิตสาธารณะใน Repository ให้เพิ่มข้อมูลส่งงานหลัง Deploy และส่งรหัสผ่านให้ผู้ตรวจแยกจาก source code

Short URL localhost เปิดไม่ได้จากมือถือเครื่องอื่น ต้องตั้งโดเมนที่อุปกรณ์เข้าถึงได้ก่อนสร้าง/ดาวน์โหลด QR สำหรับสาธิต

## โครงสร้างและเอกสาร

```text
frontend/src/
  app/                  Routes, providers, guards, User/Admin layouts
  features/             home, auth, links, dashboard, admin
  shared/               API client, reusable UI, hooks
  styles/               Tailwind tokens, base, motion
backend/src/
  modules/              auth, users, links, dashboard, admin, setup, health
  infrastructure/       Supabase SDK, Redis
  security/             Password hash, JWT, refresh token
  middleware/           Auth, roles, validation, write guards
backend/sql/            Migrations 001–019
scripts/                FORD CLI และ tests
docs/                   เอกสารออกแบบและ Diagram
```

- [Backend README](backend/README.md): API, migrations, ข้อจำกัด
- [Frontend README](frontend/README.md): routes, flow, UI, packages
- [DFD/ERD ต้นฉบับ](docs/diagrams/short-url-dfd.html) และ [PDF](docs/diagrams/pdf): **ฉบับก่อนฟีเจอร์ล่าสุด ต้องอัปเดตก่อนส่งงาน**
- [Backend Design](docs/design/BACKEND_DESIGN.md) และ [Design Review](docs/design/DESIGN_REVIEW.md): มีแบบเดิม ให้ยึด implementation, migrations และ README ปัจจุบัน

หลัง Migration 017 มี 7 ตาราง รวม short_code_reservations และ link_creation_requests; Migration 018 ยกเลิกการลบ Admin Audit Log อัตโนมัติ เก็บประวัติไว้ตรวจสอบความปลอดภัย

## ข้อจำกัดที่ต้องติดตาม

- ยังไม่มี Google Login, email verification, ลืมรหัสผ่านทางอีเมล หรือหน้าตั้งค่าติดต่อ Admin
- สี QR ปรับอิสระจึงไม่รับประกันการสแกนทุกคู่สี ควรทดลองก่อนใช้จริง
- DFD/ERD, URL ออนไลน์ และการสาธิตครบ flow ยังต้องเตรียมก่อนส่งงาน

## ก่อนนำขึ้น Git

Commit source, package.json ทุก workspace, package-lock.json, .env.example, migrations และ README ส่วน .env, รหัส bootstrap, node_modules, build output และ tmp/ ถูกยกเว้นด้วย .gitignore

ตรวจ git status --short และ git diff --cached ก่อน push หากไฟล์ลับเคยถูก track มาก่อน .gitignore ไม่ได้นำออกจากประวัติให้
