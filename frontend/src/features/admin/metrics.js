export function getAdminMetrics(summary) {
  const data = summary?.status === 'ready' ? summary.data : null;
  const value = (key) => (data ? BigInt(data[key]) : null);
  return [
    {
      icon: 'users',
      label: 'ผู้ใช้งานทั้งหมด',
      value: value('users'),
      caption: 'บัญชีผู้ใช้ในระบบ',
    },
    {
      icon: 'link',
      label: 'ลิงก์ทั้งหมด',
      value: value('links'),
      caption: 'ลิงก์สั้นที่สร้างในระบบ',
    },
    {
      icon: 'chart',
      label: 'การเปิดลิงก์ทั้งหมด',
      value: value('clicks'),
      caption: 'จำนวนครั้งที่เปิดลิงก์ในระบบ',
    },
    {
      icon: 'shield',
      label: 'ผู้ดูแลระบบ',
      value: value('admins'),
      caption: 'บัญชีที่มีสิทธิ์ Admin',
    },
  ];
}
