export const auditActions = {
  change_role: 'เปลี่ยนสิทธิ์',
  suspend: 'ระงับบัญชี',
  activate: 'เปิดใช้งานบัญชี',
  reset_password: 'รีเซ็ตรหัสผ่าน',
  delete_user: 'ลบบัญชีถาวร',
  change_password: 'เปลี่ยนรหัสผ่านของตัวเอง',
  link_enable: 'เปิดใช้งานลิงก์',
  link_disable: 'ปิดใช้งานลิงก์',
  link_delete: 'ลบลิงก์ถาวร',
};
export function auditDescription(item) {
  if (['link_enable', 'link_disable', 'link_delete'].includes(item.action))
    return `${auditActions[item.action]} · ${item.details?.shortCode ?? '—'}`;
  if (item.action === 'change_role')
    return `เปลี่ยนสิทธิ์ ${item.details?.from === 'admin' ? 'Admin' : 'User'} → ${item.details?.to === 'admin' ? 'Admin' : 'User'}`;
  if (item.action === 'delete_user')
    return `ลบบัญชีถาวร พร้อมลิงก์ ${item.details?.deletedLinks ?? 0} รายการ`;
  return auditActions[item.action] || item.action;
}
