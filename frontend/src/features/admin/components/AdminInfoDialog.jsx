import { Button, Icon, IconButton, Modal } from '../../../shared/ui/index.js';
export default function AdminInfoDialog({ dialog }) {
  return (
    <Modal ref={dialog} labelledBy="admin-info-title">
      <div className="flex items-start justify-between gap-4">
        <h2 id="admin-info-title" className="text-26 font-semibold leading-[1.8]">
          การเข้าถึงพื้นที่ Admin
        </h2>
        <IconButton label="ปิดรายละเอียด" icon="close" onClick={() => dialog.current.close()} />
      </div>
      <p className="mt-4 text-16 leading-8 text-text-muted">
        พื้นที่นี้ใช้ตรวจสอบผู้ใช้งานและลิงก์ของระบบ โดยยืนยันบัญชีและสิทธิ์ Admin ก่อนแสดงข้อมูล
      </p>
      <p className="mt-3 text-16 leading-8 text-text-muted">
        หากโหลดข้อมูลไม่ได้ ให้ตรวจสอบว่าหลังบ้านเชื่อมต่อฐานข้อมูลและ Redis ได้ แล้วลองโหลดใหม่
        หากสิทธิ์บัญชีเปลี่ยน ให้เข้าสู่ระบบอีกครั้ง
      </p>
      <Button className="mt-6" onClick={() => dialog.current.close()}>
        กลับหน้าภาพรวม <Icon name="arrow" width="17" />
      </Button>
    </Modal>
  );
}
