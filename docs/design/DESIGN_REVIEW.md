# Design Review - Implementation Traceability

อัปเดต 2026-10-16 จาก source/migrations ไม่ใช่ Production acceptance test แทนแบบเดิม Refresh Cookie และคำกล่าวว่ายังไม่มีระบบจริง

| เรื่อง | หลักฐาน | พฤติกรรมปัจจุบัน |
| --- | --- | --- |
| Auth | modules/auth, security/access-token.js | HS256 JWT + Redis session ไม่มี Cookie/Refresh |
| Current permissions | auth.service.verifyIdentity, SQL 006/008 | current role/active/auth_version และ owner scope |
| Origin/CORS | middleware/csrf.js, cors.js | exact origin + JSON + Bearer ไม่ใช่ double-submit cookie |
| Rate limit | middleware/rate-limit.js, infrastructure/deadline.js | Lua atomic/deadline/fail closed ต้องตรวจ proxy บน host |
| Diagnostics | infrastructure/redis-diagnostics.js และ tests | allowlist operation/reason ไม่ log raw secrets |
| Collision | SQL 001/011/017, links.service/repository | UNIQUE/reservation; random สูงสุด 5 attempts |
| Response loss | SQL 017 create_short_link | reuse key + intent เดิมคืน link เดิม key ใหม่สร้างซ้ำได้ |
| Redirect | SQL 015 resolve_short_link | lifetime/daily atomic; active link/owner; HEAD ไม่นับ |
| Redis outage | links.cache.js, auth.repository.js | cache fallback; auth/rate-limit fail closed |
| QR | SQL 012–014, qr.schema/renderer | settings เท่านั้น สีอิสระต้องทดสอบ scan จริง |
| History/dashboard | SQL 015–016 | scoped aggregates/filter ก่อน pagination 10 แถว |
| Admin | SQL 004/006/008, admin services | primary protection, confirmed revisions, audit |
| Retention | SQL 018–019 | audit ไม่ลบอัตโนมัติ ไม่กู้ข้อมูลเดิมที่หาย |
| CI/CD | .github/workflows/ci.yml, DEPLOY | Pages gated; Render gate เป็น Dashboard setting |

JS ในตารางอยู่ backend/src, tests อยู่ backend/tests และ SQL อยู่ backend/sql ดู [System Design](BACKEND_DESIGN.md), [Data Dictionary](DATA_DICTIONARY.md), [Diagram sources](../diagrams/README.md)

## ข้อจำกัด

- ไม่มี automatic refresh ต้อง Login ใหม่หลัง reload/expiry
- Clicks รวม bot/retry ไม่ใช่ unique visitors; HTTP response กับ DB commit แยกกัน
- ลบ link ลบ daily rows Dashboard ไม่รวมลิงก์ที่ถูกลบแล้ว
- Audit/reservations ไม่มี retention cleanup ต้องติดตามขนาดเมื่อใช้งานจริง
- Idempotency กันซ้ำเฉพาะ key เดิม Frontend เก็บ create intent ใน sessionStorage ไม่ใช่ deduplicate URL ทั่วระบบ
- สี QR อิสระไม่ได้รับประกันทุกอุปกรณ์สแกนผ่าน
- health 200 ไม่ยืนยัน Redis/DB ต้องทดสอบ Login/Create/redirect/QR/Admin บน hosting จริง
- การอัปเดตเอกสารนี้ไม่ introspect Production หรือรัน migration อ้างอิงผลรวม 001–019

## Document verification

HTML/SVG และ PDF สร้างจาก scripts/generate-design-docs.py ชุดเดียว ไม่มีการอ่าน env/ฐานข้อมูล ตรวจ field/relations เทียบ migrations, flow เทียบ source และ render PDF ตรวจ clipping/overlap การตรวจเอกสารไม่แทน E2E หรือ load tests
