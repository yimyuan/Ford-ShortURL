export function authErrorMessage(error) {
  if (error.code === 'DATABASE_UNAVAILABLE')
    return 'ยังเชื่อมต่อฐานข้อมูลไม่ได้ กรุณาลองใหม่อีกครั้ง';
  if (['SESSION_UNAVAILABLE', 'RATE_LIMIT_UNAVAILABLE'].includes(error.code))
    return 'บริการเข้าสู่ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง';
  if (['AUTH_NOT_READY', 'CSRF_NOT_READY', 'RATE_LIMIT_NOT_READY'].includes(error.code))
    return 'หลังบ้านยังตั้งค่าระบบเข้าสู่ระบบไม่ครบ กรุณาตรวจสอบการตั้งค่า';
  if (error.code === 'INVALID_CREDENTIALS' || error.code === 'INVALID_LOGIN')
    return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง';
  if (error.code === 'INVALID_PASSWORD') return 'รหัสผ่านสมัครสมาชิกต้องมีอย่างน้อย 10 ตัวอักษร';
  if (error.code === 'EMAIL_EXISTS') return 'อีเมลนี้มีบัญชีอยู่แล้ว กรุณาเข้าสู่ระบบ';
  if (error.code === 'ACCOUNT_INACTIVE' || error.code === 'USER_INACTIVE')
    return 'บัญชีนี้ถูกปิดใช้งาน กรุณาติดต่อผู้ดูแลระบบ';
  if (error.code === 'RATE_LIMITED' || error.status === 429)
    return 'ลองหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่';
  if (error.status === 422 || error.status === 400)
    return 'กรุณาตรวจสอบอีเมลและรหัสผ่าน รหัสผ่านสมัครสมาชิกต้องมีอย่างน้อย 10 ตัวอักษร';
  if (error.code === 'CSRF_INVALID' || error.code === 'ORIGIN_NOT_ALLOWED')
    return 'ไม่สามารถยืนยันคำขอได้ กรุณาโหลดหน้าเว็บใหม่แล้วลองอีกครั้ง';
  return 'ยังติดต่อระบบไม่ได้ กรุณาลองอีกครั้ง';
}
