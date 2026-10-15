import { Icon } from '../../../shared/ui/index.js';
import AdminUserActions from './AdminUserActions.jsx';
const messages = {
  loading: ['กำลังโหลดข้อมูล', 'กรุณารอสักครู่'],
  unauthorized: ['ยังเข้าถึงข้อมูลนี้ไม่ได้', 'กรุณาตรวจสอบสิทธิ์ของบัญชี หรือลองเข้าสู่ระบบใหม่'],
  unavailable: [
    'ข้อมูลยังไม่พร้อมใช้งาน',
    'กรุณาตรวจสอบการเชื่อมต่อหลังบ้าน แล้วลองโหลดข้อมูลใหม่',
  ],
  error: ['ยังโหลดข้อมูลไม่ได้', 'ลองกดโหลดใหม่อีกครั้ง'],
  ready: ['ยังไม่มีรายการ', 'รายการที่ตรงกับเงื่อนไขจะแสดงที่นี่'],
};
export default function AdminDataTable({ kind, state, query = '', compact = false, onChanged }) {
  const isUsers = kind === 'users';
  const shown = state.status === 'ready' ? state.items : [];
  const [title, message] = messages[state.status] || messages.error;
  return (
    <div className="overflow-x-auto rounded-b-2xl">
      <table className="w-full min-w-[720px] border-collapse text-left text-16 leading-[1.8]">
        <thead className="border-y border-admin-line bg-admin-heading text-14 text-admin-heading-text">
          <tr>
            {(isUsers
              ? ['ผู้ใช้งาน', 'สิทธิ์', 'สถานะ', 'จัดการ']
              : ['ลิงก์ / ปลายทาง', 'รหัสลิงก์', 'จำนวนเปิด', 'สถานะ']
            ).map((label) => (
              <th className="px-6 py-5 font-semibold" scope="col" key={label}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {shown.map((item) => (
            <tr
              key={item.id}
              className="border-b border-admin-line even:bg-admin-soft/60 last:border-0 hover:bg-admin-heading/50"
            >
              <td className="max-w-[300px] px-6 py-5">
                <span className="block break-all font-medium">
                  {isUsers ? item.email : item.originalUrl}
                </span>
                {isUsers && item.isPrimaryAdmin && (
                  <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-warning/20 bg-warning-surface px-2.5 py-0.5 text-13 font-medium text-warning">
                    <Icon name="shield" width="14" />
                    บัญชีหลัก
                  </span>
                )}
              </td>
              <td className="px-6 py-5 font-display text-text-secondary">
                {isUsers ? (
                  <span
                    className={
                      item.role === 'admin'
                        ? 'inline-flex items-center gap-1.5 rounded-full border border-role/20 bg-role-surface px-3 py-1 text-14 font-medium text-role'
                        : 'inline-flex items-center gap-1.5 rounded-full border border-info/20 bg-info-surface px-3 py-1 text-14 font-medium text-info'
                    }
                  >
                    <Icon name={item.role === 'admin' ? 'shield' : 'users'} width="15" />
                    {item.role === 'admin' ? 'Admin' : 'User'}
                  </span>
                ) : (
                  item.shortCode
                )}
              </td>
              <td className="px-6 py-5">
                {isUsers ? <Status active={item.isActive} /> : String(item.clickCount ?? '—')}
              </td>
              <td className="px-6 py-5">
                {isUsers ? (
                  compact ? (
                    <span className="text-14 text-text-muted">ดูในหน้าผู้ใช้งาน</span>
                  ) : (
                    <AdminUserActions target={item} onChanged={onChanged} />
                  )
                ) : (
                  <Status active={item.isActive} />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!shown.length && (
        <div
          className="flex min-h-[260px] flex-col items-center justify-center gap-2 px-6 py-10 text-center"
          role="status"
        >
          <div className="mb-2 grid size-14 place-items-center rounded-2xl border border-admin-line bg-admin-soft text-accent-muted">
            <Icon
              name={state.status === 'unauthorized' ? 'shield' : isUsers ? 'users' : 'link'}
              width="25"
            />
          </div>
          <p className="text-16 font-medium">
            {state.status === 'ready' && query ? 'ไม่พบรายการที่ค้นหา' : title}
          </p>
          <p className="max-w-sm text-15 leading-7 text-text-muted">{message}</p>
        </div>
      )}
    </div>
  );
}
function Status({ active }) {
  if (typeof active !== 'boolean') return <span className="text-text-muted">—</span>;
  return (
    <span
      className={
        active
          ? 'inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-success/20 bg-success-surface px-3 py-1 text-14 font-medium text-success'
          : 'inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-warning/20 bg-warning-surface px-3 py-1 text-14 font-medium text-warning'
      }
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
    </span>
  );
}
