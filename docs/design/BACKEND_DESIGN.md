> สถานะระบบจริง 2026-10-15: Auth ใช้ HttpOnly cookies, Short URL/Redirect/QR/History และ Admin read ทำงานแล้ว ดูสัญญา API ล่าสุดใน backend/README.md และ SQL 001–005 ส่วนเนื้อหาด้านล่างเป็นแบบก่อนพัฒนา ไม่ใช่รายการฟังก์ชันที่เปิดใช้ทั้งหมด

> อัปเดตการเชื่อมต่อ 2026-10-15: แอปใช้ React → Express → Supabase SDK ผ่าน HTTPS → PostgreSQL และ Express → Redis ข้อกำหนดด้าน direct pg/private schema ที่ขัดกับส่วนนี้เป็นแบบเดิม ใช้ SUPABASE_URL และ SUPABASE_SECRET_KEY เฉพาะ Backend, schema app เปิดใน Data API พร้อม RLS และ grants เฉพาะ service_role ตาม backend/sql/002_supabase_data_api.sql ไม่ใช้ Supabase Auth; Express ยังต้องตรวจ JWT/role/ownership เอง service_role bypass RLS จึงห้ามส่งให้ React งาน atomic/หลายคำสั่งต้อง PostgreSQL function ผ่าน RPC; SQL ตัวอย่างด้านล่างเป็นตรรกะฐานข้อมูล ไม่ใช่คำสั่ง pg ใน Node ดูขั้นตอนติดตั้งล่าสุดใน README SDK preflight ตรวจตาราง users/links จริง ไม่ใช้ SELECT 1

# Backend Design - Short URL + Admin + Access/Refresh Tokens

สถานะ: แบบก่อนพัฒนา อัปเดต 2026-10-14. เอกสารนี้แทนที่แบบ Server-side Session เดิมทั้งหมด. ไม่มี API, Frontend application, PostgreSQL หรือ Redis ที่สร้างจริง.

## 1. ขอบเขตที่ยืนยัน

React; Node.js + Express; PostgreSQL; Redis. User สมัคร/Login สร้าง Short URL/QR ดูประวัติและจำนวนเปิดของตนเอง. Admin ดูจำนวน/รายชื่อผู้ใช้ ค้นหาบัญชี/ลิงก์ อ่านข้อมูล จัดการ Role ปิดเปิดบัญชี/ลิงก์ บังคับ Logout ทุก Login ของผู้ใช้ เปลี่ยน URL ปลายทาง และดูประวัติการแก้ไข.

ไม่มีระบบรีเซ็ตรหัสผ่าน, email verification, Admin dashboard ตั้งค่าทุกอย่าง, click_events, qr_codes, roles table, ลบผู้ใช้หรือลิงก์, custom alias หรือวันหมดอายุลิงก์. จำนวนข้อมูลหลักยัง users/links. ไม่เปิดเผย password_hash, Access/Refresh Token, Redis key หรือ signing secret ใน API/UI.

## 2. Authentication ใหม่

- Access Token: signed JWT อายุ 15 นาที; React memory เท่านั้น ไม่ localStorage/sessionStorage และไม่ PostgreSQL. ส่ง Authorization: Bearer. HTTPS ทุกคำขอ.
- JWT claims: sub = user UUID string, fid = login-family ID, ver = auth_version string, jti, iat, exp, iss, aud. ไม่ใช้ role claim เป็นแหล่งสิทธิ์. Pin algorithm HS256 และ secret random >=32 bytes; ตรวจ signature, exp, issuer, audience, sub/fid/ver รูปแบบและอายุสูงสุด. ไม่ยอมรับ alg:none/algorithm จาก client.
- Refresh Token: opaque random 32 bytes พร้อม family ID; Cookie HttpOnly, Secure บน production, SameSite=Lax, host-only, Path=/api/auth. อายุรวม 7 วันแบบ absolute จาก Login; rotation ไม่ขยาย deadline.
- Redis D3: เก็บ SHA-256 hash ของ Refresh Token + userId, familyId, authVersion, expiresAt, state, used-token hashes สำหรับ reuse detection. ไม่เก็บ Access Token/raw Refresh Token. Token entropy สูงจึงใช้ SHA-256 สำหรับ lookup ได้ ต่างจากรหัสผ่านที่ต้องใช้ Argon2id.
- Register hash password ที่ Backend ด้วย Argon2id (เริ่มขั้นต่ำ memory 19456 KiB, time=2, parallelism=1; benchmark host). อีเมล trim/lowercase ตามนโยบายบัญชี, UNIQUE; Password 12-128 ตัว ไม่ trim/log. Register รับเพียง email/password และบังคับ role=user, is_active=TRUE. ไม่ auto-login.
- Login normalize Email ด้วย trim().toLowerCase() ก่อน validate และค้นหาบัญชี; verify password + บัญชี active; สร้าง fid ใหม่และเก็บ Redis ก่อนตอบ Access/Refresh Cookie. ออก CSRF token ใหม่หลัง Login. ไม่มี req.session/express-session และไม่มี Session ID Cookie เดิม.

## 3. Role/สถานะมีผลทันทีอย่างไร

JWT เก่าไม่เปลี่ยนเองเมื่อ PostgreSQL เปลี่ยน. ทุก protected request ทำ verify JWT → lookup active Redis family → SELECT id, role, is_active, auth_version FROM app.users WHERE id=$1 → compare JWT ver + family ver + users.auth_version → authorize role/ownership.

Role ล่าสุดมาจาก PostgreSQL ทุก request; demotion มีผลคำขอถัดไป แม้ Access Token ยังไม่หมดอายุ. นี้เป็น PK lookup หนึ่งครั้ง ไม่ใช่เก็บ Token ใน PostgreSQL; ห้ามรับรองว่าจะเร็วเสมอ ต้องวัดจริง. ไม่ cache role/status แบบไม่ invalidate.

ปิดบัญชีหรือ Admin force logout: transaction UPDATE is_active/auth_version ตามงาน; auth_version เพิ่มเพื่อให้ Token เก่าทุก family ไม่ผ่านทันทีเมื่อ commit. Best-effort revoke Redis families เพิ่มเติม; ถ้า Redis revoke ล้มเหลว users.auth_version ยังกัน Token เก่า แต่ UI ต้องรายงานผล cleanup จริง. เปิดบัญชีอีกครั้งไม่ทำให้ Token เก่ากลับมาใช้ได้.

Role change ไม่จำเป็นต้อง force logout: API อ่าน role ล่าสุด. การแสดงปุ่ม React ใช้ /api/auth/me เป็น UX เท่านั้น; Backend เป็นผู้ตัดสินสิทธิ์. Redis ล่ม → protected APIs 503 fail closed; PostgreSQL ล่ม → protected APIs 500. Public Redirect แยกและไม่อ่าน Redis.

## 4. Refresh และ Logout

Refresh: POST /api/auth/refresh พร้อม Cookie + CSRF. ตรวจ Cookie format, family, expiresAt, current hash; ตรวจ users active/version ล่าสุด. Rotation ต้อง atomic ใน Redis (Lua หรือ WATCH/MULTI ที่ออกแบบ atomic CAS) เปรียบเทียบ hash เดิมก่อนสลับเป็น hash ใหม่ และบันทึก consumed hash พร้อม TTL ที่เหลือ. คืน Access ใหม่และ Refresh Cookie ใหม่หลัง Redis commit.

พบ consumed hash ที่ถูกใช้ซ้ำ → revoke family และตอบ 401. Hash ที่ไม่ใช่ current และไม่อยู่ consumed set → 401 โดยไม่ revoke arbitrary family ป้องกันคนเดา fid แล้วทำให้ผู้อื่นหลุด. Refresh cookie ไม่มีวันส่งให้ frontend JavaScript อ่าน.

React refresh single-flight และ queue requests. Browser หลาย tab ต้อง serialize refresh ผ่าน Web Locks/BroadcastChannel; ไม่ broadcast raw Refresh Token (Cookie shared). ตรวจ Cookie ล่าสุดขณะได้ lock. ห้าม retry refresh POST อัตโนมัติเมื่อ network timeout เพราะ rotation อาจ commit แล้ว. หาก request/response ขาดกลางทางและตรวจพบ reuse อาจต้อง Login ใหม่; รายงานตรง ไม่ใช้ grace period ที่ทำให้ตรวจ replay คลุมเครือ.

Logout: POST /api/auth/logout พร้อม Refresh Cookie + CSRF → verify family/hash → revoke family → clear Cookie path=/api/auth → React clear Access. Access JWT เก่ายังมี signature ถูกต้อง แต่ family check ทำให้ใช้ไม่ได้ทันที. หมดอายุ/ไม่มี Cookie: ตรวจ Origin แล้ว clear และตอบ 204. Redis failure 503 ไม่อ้างว่า revoke สำเร็จ. Admin force logout ใช้ auth_version สำหรับทุก Login; User Logout ปกติยกเลิกเฉพาะ family ปัจจุบัน.

## 5. Cookie และ CSRF (ไม่ใช้ Session เดิม)

Same-origin HTTPS เป็น baseline. Bearer APIs (Create, History, Admin) ไม่ใช้ Refresh Cookie เพื่อ authenticate จึงไม่ใช่ ambient Cookie authentication; ตรวจ Origin/Content-Type และไม่เปิด CORS wildcard. Refresh Cookie ใช้เฉพาะ /api/auth.

Register/Login/Refresh/Logout ใช้ signed double-submit CSRF. GET /api/auth/csrf ออก nonce random + expiry + HMAC signed token, ตั้ง CSRF Cookie และคืน token ให้ React memory; token ไม่ใส่ URL/log. pre-login token อายุ 10 นาที. หลัง Login token bound กับ fid และ absolute refresh expiry. Cookie CSRF เป็น HttpOnly/Secure/SameSite=Lax/Path=/api/auth; React อ่าน token จาก JSON ไม่อ่าน Cookie.

POST: ตรวจ exact Origin=APP_ORIGIN, Cookie/header X-CSRF-Token ตรงกันแบบ constant-time, HMAC/expiry และ binding กับ verified fid สำหรับ Refresh/Logout. Login/Register ใช้ pre-login token ไม่ใช่ Access Token. CSRF invalid 403. เปลี่ยน token หลัง Login; Refresh rotation ใน family เดิมไม่เปลี่ยน fid. CSRF bootstrap เมื่อมี refresh cookie ต้องตรวจ family/hash ก่อนออก bound token; invalid cookie ออก anonymous tokenสำหรับLoginเท่านั้น. Rate-limit bootstrap ก่อนสร้าง nonce/cookie.

Token signature HMAC ใช้ secret แยก JWT signing secret. ห้ามใช้ unsigned naive double-submit ที่ยอม cookie injection. ไม่เชื่อ token ที่ client เลือกเอง. Secure flag off ได้เฉพาะ local development HTTP. trust proxy เป็นขอบเขตที่เชื่อถือจริง. Remove old Session Cookie ใน migration ทั้ง server/client.

## 6. User Processes

1.0: originalUrl + Access → JWT/Redis/users check → user_id=sub ที่ตรวจครบ → URL HTTP/HTTPS → Base62 random8 → INSERT links. UNIQUE COLLATE "C" ตัดสินชน; retryสูงสุด5 attemptsรวมครั้งแรก เฉพาะ uk_links_short_code. URLเดิมสร้างรายการใหม่ได้. คืนshortUrlหลังcommit. ไม่รับrole/user_idจากbody.

2.0: Reactสร้างภาพจากShort URLที่APIคืน; PUBLIC_BASE_URLมาจากBackend. ดู/ดาวน์โหลดซ้ำไม่ INSERT links/qr. QRจากHistory GET /api/links/:id ใหม่ ผ่าน3.0ก่อน. สแกนQRเป็นpublic GETเข้า4.0.

3.0: JWT/Redis/users check → WHERE user_id=$1 จากvalidated identity; detailเพิ่มAND id=$2. คนอื่น/ไม่พบ404เหมือนกัน. คืนoriginalUrl,shortUrl,count,createdAt,lastClickedAt,isActive,updatedAt. Pagination20max100 ORDER BY created_at DESC,id DESC. ไม่ให้Userแก้ปลายทาง/สถานะ/Role.

4.0: GET /r/:shortCode ไม่มีAuth/Redis → SELECT active link → ไม่พบ/ปิดลิงก์404 → SQL atomic count+last_clicked_at → rowCount = 1แล้ว302. UPDATEต้องมีWHERE is_active=TRUEเพื่อรับมือAdminปิดระหว่างSELECTกับUPDATE. DB/UPDATEerror500ไม่Redirect. HEADแยกrouteและไม่นับ. Cache-Control:no-store และCDN bypass /r.

~~~sql
UPDATE links
SET click_count = click_count + 1, last_clicked_at = CURRENT_TIMESTAMP
WHERE id = $1 AND is_active = TRUE
RETURNING original_url;
~~~

นับprocessed GETรวมBot/ซ้ำ;ไม่ใช่unique visitorsหรือหลักฐานปลายทางโหลดสำเร็จ. PostgreSQLcommitกับHTTPdeliveryไม่เป็นtransactionเดียว;connectionหลุดหลังcommitอาจนับแล้ว. ไม่retryUPDATEที่ผลcommitไม่แน่นอน. Adminเปลี่ยนURLหลังSELECT: in-flight requestอาจใช้URLเดิม แต่คำขอถัดไปอ่านใหม่;ใช้ URL ที่ UPDATE RETURNING ส่งกลับ เพื่อลดช่องว่าง SELECT/UPDATE; ยังไม่รับรองว่าไม่มี in-flight request ไปปลายทางก่อนหน้าเมื่อ Admin แก้ URL.

## 7. 6.0 Admin Management

Admin endpointsทุกอันต้องผ่านJWT/Redis/users lookupแล้วrole===admin. Userที่ส่งrole/admin headersได้403. จำนวนผู้ใช้แยกtotal/active/disabled;จำนวนAdminระบุแยก. /usersคืนid,email,role,isActive,createdAt,updatedAtเท่านั้น ไม่hash/token.

Search usersโดยemail;search linksโดยshortCode/originalUrl/userId. Paginationและlimit. AdminดูLinksของบัญชีอื่นได้อย่างเจตนาเฉพาะnamespaceAdmin;User APIยังowner-filterเสมอ.

จัดการRole user/admin;ปิดเปิดบัญชี. ป้องกัน demote/disable Admin คนสุดท้ายด้วย transaction + pg_advisory_xact_lock สำหรับทุกการเปลี่ยน role/is_active ก่อนอ่านจำนวน active admins และ UPDATE; lock เป็น transaction-scoped และต้องใช้ key เดียวกันทุก instance. ไม่มีการลบบัญชี. BootstrapAdminครั้งแรกผ่านone-time deployment command/configที่ควบคุมและhashpassword ไม่มีpublicAdminregistrationและไม่กำหนดAdminด้วยemailในโค้ด.

ปิดเปิดLinksและแก้original_urlผ่านvalidationเดียวกับCreate. ไม่เปลี่ยนshort_code,id,user_id. QR/Short URLเดิมยังอยู่;countไม่resetเมื่อแก้ปลายทาง. updated_atแก้เฉพาะmetadata ไม่เปลี่ยนทุกคลิก. Adminไม่แก้click_countหรือpasswordในรอบนี้.

ForceLogoutทุกfamilyของtargetเพิ่มusers.auth_version. ตรวจRoleอีกครั้งบนคำขอถัดไป. คืนผลstatechangeจริง ไม่claimRedis cleanupสำเร็จเมื่อfailed. สถานะบัญชีไม่ปิดลิงก์ของผู้ใช้อัตโนมัติ: AdminจัดการLinksแยก เพื่อไม่ให้โบรชัวร์หยุดโดยไม่ตั้งใจ.

## 8. PostgreSQL ERD / Physical schema

users: id UUID PK DEFAULT gen_random_uuid(); email VARCHAR(254) NOTNULL UNIQUE; password_hash VARCHAR(255) NOTNULL; created_at TIMESTAMPTZ NOTNULL DEFAULT CURRENT_TIMESTAMP; role VARCHAR(10) CHECK(role IN ('user','admin')) NOTNULL DEFAULT 'user'; is_active BOOLEAN NOTNULL DEFAULT TRUE; auth_version BIGINT NOTNULL DEFAULT0; updated_at TIMESTAMPTZ NOTNULL DEFAULT CURRENT_TIMESTAMP.

links: id UUID PK DEFAULT gen_random_uuid(); user_id UUID NOTNULL FK; short_code VARCHAR(10) COLLATE "C" NOTNULL UNIQUE (สร้างจริง8ตัว); original_url TEXT NOTNULL; created_at TIMESTAMPTZ NOTNULL DEFAULT CURRENT_TIMESTAMP; click_count BIGINT NOTNULL DEFAULT0; last_clicked_at TIMESTAMPTZ NULL; is_active BOOLEAN NOTNULL DEFAULT TRUE; updated_at TIMESTAMPTZ NOTNULL DEFAULT CURRENT_TIMESTAMP.

FK links.user_id→users.id ON DELETE RESTRICT ON UPDATE RESTRICT. Index links(user_id,created_at). Usersหนึ่งคนมีLinks0..N;แต่ละLinkมีownerexactly1. ไม่มีroles table. Tokenอยู่Redisไม่PostgreSQL.

updated_atเขียนexplicitตอนAdminแก้metadata/บัญชี ไม่ใช้ON UPDATEที่ทำให้clickcounterเปลี่ยนเวลาการแก้ปลายทาง. PostgreSQL บน Supabase, TIMESTAMPTZ + UTC serialization; IDs เป็น UUID strings ใน JSON/JWT; count/auth_version เป็น decimal strings เพื่อไม่เสีย JS Number precision. Statementทุกอันparameterized;ไม่ต่อSQLจากrole/search/query. ORDER BYใช้allowlistfixed ไม่bindidentifierด้วยplaceholder. least-privilege DB user;Secret/TLS/private network. การไม่เก็บTokenในPostgreSQLไม่ได้ป้องกันSQLInjectionหรือทำให้DBรั่วไม่มีผล:email/password_hashยังต้องป้องกัน.

## 9. API contract (ยังไม่ได้พัฒนา)

GET /api/auth/csrf; POST /api/auth/register; POST /api/auth/login; POST /api/auth/refresh; POST /api/auth/logout; GET /api/auth/me.

POST /api/links; GET /api/links; GET /api/links/:id. Bearer required;ไม่มีUserPATCH.

GET /api/admin/stats; GET /api/admin/users; GET /api/admin/users/:id; PATCH /api/admin/users/:id (allowlist role,isActive); POST /api/admin/users/:id/revoke-tokens; GET /api/admin/links; GET /api/admin/links/:id; PATCH /api/admin/links/:id (allowlist originalUrl,isActive); GET /api/admin/audit-log (storageตามหัวข้อ10).

GET/HEAD /r/:shortCode public. Invalid/inactive404;DB500;success302.

401 invalid/expired/revokedToken;403valididentityแต่ไม่Admin/CSRF;404notfoundหรือUserเข้าถึงLinkคนอื่น;409duplicateemail/lastAdminconflict;422fieldvalidation;429rate;500DB/counterfailure;503Redis/auditdependencyunavailable. Error JSON {error:{code,message},requestId};ห้ามstack/hash/SQL/credentials. JSONlimit16KiB;unsupportedcontent415;malformed400;bodylarge413.

## 10. Audit Log - รอการเลือก Storage

ฟีเจอร์ดูประวัติAdminอยู่ในขอบเขตที่ยืนยัน. ต้องบันทึกactorId,action,targetType,targetId,ก่อน/หลังเฉพาะmetadata,เวลาUTC,requestId,ผลลัพธ์. ไม่บันทึกpassword/token/hash/session/Cookie/secret;OriginalURLอาจมีqueryลับ ต้องกำหนดredactionก่อนlog.

ตัวเลือกA: audit_logsในPostgreSQL บันทึกในtransactionเดียวกับการแก้users/links ให้rollbackพร้อมกันเมื่อauditwritefailed. เป็นตารางที่สาม จึงรอการยืนยันเพราะขอบเขตเดิมมีสองตาราง.
ตัวเลือกB: AuditLogภายนอกบนpersistent storage แยกD4 ไม่เพิ่มPostgreSQLtable. ต้องออกแบบdurability/retention/searchและรับข้อจำกัดไม่มีatomiccommitข้ามSQLกับlog. RedisTTLใช้แทนประวัติถาวรไม่ได้.

ก่อนstorageยืนยัน ยังไม่อ้างว่าERD/AuditLogครบหรือสร้างบริการจริง. ส่วนTokenและAdminmetadataไม่ขึ้นกับตัวเลือกนี้.

## 11. Validation, Rate limits, Redis และ Deploy

URL: WHATWG absoluteURLHTTP/HTTPS;ไม่มีcredentials/CRLF;max4096UTF8bytes;รักษาpath/query/fragment. ปฏิเสธlocalhost/private literalIPและself /r loop;ไม่fetchปลายทาง ไม่อ้างว่าป้องกันphishing/malware. originalUrlไม่unique. PublicbaseoriginจากconfigHTTPS ไม่มีpath/credential ไม่ใช้Hostheader.

Shortcodeใช้node:crypto.randomIntกับBase62 ไม่Math.random/modulo bias. จำกัด5attempts;DBerrorอื่นไม่retry.

Rate limits: authLogin10/min/IP+10fail/15min/account;register5/hour/IP;refresh30/min/family;create30/min/user;csrf60/min/IP;Adminwrites30/min/admin. sharedRedisnamespace rl: แยกauth:. ไม่limitpublicredirectต่ำจนQRใช้ไม่ได้.

RedisrequiresTLS/auth/private network, boundedtimeout/reconnect, readiness, noMemoryStorefallback. authfamilyTTLจนexpiresAt7วัน;rotationและreadsไม่ขยายdeadline;consumedhashesตามhorizonเดียวกัน. noeviction+memorybudget;fullRedis503. Persistence/AOF/volumeต้องทดสอบเพื่อLoginไม่หายหลังRedisrestart. PostgreSQLrole/statusและauth_versionยังเป็นauthorityหลังrestart.

Environment: NODE_ENV,PORT,DATABASE_URL, DATABASE_POOL_MAX, REDIS_URL,JWT_ACCESS_SECRET,JWT_ISSUER,JWT_AUDIENCE,CSRF_SECRET,ACCESS_TTL_SECONDS=900,REFRESH_TTL_SECONDS=604800,PUBLIC_BASE_URL,APP_ORIGIN,TRUST_PROXY,RATE_LIMIT_*. ไม่มีSESSION_SECRET/SESSION_TTL. Secretsไม่commit. Reactไม่มีsigningsecretในbuild.

Same-originHTTPS: /api/auth refreshCookie; /api/linksและ/api/adminBearer; /rpublic;SPA fallbackท้ายสุด. Proxytrustตรงtopology. Accessหายหลังreload ให้ReactbootstrapCSRFแล้วrefreshตามCookie;refreshfail401ไปLogin ไม่วนไม่สิ้นสุด. Browsermultitabต้องทดสอบrace. Publicbase/QRทดสอบมือถือจริง. Hostต้องรองรับNode+PostgreSQL+RedisและAuditstorageที่จะเลือก.

## 12. Acceptance tests ที่ต้องทำหลังมีระบบจริง

- Registerส่งrole=adminถูกreject/ignoreและยังUser;ไม่มีhash/tokenในresponse.
- LoginออกJWT15min/opaqueRT7d;RefreshHashเท่านั้นในRedis;ไม่มีTokenในPostgreSQL.
- Tampered/expired/wrongissuer/audienceJWT401;Redisdown503;Public /rยังได้.
- Refreshrotateatomic,usedtokenreuse revokefamily;randomwrongtokenไม่DoSfamily;multitabserialized.
- Logoutfamilyทันที;AdminforceLogoutทุกfamilyผ่านauth_version;rolechange/disableมีผลคำขอถัดไป.
- UserทุกAdminroute403;Userdetail/QRคนอื่น404. Adminไม่เห็นpassword/hash/token.
- LastAdminไม่ถูกdemote/disableแม้concurrentrequests. Role/isActiveไม่massassignจากRegister.
- Adminปิดลิงก์404ไม่เพิ่มcount;เปิดใหม่ใช้QRเดิม;เปลี่ยนURLไม่เปลี่ยนshortCode/count.
- SQLinjectioninputsไม่เป็นSQL;URLvalidation/collisionretry5/Atomiccounter/HEAD/no-storeตรงcontract.
- Auditการแก้ไขครบตามstorageที่ยืนยัน;ไม่เก็บcredential;permissionadminonly.
- DFDscenariosไม่Register→Loginทุกครั้ง;Refreshแยก;Adminauthเช็คล่าสุด.

## References

[OWASP JWT/REST Security](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html), [RFC9700 Refresh rotation/reuse](https://www.rfc-editor.org/rfc/rfc9700.html), [OWASP CSRF](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html), [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html), [Redis persistence](https://redis.io/docs/latest/management/persistence/).

## 13. PostgreSQL บน Supabase - ข้อกำหนดแทน MySQL (2026-10-15)

ใช้ Supabase เป็นบริการ PostgreSQL เท่านั้น ไม่ใช้ Supabase Auth; Access/Refresh Token เป็นของ Express + Redis ตามแบบนี้. บัญชี users ของเราเป็น app.users ไม่ใช่ auth.users ของ Supabase. ไม่ใช้ Supabase publishable/service_role key ใน React เพื่อข้าม authorization.

- D1/D2 เป็น PostgreSQL บน Supabase; D3 เป็น Redis เช่นเดิม. Redis/Audit Storage ไม่เปลี่ยนจากการย้ายฐานข้อมูล.
- ใช้ private schema app ไม่ expose ผ่าน Supabase Data API; ปิด/ไม่ grant anon และ authenticated ให้ app schema. Node เชื่อมผ่าน PostgreSQL driver pg และ role least-privilege. หากเลือก public schemaภายหลังต้อง RLS และ grants ให้เหมาะสมก่อนเปิด API; ไม่อ้างว่า RLS ของ Supabase ตรวจ JWT ของเราให้เอง.
- ID: users.id และ links.id ใช้ UUID PRIMARY KEY DEFAULT gen_random_uuid() (UUID v4); links.user_id ใช้ UUID NOT NULL เป็น FK. ไม่มี IDENTITY หรือ CHECK(id>0). click_count และ auth_version ยังคง BIGINT พร้อม CHECK >=0.
- Role: VARCHAR(10) + CHECK IN ('user','admin') DEFAULT 'user';ไม่ต้องสร้าง PostgreSQL enum type หรือ roles table. BOOLEAN ใช้ TRUE/FALSE ไม่เลข1/0.
- วันเวลา: TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP; serialize ISO8601 UTC. updated_atเขียนexplicitเมื่อAdminแก้metadata ไม่มี ON UPDATE อัตโนมัติ.
- Shortcode VARCHAR(10) COLLATE "C" UNIQUE + alphabet check; generator/routeใช้8ตัว;เปรียบเทียบcase-sensitive.
- Driver pg ใช้ placeholders $1,$2,... ไม่ ?; query parameterized เช่นเดิม. BIGINTคืนstrings. INSERT ... RETURNING id,... และ UPDATE ... RETURNING original_url;ใช้ result.rowCount.
- Collision: SQLSTATE 23505 และ error.constraint === 'uk_links_short_code' เท่านั้น;5attemptsในautocommit INSERT แต่ละรอบ. หากภายหลังทำtransactionต้อง rollback/savepoint ก่อนretry ไม่ใช้transactionที่PostgreSQLabortแล้ว. Emailซ้ำตรวจconstraint uk_users_email เป็น409ไม่retrycode.
- ForeignKeyON DELETE RESTRICT; indexต้องสร้างแยกด้วย CREATE INDEX ไม่ใช้ inline INDEX แบบMySQL.

### Physical SQL สำหรับนำไปสร้าง Migration ภายหลัง (ยังไม่ได้รัน)

~~~sql
CREATE SCHEMA IF NOT EXISTS app;

CREATE TABLE app.users (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 email VARCHAR(254) NOT NULL,
 password_hash VARCHAR(255) NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 role VARCHAR(10) NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
 is_active BOOLEAN NOT NULL DEFAULT TRUE,
 auth_version BIGINT NOT NULL DEFAULT 0 CHECK (auth_version >= 0),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT uk_users_email UNIQUE (email),
 CONSTRAINT ck_users_email_normalized CHECK (email = lower(btrim(email)))
);

CREATE TABLE app.links (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id UUID NOT NULL,
 short_code VARCHAR(10) COLLATE "C" NOT NULL,
 original_url TEXT NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 click_count BIGINT NOT NULL DEFAULT 0 CHECK (click_count >= 0),
 last_clicked_at TIMESTAMPTZ NULL,
 is_active BOOLEAN NOT NULL DEFAULT TRUE,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT uk_links_short_code UNIQUE (short_code),
 CONSTRAINT ck_links_code_alphabet CHECK (short_code ~ '^[A-Za-z0-9]+$'),
 CONSTRAINT fk_links_user FOREIGN KEY (user_id) REFERENCES app.users(id)
  ON DELETE RESTRICT ON UPDATE RESTRICT
);
CREATE INDEX idx_links_user_created ON app.links(user_id, created_at);

UPDATE app.links
SET click_count = click_count + 1, last_clicked_at = CURRENT_TIMESTAMP
WHERE id = $1 AND is_active = TRUE
RETURNING original_url;
~~~

ทุกqueryระบุapp.users/app.linksหรือsearch_pathที่กำหนดแน่นอน;ไม่ใช้search_pathจากclient. ตัวอย่างนี้ยังไม่มีaudit_logsเพราะStorageยังรอเลือก.

### Connection และ Deploy

Environment: DATABASE_URL, DATABASE_POOL_MAX (เริ่ม5),  REDIS_URL และToken/CSRFconfigเดิม. ห้ามมีDBURL/password/service_roleในVite envสาธารณะ. TLSตรวจcertificate;ไม่แก้เป็นrejectUnauthorized:falseเพื่อผ่านปัญหา. เลือกdirect connectionหากhostรองรับIPv6 หรือ Supabase Session PoolerหากhostIPv4;รับค่าจากConnectหน้าproject ไม่เดาhost. Backendแบบlong-runningExpressใช้SessionPoolerได้. หากใช้TransactionPoolerต้องระวังprepared statementและให้แต่ละtransactionจับpgclientเดียวตั้งแต่BEGINถึงCOMMIT.

โควตาFreeและการพักprojectต้องตรวจในบัญชีจริงก่อนส่งงาน. ไม่สร้างSupabase project/table/APIในรอบแก้เอกสารนี้.

References: [PostgreSQL UUID](https://www.postgresql.org/docs/current/datatype-uuid.html), [PostgreSQL constraints](https://www.postgresql.org/docs/current/ddl-constraints.html), [Supabase PostgreSQL](https://supabase.com/docs/guides/database/overview), [Supabase connection options](https://supabase.com/docs/guides/database/connecting-to-postgres).

### UUID ID Contract
ใช้ UUID v4 ที่ PostgreSQL สร้างด้วย gen_random_uuid() สำหรับ users.id และ links.id; ไม่รับ ID ใหม่จาก client. links.user_id มาจาก identity ที่ Backend ตรวจสอบแล้ว. JWT sub, Redis user reference, route link_id และ SQL parameters ใช้ UUID string ไม่แปลงเป็น Number/parseInt. Validate UUID syntax ก่อน query (ผิดรูปแบบตอบ 422); ownership query ยังคงต้องตรวจทั้ง id และ user_id. UUID ไม่แทน Authorization. short_code ยังเป็น Base62 สุ่ม 8 ตัวแยกจาก UUID.

### Email Normalization Contract
Register และ Login ใช้กติกาเดียวกัน: ตรวจว่า email เป็น string → trim ช่องว่างหัวท้าย → toLowerCase → validate รูปแบบ/ความยาวไม่เกิน 254 → query แบบ parameterized. Register บันทึกเฉพาะค่าที่ normalize แล้ว; UNIQUE(email) ป้องกันบัญชีซ้ำ แม้สมัครพร้อมกัน; SQLSTATE 23505 constraint uk_users_email ตอบ 409. PostgreSQL CHECK ck_users_email_normalized บังคับค่าที่บันทึกเป็น lower(btrim(email)) ป้องกันการเขียนข้าม Backend โดยไม่ normalize. กำหนด Email บัญชีเป็น case-insensitive ทั้งชื่อและโดเมนตามนโยบายระบบนี้. ไม่ลบจุดหรือ +suffix และไม่แก้ช่องว่างภายในเพื่อเดา Email ที่ผู้ใช้ตั้งใจ; Email ที่ไม่ผ่าน validation ตอบ 422. Password คงค่าที่กรอกทุกตัว ไม่ trim/ไม่ lowercase. Admin ค้นหา Email ใช้การ normalize แบบเดียวกัน.
Validation ที่ต้องทดสอบเมื่อเริ่มพัฒนา: สมัคร User@Example.com แล้ว Login ด้วย user@example.com ได้; สมัครค่าต่าง case หรือมีช่องว่างหัวท้ายซ้ำได้ 409; password ต่าง case ยังไม่ผ่าน; ไม่รวม user+tag@example.com กับ user@example.com เป็นบัญชีเดียวกัน.

