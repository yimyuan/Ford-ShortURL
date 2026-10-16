# Ford-ShortURL - System Design

อัปเดต 2026-10-16 จาก source และผลรวม migrations 001–019 ไม่ใช่การรับรอง Production หรือการตรวจ schema ออนไลน์ครั้งใหม่

## Architecture

React 19 / Vite / Tailwind v4 บน GitHub Pages → HTTPS Bearer API บน Render (Node.js 24 / Express 5) → Supabase SDK / Data API → PostgreSQL schema `app` และ Express → Upstash Redis ผ่าน TCP/TLS ไม่ใช้ Supabase Auth

Frontend ใช้ Hash Routing `#/`, `#/my-links`, `#/dashboard`, `#/admin` และ base path `/Ford-ShortURL/` เรียก Render ผ่าน VITE_API_ORIGIN ไม่มี Frontend reverse proxy ใน Production ส่วน Vite proxy ใช้เฉพาะพัฒนา

Backend แบ่ง `auth`, `users`, `links`, `dashboard`, `admin`, `setup`: routes → validation/DTO → handler → service → repository → Supabase/Redis ส่วน middleware/security/infrastructure ใช้ร่วมกัน service_role อยู่ Backend เท่านั้นและ bypass RLS จึงต้องตรวจสิทธิ์เอง

## Authentication / authorization

- Register รับ email/password เท่านั้น email trim/lowercase + UNIQUE รหัสผ่านใหม่ขั้นต่ำ 10 ตัวอักษร สูงสุด 1024 bytes เก็บ scrypt hash Register สำเร็จออก session เช่นเดียวกับ Login
- JWT HS256 มี iss/aud/sub/sid/jti/iat/exp ค่าเริ่มต้น 900 วินาที ปรับ 60–3600 วินาที Secret อย่างน้อย 32 bytes
- React เก็บ JWT ใน memory ส่ง Authorization: Bearer และ credentials:omit ไม่มี Cookie/Refresh Token/refresh endpoint รีโหลด ปิดแท็บ หรือหมดอายุต้อง Login ใหม่
- Redis key `shorturl:session:<sid>` เก็บ `{userId,authVersion,expiresAt}` ใช้ SET NX EXAT ตามอายุ JWT ไม่เก็บ raw JWT หรือ password
- ทุก protected request: verify JWT → Redis session → users ล่าสุด → active/role/auth_version → ownership ใช้ user_id จาก identity ที่ตรวจแล้ว ไม่เชื่อ role/owner จาก body
- Logout ลบ session ปัจจุบัน Redis failure ตอบ 503 การเปลี่ยน role/ระงับ/reset password เปลี่ยน auth_version ผ่าน RPC ทำให้ session เก่าไม่ผ่านคำขอถัดไป
- must_change_password บังคับผ่าน PasswordChangeGate/route restrictions เปลี่ยนสำเร็จต้อง Login ใหม่
- บัญชีหลัก bootstrap ผ่าน CLI/RPC ใช้ is_primary_admin + partial UNIQUE + constraint/trigger ป้องกัน demote/disable/delete ไม่ใช้ email เป็นกลไกสิทธิ์ทุก request

หลักฐาน: backend/src/modules/auth, backend/src/security, middleware/authenticate.js, SQL 004/006, frontend/src/shared/api/session.js

## Origin / CORS / Rate limit

Production APP_ORIGIN เป็น HTTPS origin ของ Pages ไม่มี path CORS อนุญาตเฉพาะ origin ที่กำหนดและ headers Authorization/Content-Type/Idempotency-Key งานเขียนตรวจ Origin และ application/json ไม่มี Cookie double-submit CSRF แล้ว แต่ยังต้องมี CSRF_SECRET อย่างน้อย 32 bytes สำหรับ guard readiness และ HMAC ของ identifiers ใน rate limit

Redis Lua INCR/EXPIRE atomic: Login IP 30 และ email 12 ต่อ 15 นาที; Register IP 10 ต่อชั่วโมง; Logout 120, Admin 60, password 10 ต่อ 15 นาที; create link/save QR 30 ต่อ 60 วินาทีต่อ user ทุกชุด fail closed เป็น 503 เมื่อ Redis ไม่พร้อม TRUST_PROXY_HOPS ต้องตรง topology ของ host ไม่ใช้ค่าเดียวรับประกันกับทุก proxy

Redis socket connect/idle timeout 2 วินาที Auth/rate-limit deadline 2.5 วินาที Logs แสดงเฉพาะ operation/reason จาก allowlist ไม่ log raw error/URL/credential

## Create Short URL

หน้าแรกกรอก URL → Login หากยังไม่เข้า → dialog ตั้งชื่อ/สุ่ม → ยืนยัน → `#/my-links` HTTP POST /api/links ต้องมี UUID v4 Idempotency-Key URL รองรับ HTTP/HTTPS สูงสุด 8192 ตัวอักษรตาม validation ไม่รับ credential ใน URL

สุ่ม Base62 8 ตัว หรือ custom code 3–40 ตัว `[A-Za-z0-9-]` ห้ามขีดหน้า/ท้าย case-sensitive ตั้งเฉพาะตอนสร้าง ไม่มี API แก้ code หรือ URL ปลายทาง

RPC create_short_link ล็อก user ตรวจ active/password gate ซ้ำ ตรวจ `(user_id,request_id)` และ SHA-256 ของ normalized URL/custom intent คำขอเดิมข้อมูลเดิมคืนลิงก์เดิม key เดิมข้อมูลต่างตอบ 409 และลิงก์เดิมถูกลบตอบ 409 ไม่สร้างทดแทน key ใหม่เป็น intent ใหม่ อาจสร้าง URL ปลายทางซ้ำได้

INSERT trigger จอง code ใน short_code_reservations ตลอดไป และ links.short_code มี UNIQUE ทุกขั้น commit transaction เดียว ไม่มี SELECT ตรวจว่างแทน constraint Repository แปลง 23505 เป็น collision สุ่ม retry รวมสูงสุด 5 attempts; custom ชนตอบ 409 ไม่เปลี่ยนชื่อให้เอง

ลบลิงก์/บัญชีไม่คืนชื่อกลับมาใช้ ป้องกัน QR เก่าพาไปเจ้าของรายอื่น ไม่มี cleanup reservation/idempotency อัตโนมัติ

## Redirect / statistics

Public GET /r/:code ไม่ต้อง Login Redis cache code→UUID เป็น best effort (150ms ต่อ operation, TTL 300s) แล้วเรียก RPC resolve_short_link ทุกครั้ง Cache ไม่เก็บปลายทาง ไม่ข้าม DB; ID ไม่ตรงลอง RPC ด้วย code อีกครั้ง

RPC ตรวจ link และ owner active แล้ว atomic UPDATE lifetime count/last_clicked_at/updated_at พร้อม UPSERT link_click_daily transaction เดียว วัน Asia/Bangkok ไม่มี read-modify-write ใน JavaScript HEAD resolve โดยไม่นับ

คืน 302 + Cache-Control:no-store หลัง DB สำเร็จ ไม่พบ/ปิด/เจ้าของระงับตอบ 404; DB error 503 ไม่ redirect จาก cache Redis cache ล่มยัง fallback DB ได้ แต่ Auth/rate-limit fail closed

ยอดรวม GET ที่ประมวลผล รวม bot/retry ไม่ใช่ unique visitor หรือหลักฐานว่าปลายทางโหลดสำเร็จ DB commit และ HTTP delivery ไม่ใช่ transaction เดียว response หายหลัง commit อาจนับแล้ว

## QR / History / Dashboard

Backend qrcode สร้าง matrix renderer/pngjs สร้าง PNG/SVG ของ Short URL บน Render ไม่ใช่ Pages route เก็บเฉพาะ qr_style `{dark,light,size,shape}` และ qr_version ไม่เก็บภาพ/โลโก้ opaque hex สีอิสระ ขนาด 256/512/1024 shape square/rounded/dots patterns สำคัญเป็นสี่เหลี่ยม quiet zone 4 modules สีอิสระต้องลอง scan จริง

GET QR ทดลอง/ดาวน์โหลด style ได้ PATCH บันทึกต้อง confirmed/version กันเขียนทับไม่เปลี่ยนชื่อ History ใช้ user_link_history กรองตาม owner/query/clicks/period/sort ใน DB ก่อนแบ่งหน้าคงที่ 10 แถว UI ซ่อน pagination เมื่อ total ไม่เกิน 10

user_dashboard คืนยอดสะสม, 7 วัน, Top 5 ของลิงก์ที่ยังมีอยู่ Recharts แสดงผลใน React วันก่อนเริ่ม daily tracking เป็น null ไม่ backfill ยอดสะสมลงวันสมมติ ลบ link ลบ daily ตาม FK จึงไม่ใช่ lifetime analytics ของข้อมูลที่ลบแล้ว

## Admin / Audit

Admin มี summary/โดนัท, users, owners → popup links, history ทุก write ต้องยืนยัน/validation/revision ล่าสุด RPC ตรวจสิทธิ์และสถานะซ้ำใน transaction เปลี่ยน role เฉพาะบัญชีหลัก บัญชีหลัก/ตนเอง/ผู้ดูแลอื่นมีข้อจำกัดตาม service/RPC

Reset สุ่ม temporary password เก็บเฉพาะ hash บังคับเปลี่ยนใหม่ ลบบัญชีต้องยืนยัน email/จำนวนลิงก์ล่าสุด RPC ลบ links ก่อน user เพราะ FK RESTRICT ลิงก์เปิด/ปิด/ลบใช้ management_version และยืนยัน code เมื่อลบ ไม่แก้ count หรือ URL ปลายทาง

admin_audit_logs เก็บ actor/target UUID/email snapshot, action, details ก่อน/หลังตามเหตุการณ์, เวลา ไม่มี FK ไป user/link โดยตั้งใจเพื่ออยู่ต่อหลังลบ ไม่เก็บ password/hash/token SQL 018 ยกเลิก cron; 019 ลบ prune function เก็บ audit ไม่จำกัดอายุ ไม่กู้ข้อมูลที่เคยถูกลบ

## Data / CI / deployment

7 ตาราง: users, links, admin_audit_logs, analytics_state, link_click_daily, short_code_reservations, link_creation_requests ดู [Data Dictionary](DATA_DICTIONARY.md) และ [DFD/ER](../diagrams/short-url-dfd.html) ทุกตาราง RLS; grants/RPC ตาม migrations BIGINT ส่ง JSON เป็น decimal string

GitHub Actions Node 24 ตรวจ syntax/backend/frontend/CLI/build และ integration PostgreSQL 17/Redis 7.4 ชั่วคราว Pages job รอ test-build/database-redis และ main + VITE_API_ORIGIN Render gate ตั้ง After CI Checks Pass ใน Dashboard แยกจาก workflow

`/api/health` เป็น liveness ไม่ยืนยัน Redis/DB readiness ต้องทดสอบ deployment จริงตาม [DEPLOY](../DEPLOY.md) การปรับเอกสารนี้ไม่รัน migration/ไม่แก้ DB ไม่มี Google Login/email recovery/contact/link expiry/unique visitor analytics/QR logo upload หรือ standalone force-logout endpoint
