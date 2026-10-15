# ShortURL Design System — Tailwind CSS v4

## โครงสร้าง

- `../../styles/tokens.css`: Theme กลาง (`@theme static`) สำหรับสี ฟอนต์ ขนาด ระยะห่าง ความโค้ง และ motion รวมพื้นหลัง Landing
- `../../styles/index.css`: นำเข้า Tailwind, theme, base และ motion ครั้งเดียวผ่าน main.jsx
- `../../styles/base.css`: กติกาพื้นฐาน Focus, reduced motion และซ่อน scrollbar โดยยังเลื่อนหน้าได้
- `../../styles/motion.css` และ `../hooks/useScrollReveal.js`: scroll reveal แบบเล่นครั้งเดียว
- โฟลเดอร์นี้: Component กลาง Button, IconButton, Input, Card, CardTitle, CardDescription, Modal, Brand และ Icon

คลาสจัดหน้าอยู่ใน JSX ของหน้านั้นโดยตรง ไม่มีไฟล์ *.styles.js และไม่แยกคลาสเป็น array แล้ว join ซ้ำทุกองค์ประกอบ `cx` ใช้เฉพาะการรวมคลาสตาม props/state ภายใน component

## สี

เปลี่ยนสีที่ tokens.css จุดเดียว เช่น --color-page, --color-text, --color-text-muted, --color-danger แล้วเรียกชื่อผ่าน Tailwind ห้ามกระจาย hex สีลง JSX

```jsx
<div className="bg-page text-text">
 <p className="text-text-muted">รายละเอียด</p>
</div>
```

ขนาดและ spacing ยังอ้าง Theme กลางได้ เช่น text-16, rounded-24, gap-(--space-16) สีพื้นหลังไล่ระดับเรียกด้วย bg-landing / bg-landing-mobile

## เรียก Component

ปรับ relative import ให้ตรงตำแหน่งไฟล์

```jsx
import { Button, Input, Card, CardTitle, CardDescription, Modal, Icon } from '../../../shared/ui/index.js';

<Button type="submit">บันทึก <Icon name="arrow" /></Button>
<Button variant="outline" onClick={cancel}>ยกเลิก</Button>
<Button href="/">กลับหน้าแรก</Button>
<Button disabled>กำลังบันทึก</Button>

<label htmlFor="email">อีเมล</label>
<Input id="email" type="email" autoComplete="email" required />

<Card>
 <CardTitle>ชื่อการ์ด</CardTitle>
 <CardDescription>รายละเอียด</CardDescription>
</Card>

<Modal ref={dialog} labelledBy="modal-title">
 <h2 id="modal-title">หัวข้อ</h2>
 <Button onClick={() => dialog.current.close()}>ปิด</Button>
</Modal>
```

Modal ใช้ useRef(null) เปิดด้วย dialog.current.showModal() มี native focus trap/Escape และจัดการ body scroll lock ให้เอง Input ส่ง ref ไป native input ได้; variant plain ใช้ข้อความ placeholder แยกเพื่อไม่ตัดวรรณยุกต์ไทย ต้องมี label หรือ aria-label ทุกครั้ง

## Motion

เรียก useScrollReveal(scopeRef) แล้วใส่ ref ที่ container และ class scroll-reveal ที่ลูก กำหนด style={{ '--reveal-order': index }} เพื่อไล่ลำดับ ควบคุมความเร็วจาก --motion-reveal / --motion-stagger และระยะจาก --reveal-distance รองรับ reduced motion

Tailwind classes ต้องเขียนเต็มเป็น static string เพื่อให้ build ตรวจพบ ไม่ประกอบชื่อแบบ bg-${color}; ใช้ variant map ภายใน component สำหรับตัวเลือก เช่น primary/outline

## ขอบเขต

หน้าแรก Auth dialog, Admin Dashboard และ 404 ใช้ Component กลางแล้ว Auth เชื่อม API ด้วย HttpOnly cookies ผ่าน AuthProvider และ apiRequest โดยไม่เก็บ token ใน browser storage ฟีเจอร์สร้างลิงก์และประวัติเรียกผ่าน API/Hook ใน features/links

อ้างอิง: https://tailwindcss.com/docs/installation/using-vite


