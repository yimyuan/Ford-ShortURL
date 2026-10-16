# DFD / ER - Ford-ShortURL

อัปเดต 2026-10-16 ตาม source และ migrations 001–019 ไม่ใช่ Production acceptance test ไม่อ่าน env หรือแก้ฐานข้อมูลระหว่างสร้างเอกสาร

- [HTML/SVG offline](short-url-dfd.html): DFD และ ER ในไฟล์เดียว ไม่ใช้ CDN
- [DFD PDF](pdf/short-url-dfd.pdf): Context Level 0 และ Level 1 แยก Authentication, Create/Redirect, Workspace/Admin รวม 4 หน้า
- [ER PDF](pdf/short-url-erd.pdf): Physical relationships และ fields ของ 7 ตาราง รวม 3 หน้า
- [Combined PDF](pdf/short-url-design.pdf): ทั้งหมด 7 หน้า
- [System Design](../design/BACKEND_DESIGN.md), [Data Dictionary](../design/DATA_DICTIONARY.md), [Design Review](../design/DESIGN_REVIEW.md)

ชื่อกระบวนการ คำอธิบาย และข้อมูลบนลูกศรเป็นภาษาไทย ชื่อตาราง/คอลัมน์คงภาษาอังกฤษตาม Supabase เพื่อให้เทียบฐานข้อมูลได้ตรง มีคำอธิบายตารางและสัญลักษณ์ภาษาไทย

## DFD conventions

ขอบเขตคือ API และ internal data stores; React/browser เป็น client ภายนอก E1 User/Admin, E2 ผู้เปิดลิงก์ แผนภาพแสดง data flow ไม่ใช่ sequence diagram Process 6.0 คือ identity verification ที่ protected processes ใช้ร่วมกัน ไม่ต้อง Login ใหม่ทุก action

D1 users, D2 links, D3 admin_audit_logs, D4 analytics_state, D5 link_click_daily, D6 short_code_reservations, D7 link_creation_requests, D8 Redis (session/counters/cache) ชื่อ stores ที่แสดงซ้ำคือ store เดิม ไม่ใช่การทำสำเนาฐานข้อมูล กล่องที่รวม D หลายตัวเป็น logical group เพื่อให้อ่านง่าย ตารางจริงแยกใน ER

ลูกศรเข้าเป็น input/query/write และลูกศรกลับเป็น response/result ที่เกี่ยวข้อง Target website อยู่ภายนอกและ browser เปิดตาม Location ไม่ใช่ Backend fetch จึงไม่มี data flow ระหว่างระบบกับเว็บปลายทางใน Context

## ER conventions

ลูกศร parent → child พร้อม cardinality เป็น FK จริงเท่านั้น: users→links RESTRICT, users→requests CASCADE, links→requests SET NULL, links→daily CASCADE

Audit IDs/email เป็น snapshots ไม่มี FK; reservations มี trigger invariant แต่ไม่มี FK ไป links; analytics_state เป็น singleton ไม่มี relation Redis ไม่ใช่ตาราง PostgreSQL อ่าน defaults/CHECK/indexes ใน Data Dictionary

## Rebuild

ใช้ Python ที่มี reportlab และ Pillow พร้อม RAQM สำหรับจัดรูปอักษรไทย แล้วรันจาก root:

```sh
python scripts/generate-design-docs.py
```

สคริปต์เป็นเครื่องมือเอกสารเท่านั้น ไม่ต้องเพิ่ม package ฝั่ง Node runtime เขียนทับ HTML/PDF ชื่อเดิมทั้ง 4 ไฟล์ หากยังไม่มีให้ติดตั้งใน Python environment สำหรับเอกสาร (`python -m pip install reportlab Pillow`)

Windows ใช้ Tahoma/Tahoma Bold จาก C:/Windows/Fonts อัตโนมัติ เครื่องอื่นตั้ง DOCS_THAI_FONT และ DOCS_THAI_BOLD_FONT เป็น path ฟอนต์ไทยของเครื่อง PDF จัดรูปอักษรไทยผ่าน RAQM เป็นภาพความละเอียดสูงเฉพาะข้อความไทย พร้อมชั้นข้อความ Unicode สำหรับค้นหา/คัดลอก เส้น/กล่องและข้อความชื่อ field ยังคงเป็น vector ไม่อ่านค่าลับหรือข้อมูลผู้ใช้

หลังแก้ diagram model ในสคริปต์ให้ regenerate ทั้ง HTML/PDF และ render PDF ตรวจทุกหน้า โดยเฉพาะชื่อ field ยาว/nullable/composite keys ไม่แก้เฉพาะ PDF จน source ต่างกัน
