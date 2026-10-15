import { Icon } from '../../../shared/ui/index.js';
export default function AdminUserSummary({ account, linkCount }) {
  return (
    <section
      aria-label="ข้อมูลบัญชีที่เลือก"
      className="mt-5 overflow-hidden rounded-2xl border border-admin-line bg-white"
    >
      <div className="flex items-center gap-3 border-b border-admin-line bg-admin-soft px-4 py-4">
        <span
          aria-hidden="true"
          className="grid size-11 shrink-0 place-items-center rounded-full bg-admin-heading font-display text-20 font-semibold text-admin-heading-text"
        >
          {account.email.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="text-12 text-text-muted">อีเมลบัญชีผู้ใช้งาน</p>
          <p className="mt-0.5 break-all text-16 font-semibold leading-7 text-admin-heading-text">
            {account.email}
          </p>
        </div>
      </div>
      <dl className="grid grid-cols-1 divide-y divide-admin-line min-[380px]:grid-cols-3 min-[380px]:divide-x min-[380px]:divide-y-0">
        <div className="px-4 py-3">
          <dt className="mb-2 text-12 text-text-muted">สิทธิ์บัญชี</dt>
          <dd className="inline-flex items-center gap-1.5 text-14 font-semibold text-admin-heading-text">
            <Icon name={account.role === 'admin' ? 'shield' : 'users'} width="15" />
            {account.role === 'admin' ? 'Admin' : 'User'}
          </dd>
        </div>
        <div className="px-4 py-3">
          <dt className="mb-2 text-12 text-text-muted">สถานะปัจจุบัน</dt>
          <dd
            className={
              account.isActive
                ? 'inline-flex items-center gap-1.5 text-14 font-semibold text-success'
                : 'inline-flex items-center gap-1.5 text-14 font-semibold text-warning'
            }
          >
            <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
            {account.isActive ? 'เปิดใช้งาน' : 'ระงับอยู่'}
          </dd>
        </div>
        <div className="px-4 py-3">
          <dt className="mb-2 text-12 text-text-muted">ลิงก์ที่สร้าง</dt>
          <dd className="inline-flex items-center gap-1.5 text-14 font-semibold text-admin-heading-text">
            <Icon name="link" width="15" />
            {linkCount === undefined ? '—' : linkCount.toLocaleString('th-TH')}{' '}
            <span className="text-12 font-normal text-text-muted">รายการ</span>
          </dd>
        </div>
      </dl>
    </section>
  );
}
