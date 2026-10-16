# PostgreSQL Data Dictionary

อัปเดต 2026-10-16 ตามผลรวม migrations 001–019, schema app ไม่ใช่การ introspect ออนไลน์ ทุก field NOT NULL เว้นที่ระบุ nullable; PK/FK/UK = primary/foreign/unique key

## users

| Field | Type / key | Constraint / default |
| --- | --- | --- |
| id | UUID PK | gen_random_uuid() |
| email | VARCHAR(254) UK | lower(trim), unique |
| password_hash | VARCHAR(255) | scrypt; ไม่ส่ง API |
| created_at | TIMESTAMPTZ | CURRENT_TIMESTAMP |
| role | VARCHAR(10) | user/admin; default user |
| is_active | BOOLEAN | true |
| auth_version | BIGINT | >=0; default 0; session revision |
| updated_at | TIMESTAMPTZ | CURRENT_TIMESTAMP |
| is_primary_admin | BOOLEAN | false; partial UNIQUE เมื่อ true |
| must_change_password | BOOLEAN | false |

Primary admin ต้อง admin/active; trigger ป้องกัน demote/disable/delete

## links

| Field | Type / key | Constraint / default |
| --- | --- | --- |
| id | UUID PK | gen_random_uuid() |
| user_id | UUID FK | users.id; DELETE/UPDATE RESTRICT |
| short_code | VARCHAR(40) UK | COLLATE C, 3–40, alphanumeric/ขีดภายใน |
| original_url | TEXT | HTTP/HTTPS validation ใน service/RPC |
| created_at | TIMESTAMPTZ | CURRENT_TIMESTAMP |
| click_count | BIGINT | >=0; default 0 |
| last_clicked_at | TIMESTAMPTZ nullable | null ก่อนมี GET |
| is_active | BOOLEAN | true |
| updated_at | TIMESTAMPTZ | CURRENT_TIMESTAMP; GET redirect อัปเดตด้วย |
| management_version | BIGINT | >=0; default 0; Admin revision |
| qr_style | JSONB | dark/light/size/shape |
| qr_version | BIGINT | >=0; default 0; QR revision |

QR default `{"dark":"#111827","light":"#ffffff","size":512,"shape":"square"}` สี opaque hex 6 หลักอิสระหลัง SQL 013 ขนาด 256/512/1024; shape square/rounded/dots รูปแบบเก่าไม่มี shape ใช้ square ไม่มี expiry/image column

## admin_audit_logs

| Field | Type / key | Constraint / default |
| --- | --- | --- |
| id | UUID PK | gen_random_uuid() |
| actor_id | UUID | snapshot; **ไม่มี FK** |
| actor_email | TEXT | snapshot |
| target_id | UUID | snapshot; **ไม่มี FK** |
| target_email | TEXT | snapshot |
| action | TEXT | CHECK allowlist |
| details | JSONB | default {}; link/before/after ตาม action |
| created_at | TIMESTAMPTZ | now() |

Actions: change_role, suspend, activate, reset_password, delete_user, change_password, link_enable, link_disable, link_delete ไม่มี FK โดยตั้งใจเพื่ออยู่ต่อหลังลบบัญชี ไม่เก็บ password/hash/token ไม่ลบอัตโนมัติหลัง 018–019

## analytics_state

| Field | Type / key | Constraint / default |
| --- | --- | --- |
| singleton | BOOLEAN PK | CHECK true; default true |
| daily_started_at | TIMESTAMPTZ | CURRENT_TIMESTAMP ตอนเริ่ม tracking |

หนึ่งแถว ไม่มี FK ใช้แสดงช่วงข้อมูลที่เก็บจริง

## link_click_daily

| Field | Type / key | Constraint / default |
| --- | --- | --- |
| link_id | UUID PK/FK | links.id ON DELETE CASCADE |
| day | DATE PK | วัน Asia/Bangkok |
| click_count | BIGINT | >0 |

Composite PK (link_id,day) หนึ่ง link มี daily rows 0..N atomic UPSERT พร้อม lifetime ไม่เก็บราย click/IP/user-agent

## short_code_reservations

| Field | Type / key | Constraint / default |
| --- | --- | --- |
| short_code | VARCHAR(40) PK | COLLATE C; CHECK เช่นเดียวกับ links |

INSERT trigger จอง code ตลอดไป ไม่ลบเมื่อ link/user หาย **ไม่มี FK** ไป links เป็น invariant ผ่าน trigger ไม่ใช่ physical relation Migration backfill จาก links และ audit link_delete ที่มี code ถูกต้อง

## link_creation_requests

| Field | Type / key | Constraint / default |
| --- | --- | --- |
| user_id | UUID PK/FK | users.id ON DELETE CASCADE |
| request_id | UUID PK | HTTP ใช้ UUID v4 Idempotency-Key |
| request_hash | TEXT | CHECK lowercase hex 64; SHA-256 normalized intent |
| link_id | UUID FK nullable | links.id ON DELETE SET NULL |

Composite PK (user_id,request_id) request อ้าง link ได้ 0..1; link ถูกอ้างจาก requests ได้ 0..N ตาม physical constraint (RPC ปัจจุบันสร้างหนึ่ง request ต่อ new link) ลบ link เหลือ tombstone ลบ user ลบ requests ไม่มี timestamp/TTL column

## Relationships

- users 1 → links 0..N (user_id, RESTRICT)
- users 1 → link_creation_requests 0..N (user_id, CASCADE)
- links 0..1 → link_creation_requests 0..N (nullable link_id, SET NULL)
- links 1 → link_click_daily 0..N (link_id, CASCADE)
- audit/analytics/reservations ไม่มี physical FK; ห้ามวาด actor_id/target_id หรือ short_code เป็น FK ที่ไม่มีจริง

## Indexes เพิ่มจาก PK/UNIQUE

| Index | Columns / predicate |
| --- | --- |
| uk_single_primary_admin | (is_primary_admin) WHERE is_primary_admin |
| idx_links_user_created | (user_id, created_at) |
| idx_links_owner_page | (user_id, created_at DESC, id DESC) |
| idx_links_owner_clicks | (user_id, click_count DESC, created_at DESC, id DESC) |
| ix_admin_audit_created | (created_at DESC, id DESC) |
| idx_link_creation_requests_link | (link_id) WHERE link_id IS NOT NULL |

ไม่มี index ที่รับประกันความเร็วทุก substring search ประเมิน query plan/ขนาดข้อมูลก่อนเพิ่ม

## Redis - แยกจาก PostgreSQL ER

| Key pattern | Value | อายุ / policy |
| --- | --- | --- |
| shorturl:session:<sid> | userId/authVersion/expiresAt | NX/EXAT ตาม JWT default 15 นาที; fail closed |
| shorturl:limit:<action>:ip:<HMAC> | counter | atomic expiry ตาม window |
| shorturl:limit:login:email:<HMAC> | counter | 15 นาที |
| shorturl:limit:create:<userId> | counter | 60 วินาที |
| shorturl:link:<code> | link UUID | 300 วินาที; cache fallback |

ไม่เก็บ password/raw JWT/Refresh Token/QR image หรือใช้ role cache แทน users.role

## Migration map

001 users/links; 002 grants/RLS; 003 exposed schema; 004 primary admin; 005 links RPC; 006 account management/audit; 007 summary; 008 owner links/revision; 009 overview; 010 retention เดิม; 011 custom names; 012 QR settings; 013 unrestricted colors; 014 shapes; 015 daily/dashboard; 016 filters/index; 017 reservations/idempotency; 018 ยกเลิก cron; 019 ลบ cleanup function

ใช้ definition สุดท้ายตามลำดับ ไม่ใช้ไฟล์เก่าโดด ๆ เป็น schema สุดท้าย ห้ามรัน migration ซ้ำเพราะอัปเดตเอกสาร
