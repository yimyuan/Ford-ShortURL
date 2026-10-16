export function linkErrorMessage(error) {
  if (error.code === 'REQUEST_LINK_DELETED')
    return 'ลิงก์จากคำขอนี้ถูกลบแล้ว กรุณาปิดหน้าต่างแล้วเริ่มสร้างใหม่';
  if (error.code === 'IDEMPOTENCY_CONFLICT')
    return 'คำขอสร้างลิงก์มีข้อมูลเปลี่ยนไป กรุณาเริ่มสร้างใหม่';
  if (error.code === 'LINK_CREATE_FORBIDDEN')
    return 'บัญชีนี้ยังไม่สามารถสร้างลิงก์ได้ กรุณาเข้าสู่ระบบใหม่';
  if (error.code === 'QR_CHANGED')
    return 'แบบ QR ถูกเปลี่ยนจากอีกหน้าต่าง กรุณาโหลดแบบล่าสุดก่อนบันทึก';
  if (error.code === 'QR_LOW_CONTRAST')
    return 'สีจุดต้องเข้มกว่าพื้นหลังและมีความต่างมากพอ กรุณาปรับสี';
  if (error.code === 'INVALID_QR_STYLE') return 'สีหรือขนาด QR ไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง';
  if (error.code === 'QR_FORBIDDEN') return 'บัญชีนี้ยังไม่สามารถบันทึกแบบ QR ได้';
  if (error.code === 'CUSTOM_CODE_TAKEN') return 'ชื่อลิงก์นี้ถูกใช้แล้ว กรุณาเลือกชื่ออื่น';
  if (error.code === 'INVALID_CUSTOM_CODE')
    return 'ชื่อลิงก์ต้องมี 3–40 ตัว ใช้ภาษาอังกฤษ ตัวเลข และ - โดยขึ้นต้นและลงท้ายด้วยตัวอักษรหรือตัวเลข';
  if (error.status === 401) return 'กรุณาเข้าสู่ระบบอีกครั้งเพื่อใช้งานลิงก์ของคุณ';
  if (error.code === 'INVALID_URL') return 'กรุณาใส่ URL ที่ขึ้นต้นด้วย https:// หรือ http://';
  if (error.status === 404) return 'ไม่พบลิงก์นี้ หรือคุณไม่มีสิทธิ์เข้าถึง';
  if (error.status === 429) return 'สร้างลิงก์หลายครั้งเกินไป กรุณารอประมาณหนึ่งนาทีแล้วลองใหม่';
  if (error.code === 'PUBLIC_URL_INVALID')
    return 'ยังไม่ได้ตั้งค่าโดเมนลิงก์สั้น กรุณาติดต่อผู้ดูแลระบบ';
  if (error.code === 'QR_UNAVAILABLE') return 'ยังสร้าง QR Code ไม่ได้ กรุณาลองใหม่';
  return 'ยังติดต่อระบบไม่ได้ กรุณาลองใหม่อีกครั้ง';
}
