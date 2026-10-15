# Design Review - Token Authentication + Admin

2026-10-14. ยังเป็นเอกสาร/แผนภาพ ไม่มี API/PostgreSQL/Redis จริง.

## ขอบเขตใหม่ที่ผู้ใช้ยืนยัน

เปลี่ยน Server-side Session เป็น Access JWT + rotating opaque Refresh Token. Access ใน React memory ไม่PostgreSQL; Refresh Cookie HttpOnly และRedisเก็บHash. เพิ่ม6.0Adminสำหรับผู้ใช้/สิทธิ์/ลิงก์/forceLogout/ประวัติการแก้ไข. ไม่เพิ่มresetpasswordหรือroles table.

## Critical

- JWT Role ไม่เปลี่ยนทันทีเมื่อDBเปลี่ยน: ไม่ตัดสินRoleจากJWT;ตรวจusers role/status/auth_versionล่าสุดทุกprotected request.
- LogoutเฉพาะRefreshไม่ยกเลิกAccessJWTทันที:ทุกrequestต้องตรวจRedisfamilyactive.
- AdminforceLogout/disableต้องไม่เกิดช่องว่างSQL/Redis:เพิ่มauth_versionในPostgreSQL;Tokenเก่าถูกปฏิเสธแม้Rediscleanupfailed.
- PublicRegisterห้ามสร้างAdminจากbody;ทุกAdminendpointตรวจBackendroleล่าสุด;Userownershipยังต้องตรวจ.

## Major

- Refreshต้องrotateatomicและdetectusedhashreuse;invalidrandomhashห้ามrevokefamilyของคนอื่น.
- CSRFต้องออกแบบใหม่ ไม่ใช้req.sessionหลังเปลี่ยนToken;ใช้signed/bounddouble-submitสำหรับCookie-auth endpoints.
- RedisfamilyTTL7วันabsolute;JWT15นาที;multitabrefreshserializeและห้ามblindretry.
- Adminปิดลิงก์:SELECT/UPDATEactive;404ไม่นับ. แก้URLไม่เปลี่ยนshort_code/count.
- ป้องกันAdminคนสุดท้ายในtransaction;BootstrapAdmincontrolledไม่publicregistration.
- AuditStorageยังไม่เลือก:รอคำตอบว่าจะเพิ่มaudit_logsหรือเก็บภายนอก ห้ามอ้างว่าประวัติAdminครบแล้ว.

## Minor

- เพิ่มrole/is_active/auth_version/updated_atในusers;is_active/updated_atในlinks. updated_atไม่เปลี่ยนทุกคลิก.
- เพิ่มRefresh/Adminscenariosโดยไม่เชื่อมRegisterLoginทุกครั้ง;PDFดาวน์โหลดต้องตรงแบบล่าสุด.

## สถานะเอกสาร

DFDมี6Processes และD1Links/D2Users/D3AuthTokens. AuditDataStoreยังไม่เพิ่มจนStorageยืนยัน. PostgreSQLERDยัง2ตาราง. BackendDesignแทนSessionเดิมหมดแล้ว.

## Verification

ตรวจsyntaxผ่าน. Browserตรวจ45Flows:ไม่มีendpointลอย;13scenariosถึงcardถูกต้อง;ไม่มีruntimeerror. PDFครบ6หน้า:DFD5หน้าA4และERD1หน้าA3;ตรวจภาพทุกหน้าและปรับข้อความไม่ทับเส้น. PDFแยกDFD/ERDอัปเดตเลขหน้าและเป็นเวกเตอร์ไม่มีภาพราสเตอร์. ยังไม่ทดสอบToken/SQL/Redisจริงเพราะยังไม่มีimplementation.

## Decision pending

ประวัติAdmin: audit_logsในPostgreSQLเหมาะกับTransaction แต่ขัดจำนวนสองตารางเดิม;ทางเลือกภายนอกต้องออกแบบdurability/dual-write. คำถามส่งให้ผู้ใช้แล้ว.

## PostgreSQL migration - 2026-10-15

DFD/ERDใช้PostgreSQLบนSupabaseแทนฐานข้อมูลเดิม;แปลงUNSIGNEDเป็นBIGINT+CHECK,IDENTITYแทนAUTO_INCREMENT,TIMESTAMPTZแทนDATETIME,RoleVARCHAR+CHECKและcase-sensitiveCOLLATE C. Backendเพิ่มpgplaceholder/RETURNING/23505/private schemaและconnectionTLS/pooler. AuthTokenRedis/Adminscopeเดิม;ยังไม่ได้setupหรือสร้างdatabaseจริง. AuditStorageยังรอเลือก.

ตรวจหลังแก้: JavaScript syntax ผ่าน; PDF รวม 6 หน้า, DFD 5 หน้า และ ERD 1 หน้า อัปเดตเป็น PostgreSQL แล้ว ตรวจภาพ PDF ทุกหน้าและไม่พบภาพ raster ในฉบับรวม ยังไม่ได้สร้างฐานข้อมูลหรือรัน SQL จริง

## UUID IDs — 2026-10-15
เปลี่ยน users.id, links.id และ links.user_id เป็น UUID; PK ใช้ DEFAULT gen_random_uuid() (v4), FK NOT NULL / ON DELETE RESTRICT และ cardinality เดิม. ตัด Identity/positive-ID check; JWT sub และ link_id ใช้ UUID string. ตัวนับ click_count/auth_version ยังคง BIGINT; short_code ยัง 8 ตัว. ไม่ได้สร้างฐานข้อมูลหรือ API จริง.

## Email normalization — 2026-10-15
ระบุ Register/Login/Admin email search ให้ trim + lowercase ก่อน validate/query. ERD แสดงกติกาเก็บ Email และ UNIQUE; SQL เดิมมี ck_users_email_normalized อยู่แล้ว จึงไม่เพิ่มตารางหรือเปลี่ยน auth_version/short_code. อัปเดต PDF ให้ตรงเอกสาร; เป็นข้อกำหนด ยังไม่ใช่ Backend ที่พัฒนาแล้ว.
