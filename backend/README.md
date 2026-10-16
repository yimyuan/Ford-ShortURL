# Backend

Node.js 24+ / Express 5 เชื่อม PostgreSQL ผ่าน Supabase SDK/HTTPS ใน schema app และ Redis ผ่าน TCP/TLS แอปตรวจ Auth/Role/ownership เอง ไม่ใช้ Supabase Auth หรือ DATABASE_SSL_CA

ติดตั้งตาม [README หลัก](../README.md) ใช้ npm ci ที่ root ให้ได้ packages/lock ชุดเดียวกัน

## โครงสร้าง

```text
src/
  modules/
    auth/        Register, Login, Refresh, Logout, Change password
    users/       Current user และ user repository
    links/       Create, history/filter, redirect, QR settings/rendering
    dashboard/   Aggregate เฉพาะเจ้าของลิงก์
    admin/       Users, owner-scoped links, overview, audit
    setup/       Primary admin bootstrap (CLI only)
    health/      Process liveness
  infrastructure/  Supabase SDK, Redis
  middleware/      Auth, roles, validation, Origin/JSON guards, rate limits
  security/        Scrypt password hash, access JWT, refresh tokens
  errors/          AppError
sql/               Migrations
scripts/           Connection check, admin setup
tests/             Node test runner
```

Route → middleware/DTO → Handler → Service → Repository → Supabase/Redis งานหลายขั้นตอนที่ต้อง atomic ใช้ PostgreSQL function ผ่าน RPC

## คำสั่งจาก root

```sh
npm run check:connections
npm run setup:admin
npm run dev:backend
npm run test -w backend
npm start
```

npm start เปิดเฉพาะ Backend ใช้ backend/.env ในเครื่องหรือ environment ของ Hosting ดูตัวแปรใน [.env.example](.env.example) ไม่ส่งค่าจริง/รหัสผ่านไป Frontend/Git

## Database migrations

ฐานข้อมูลใหม่รัน SQL Editor ตามลำดับ **001–019** หากมี migration แล้วไม่รันไฟล์เดิมซ้ำ CLI ไม่ migrate ให้อัตโนมัติ Backend รุ่นนี้ต้องมี 017 ก่อนสร้างลิงก์ และ 018–019 เพื่อยกเลิกและลบระบบล้างประวัติ

| ไฟล์ | หน้าที่ |
| --- | --- |
| 001_initial_schema.sql | users/links, UUID, constraints, indexes |
| 002_supabase_data_api.sql | RLS และสิทธิ์ Data API |
| 003_expose_app_schema.sql | เปิด schema app ให้ PostgREST |
| 004_primary_admin.sql | Admin หลักหนึ่งบัญชีและ database protection |
| 005_short_links.sql | Atomic redirect/click counter |
| 006_admin_management.sql | User actions, temporary password, audit |
| 007_admin_summary.sql | Aggregate ภาพรวม Admin |
| 008_admin_owner_links.sql | ลิงก์ตามเจ้าของและ audit การจัดการลิงก์ |
| 009_admin_overview.sql | สถานะบัญชี/ลิงก์และตัวเลขวันนี้ |
| 010_admin_audit_retention.sql | ล้าง Audit Log เก่ากว่า 1 เดือนทุกชั่วโมงด้วย pg_cron |
| 011_custom_short_names.sql | ชื่อ 3–40 ตัว และ trigger ล็อกชื่อหลังสร้าง |
| 012_link_qr_styles.sql | QR settings/revision ป้องกันการบันทึกทับ |
| 013_unrestricted_qr_colors.sql | สีอิสระ คำเตือน contrast อยู่ที่ UI |
| 014_qr_dot_shapes.sql | square/rounded/dots; แบบเดิมเป็น square |
| 015_user_dashboard.sql | ยอดรายวันเวลาไทยและ aggregate ผู้ใช้ |
| 016_user_link_filters.sql | ค้นหา กรอง เรียง แบ่งหน้าครั้งละ 10 |
| 017_link_creation_safety.sql | สงวนชื่อถาวร, Idempotency และตรวจสถานะบัญชีใน Transaction สร้างลิงก์ |
| 018_keep_admin_audit_history.sql | ยกเลิก Cron ลบประวัติและเปลี่ยน prune เป็น no-op เก็บ Audit Log ไม่จำกัดอายุ |
| 019_remove_unused_audit_cleanup.sql | ลบฟังก์ชันล้างประวัติที่ไม่ใช้งาน โดยเก็บข้อมูล Audit ไว้ |

003 ตั้ง authenticator.pgrst.db_schemas ซึ่ง override Dashboard Exposed schemas ถ้าเพิ่ม schema ต้องปรับรายการนี้หรือคืนให้ Dashboard ควบคุม 010 ต้องมีสิทธิ์ติดตั้ง pg_cron

ตารางปัจจุบัน: app.users, app.links, app.admin_audit_logs, app.analytics_state, app.link_click_daily, app.short_code_reservations, app.link_creation_requests ทุกตารางเปิด RLS แต่สิทธิ์ service role/RPC ต่างกันตาม migration ห้ามส่งคีย์ Backend ให้ browser

POST /api/links ต้องส่ง `Idempotency-Key` แบบ UUID v4 นอกเหนือจาก JSON เดิม `{originalUrl, customCode?}` ใช้ Key เดิมเมื่อ Retry Payload เดิม จะได้ลิงก์เดิมแม้ Response ครั้งแรกหาย เปลี่ยน Payload ด้วย Key เดิมหรือ Replay ลิงก์ที่ลบแล้วได้ 409

ชื่อที่ลบยังอยู่ใน short_code_reservations แม้ลบบัญชี เจ้าของเดิมจึงไม่ถูกสวมปลายทางผ่าน QR เก่า ตารางนี้เก็บเฉพาะชื่อ ไม่มีข้อมูลผู้ใช้ Request Fingerprint เก็บ SHA-256 ไม่เก็บ URL ซ้ำ รายละเอียด/ข้อจำกัดย้อนหลังอยู่ใน [คู่มือ Deploy](../docs/DEPLOY.md)

Redis Cache มี Deadline 150ms ต่อ Operation; Session/Rate Limit มี Deadline 2500ms และ Socket Timeout 2000ms Cache ล้มเหลวกลับไป DB ส่วน Auth/Rate Limit คืน 503 ไม่ข้ามการตรวจสิทธิ์

Production บน Netlify/Render ใช้ PROXY_MODE=netlify และ PROXY_SECRET เดียวกันทั้งสองฝั่ง เพื่อให้ IP มาจาก Netlify Edge ที่ยืนยันได้ ไม่เชื่อ X-Forwarded-For จาก Browser

## Authentication

- Password เป็น salted scrypt hash รหัสใหม่อย่างน้อย 10 ตัว
- Access JWT อายุเริ่มต้น 15 นาทีใน HttpOnly cookie path /api; Refresh cookie path /api/auth อายุสูงสุดเริ่มต้น 7 วัน
- SameSite=Strict และ Secure เมื่อ NODE_ENV=production ไม่ส่ง token ให้ React เก็บใน localStorage
- Redis เก็บ refresh hash มี atomic rotation/reuse detection และ absolute expiry
- Protected request ตรวจบัญชีล่าสุดและ Redis family; เปลี่ยนสิทธิ์/สถานะ/รหัสผ่านเพิ่ม auth_version เพื่อยกเลิก session เก่า
- คำขอเขียนใช้ Origin/JSON guard และ rate limit ตามประเภทงาน
- หลัง Admin reset password ต้องเปลี่ยนรหัสชั่วคราวก่อนใช้ส่วนอื่น
- Bootstrap Admin หลักผ่าน CLI เท่านั้น รันซ้ำไม่เปลี่ยนรหัสเดิม บัญชีหลักลดสิทธิ์/ระงับ/ลบไม่ได้

## API หลัก

| Method / path | การทำงาน |
| --- | --- |
| GET /api/health | Liveness ไม่ใช่ DB/Redis readiness |
| POST /api/auth/register | สมัคร Email/Password และสร้าง session |
| POST /api/auth/login | เข้าสู่ระบบ |
| POST /api/auth/refresh | หมุน refresh token |
| POST /api/auth/logout | ยกเลิก session และล้าง cookie |
| GET /api/auth/me | บัญชีปัจจุบัน |
| POST /api/auth/change-password | ยืนยันรหัสเดิม เปลี่ยนรหัสใหม่ ล้าง session cookies |
| GET /api/users/me | Current user ผ่าน users module |
| POST /api/links | originalUrl และ customCode แบบไม่บังคับ |
| GET /api/links | ประวัติเฉพาะเจ้าของ search/filter/sort/page |
| GET /api/links/:id | รายละเอียดเฉพาะเจ้าของ |
| GET /api/links/:id/qr | SVG/PNG จากแบบบันทึกหรือค่าทดลอง |
| PATCH /api/links/:id/qr | บันทึกแบบ QR พร้อม confirmed/revision |
| GET /api/dashboard | ยอดรวม กราฟ 7 วัน Top 5 ของบัญชีปัจจุบัน |
| GET หรือ HEAD /r/:code | Public redirect; เฉพาะ GET เพิ่มยอด |
| GET /api/admin/summary | Aggregate ภาพรวม Admin |
| GET /api/admin/users | ค้นหา กรอง แบ่งหน้าผู้ใช้ |
| GET /api/admin/users/:id/impact | ข้อมูลก่อนยืนยันจัดการผู้ใช้ |
| PATCH /api/admin/users/:id | Role, ระงับ/เปิด, reset password, ลบบัญชี |
| GET /api/admin/link-owners | เจ้าของที่มีลิงก์ |
| GET /api/admin/link-owners/:ownerId/links | ลิงก์ของเจ้าของที่เลือก |
| GET /api/admin/link-owners/:ownerId/links/:id | รายละเอียดใน scope Admin |
| GET /api/admin/link-owners/:ownerId/links/:id/qr | QR ของลิงก์ที่เลือก |
| PATCH /api/admin/link-owners/:ownerId/links/:id | เปิด/ปิด/ลบ พร้อมยืนยันและ revision |
| GET /api/admin/history | Audit Log search/action/date/page |

Admin API ตรวจ role ล่าสุด และ RPC เขียนตรวจสิทธิ์ซ้ำใน transaction ไม่เชื่อ role/owner ID จาก body ยังมี GET /api/admin/links แบบเดิมสำหรับความเข้ากันได้

### History filters

GET /api/links รับ page, query (สูงสุด 8192), clicks=all|opened|unopened, period=all|today|7d|30d, sort=newest|oldest|clicks จำนวนต่อหน้าคงที่ 10 ไม่รับ userId/pageSize จาก client

ค้นหา code/URL แบบ substring โดย % และ _ เป็นอักขระปกติ วันที่อิง Asia/Bangkok รวมวันนี้ (7d เริ่มหกวันก่อน; 30d ยี่สิบเก้าวันก่อน) คืน count/page จาก snapshot เดียว BIGINT ส่งเป็น decimal string

### Redirect และสถิติ

Redis cache เก็บ code→link UUID อายุ 5 นาที ฐานข้อมูลยังตรวจปลายทาง/สถานะและเพิ่มยอด atomic ทุก GET ถ้า cache ล่มยังใช้ฐานข้อมูลได้ HEAD, code ไม่พบ, cache ID ไม่ตรง, ลิงก์ปิด หรือเจ้าของระงับไม่เพิ่มยอด

ยอดสะสม/รายวันอัปเดต transaction เดียว วันก่อน migration 015 ไม่ backfill จากยอดสะสม Dashboard รวมเฉพาะลิงก์ที่ยังอยู่ของผู้ใช้ ลบลิงก์แล้วลบ daily rows ผ่าน FK cascade

### QR และ Audit retention

qrcode สร้าง matrix; pngjs สร้าง PNG จุดมุมมน/วงกลม QR style มี dark/light/size/shape และ qr_version แยกจาก revision จัดการลิงก์ เก็บเฉพาะ settings

GET QR รองรับ query dark/light/size/shape/format=png|svg ถ้าทดลอง style ต้องส่งสี/ขนาดครบ ไม่ส่ง style ใช้แบบที่บันทึก PATCH ใช้ `{style, version, confirmed: true}` ตรวจเจ้าของ/บัญชีปัจจุบัน คืน 409 เมื่อ revision เก่า

สีเป็น opaque hex 6 หลัก ขนาด 256/512/1024 รูปแบบ square/rounded/dots ไม่มี logo/image upload สงวน finder/timing/alignment/format/version modules เป็นสี่เหลี่ยมและคง quiet zone 4 modules สีเลือกอิสระ ต้องลองสแกนก่อนใช้จริง

Migration 018 ยกเลิก Cron shorturl-admin-audit-retention และ Migration 019 ลบฟังก์ชัน app.prune_admin_audit_logs() ออก เก็บ Admin Audit Log ไม่จำกัดอายุเพื่อใช้ตรวจสอบความปลอดภัย ประวัติที่ถูกลบไปแล้วก่อนหน้านี้ไม่สามารถกู้กลับด้วย Migration นี้

## ข้อจำกัด

- ไม่มี Google Login, email verification หรือ self-service password recovery ทางอีเมล
- DFD/ERD และ docs/design ยังไม่ตรง implementation ล่าสุด
- Deployment, HTTPS/proxy, cookies และ QR จากอุปกรณ์จริงต้องทดสอบบน Hosting
