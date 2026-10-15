const labels = { active: 'เปิดใช้งาน', inactive: 'ปิดลิงก์', owner_suspended: 'เจ้าของถูกระงับ' };
export default function AdminLinkStatus({ status }) {
  return (
    <span
      className={
        status === 'active'
          ? 'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-success/20 bg-success-surface px-3 py-1 text-13 font-medium text-success'
          : status === 'inactive'
            ? 'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-danger/20 bg-danger-surface px-3 py-1 text-13 font-medium text-danger'
            : 'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-warning/20 bg-warning-surface px-3 py-1 text-13 font-medium text-warning'
      }
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {labels[status] ?? 'ไม่ทราบสถานะ'}
    </span>
  );
}
