# Frontend

React 19 + Vite + Tailwind CSS v4 ใช้ JavaScript/JSX แบ่งตามฟีเจอร์ เรียก API ผ่าน Express เริ่มติดตั้งจาก [README หลัก](../README.md)

## คำสั่งจาก root

```sh
npm ci
npm run dev:frontend
npm run test -w frontend
npm run build
```

npm ci ติดตั้ง workspaces/Recharts ตาม root lock แล้ว ไม่ต้องมี Supabase secret หรือ .env ของ Frontend สำหรับ proxy ปัจจุบัน

Vite เปิด http://127.0.0.1:5173 และ proxy /api, /r ไป http://127.0.0.1:3000 ใช้ hostname ให้ตรง APP_ORIGIN ของ Backend คำสั่ง `npm run preview -w frontend` ตรวจไฟล์ Build เท่านั้น ไม่ใช่ deployment configuration ของระบบเต็ม

## Routes และ flow

| Path | การใช้งาน |
| --- | --- |
| #/ | หน้าแรก กรอก URL และสร้างลิงก์ |
| #/user | Alias หน้าแรก |
| #/my-links | รายการและจัดการลิงก์ผู้ใช้ |
| #/dashboard | ภาพรวมผู้ใช้ กราฟ 7 วัน Top 5 |
| #/admin | Admin overview/users/owner links/history |

เมนูผู้ใช้เรียง **หน้าแรก → ลิงก์ของฉัน → ภาพรวม** UserLayout ใช้ร่วมกันในหน้า User; AdminLayout/guards แยกต่างหาก Admin ไป #/admin ผู้ใช้ทั่วไปไม่มีสิทธิ์เปิด Admin

สร้างลิงก์: URL → Login/สมัครหากยังไม่เข้า → Popup ตั้งชื่อหรือสุ่ม → ยืนยัน → #/my-links ไม่มีช่องตั้งชื่อบนหน้าแรกและไม่มี window.confirm ซ้ำ Draft URL/ชื่ออยู่ใน sessionStorage เฉพาะแท็บ ล้างเมื่อสร้างสำเร็จ ไม่เก็บ password/token ใน browser storage

บัญชีที่ถูก reset password ต้องผ่าน PasswordChangeGate และเข้าสู่ระบบใหม่ก่อนใช้ส่วนอื่น

## ลิงก์ของฉัน

- ตารางบนคอม รายการกระชับบนมือถือ/แท็บเล็ต: ลิงก์ ปลายทางย่อ ยอดเปิด วันที่สร้าง ปุ่มจัดการ
- กด Short URL หรือ URL ต้นฉบับเปิดได้ เฉพาะ Short URL เพิ่มยอด
- Search debounce 300ms, กรองเคยเปิด/ยังไม่เปิด วันที่สร้าง และเรียงใหม่สุด/เก่าสุด/ยอดเปิด
- Backend กรองก่อนแบ่งหน้า ดึงครั้งละ 10 ไม่โหลดทั้งหมดมากรองใน React
- เปลี่ยนเงื่อนไขกลับหน้า 1; abort request เก่าและตรวจ response key ก่อนแสดงผล
- จำนวนตรงตัวกรอง มีปุ่มล้างเงื่อนไข ไม่แสดง pagination หากไม่เกิน 10
- Popup โหลดรายละเอียดล่าสุด คัดลอก เปิด QR designer; ปิดแล้วคงหน้า/เงื่อนไขพร้อม refresh รายการ

## QR designer

เลือกสีจุด/พื้นหลังเอง ไม่มีชุดสีสำเร็จ รูปแบบ square/rounded/dots ขนาด 256/512/1024 มีตัวอย่าง debounce ไม่มีรูป/โลโก้ตรงกลาง กรอบมุมและส่วนสำคัญยังเป็นสี่เหลี่ยมเดิม

สีปรับอิสระ คำเตือน contrast ไม่ปิดกั้นการแสดง/บันทึก/ดาวน์โหลด PNG/SVG ดาวน์โหลด draft ได้โดยไม่ต้องบันทึก UI ระบุว่ายังไม่ได้บันทึก

บันทึกมีขั้นยืนยันและ revision ป้องกันอีกแท็บเขียนทับ Reset เปลี่ยนเฉพาะ draft จนกดยืนยัน ปิดโดยไม่บันทึกทิ้ง draft ระหว่างบันทึกปิดไม่ได้ QR ที่ดาวน์โหลดไปแล้วไม่เปลี่ยนตามการแก้แบบ

QR เป็น nested modal ในรายละเอียดลิงก์ ใช้ reference-counted scroll lock และ abort request/revoke blob URLs เมื่อเปลี่ยนภาพหรือปิด

## Dashboard และ Admin

User Dashboard เรียก /api/dashboard เฉพาะ aggregate บัญชีปัจจุบัน แสดง total links/clicks/clicked links, ยอดรายวัน Asia/Bangkok และ Top 5 วันก่อนเริ่มเก็บเป็น null ไม่แสดงศูนย์ วันนี้ยังไม่ครบวันและ UI ระบุเวลาเริ่มเก็บ

ใช้ **Recharts** responsive BarChart มี Tooltip/keyboard accessibility ตำแหน่งกราฟใช้ Number แต่ Tooltip/ข้อความที่อ่านได้/ยอดรวมคง decimal string และ BigInt โหลด Recharts เป็น lazy chunk เฉพาะ Dashboard เคารพ prefers-reduced-motion

Admin มีสรุป/โดนัท ผู้ใช้ จัดการลิงก์ตามเจ้าของ และ Audit Log การเขียนมีขั้นยืนยัน สิทธิ์และสถานะถูกตรวจ Backend ไม่ใช่แค่ซ่อนปุ่ม UI

## โครงสร้าง

```text
src/
  app/
    routes.jsx, navigation.js, providers.jsx
    guards/               PublicGuard, AdminGuard
    layouts/              UserLayout, AdminLayout
  features/
    home/                 Landing, create flow, navigation
    auth/                 API, context, forms, password gate
    links/                History/filter/table, detail/QR dialogs
    dashboard/            Aggregate API, chart data, Recharts UI
    admin/                APIs, views, actions, audit
  shared/
    api/                  Bearer/JSON/Blob, expiry, timeout, pagination
    ui/                   Button, Input, Modal, Icon, Card, Pagination, DonutChart
    hooks/                Scroll reveal, reduced motion
    components/           PageShell
  styles/                 tokens.css, base.css, motion.css
```

Page → Hook → feature API → shared client → Backend สี/ฟอนต์/ระยะห่าง/พื้นหลังกลางอยู่ styles/tokens.css จัดหน้าด้วย Tailwind ใน JSX ไม่มี *.styles.js

## Packages และการตรวจ

Runtime: react, react-dom, recharts ส่วน development ใช้ vite, @vitejs/plugin-react, tailwindcss, @tailwindcss/vite; **qrcode/pngjs อยู่ Backend** ไม่ต้องลง Frontend เวอร์ชันติดตั้งจริงอยู่ root package-lock.json เมื่อ Clone ใช้ npm ci

Node tests ตรวจ API contracts, bearer expiry, pagination, QR settings, chart precision, rendering, modal lifecycle บางชุดใช้ Vite SSR ไม่ใช่ browser end-to-end test

Build อยู่ frontend/dist/ ตั้ง VITE_BASE_PATH=/Ford-ShortURL/ และ VITE_API_ORIGIN เป็น Render Origin ใช้ Hash Routing ไม่ต้อง SPA fallback/proxy ดูคู่มือ ../docs/DEPLOY.md ตรวจ responsive, CORS, Token expiry, clipboard/download และ QR บนอุปกรณ์จริงเพิ่มเติม ดู [DFD/ERD ปัจจุบัน](../docs/diagrams/short-url-dfd.html) และ [System Design](../docs/design/BACKEND_DESIGN.md)

## GitHub Pages และ Login

ใช้ Hash Routing เช่น /Ford-ShortURL/#/my-links เมนูไม่ Reload หน้า Access Token อยู่ในหน่วยความจำเท่านั้น ไม่มี Cookie หรือ Refresh Token รีเฟรช/ปิดแท็บหรือหมดอายุ 15 นาที (ค่าเริ่มต้น) ต้อง Login ใหม่ Supabase/Redis Secret ไม่อยู่ใน VITE_* ตั้งเฉพาะ Public VITE_API_ORIGIN และ VITE_BASE_PATH ดู frontend/.env.example
