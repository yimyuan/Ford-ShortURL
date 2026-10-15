import Button from './Button.jsx';
export default function Pagination({
  page,
  total,
  pageSize = 10,
  onPageChange,
  loading = false,
  label = 'เปลี่ยนหน้าตาราง',
}) {
  if (!Number.isSafeInteger(total) || total <= pageSize) return null;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <nav
      aria-label={label}
      className="flex flex-wrap items-center justify-between gap-3 border-t border-admin-line px-5 py-4 text-14"
    >
      <span className="text-text-muted">
        {((page - 1) * pageSize + 1).toLocaleString('th-TH')}–
        {Math.min(page * pageSize, total).toLocaleString('th-TH')} จาก{' '}
        {total.toLocaleString('th-TH')} รายการ
      </span>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="outline"
          disabled={loading || page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="[&&]:rounded-xl [&&]:px-3 [&&]:text-14"
        >
          ก่อนหน้า
        </Button>
        <span aria-live="polite">
          หน้า {page} / {pages.toLocaleString('th-TH')}
        </span>
        <Button
          variant="outline"
          disabled={loading || page >= pages}
          onClick={() => onPageChange(page + 1)}
          className="[&&]:rounded-xl [&&]:px-3 [&&]:text-14"
        >
          ถัดไป
        </Button>
      </div>
    </nav>
  );
}
