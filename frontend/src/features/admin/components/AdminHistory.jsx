import { Button, Input } from '../../../shared/ui/index.js';
import Panel from './AdminPanel.jsx';
import { auditActions, auditDescription } from '../audit.js';
import useAdminHistory from '../hooks/useAdminHistory.js';
import Pagination from '../../../shared/ui/Pagination.jsx';
export default function AdminHistory({ revision }) {
  const { draft, filters, data, field, search, reset, retry, setPage } = useAdminHistory(revision);
  return (
    <Panel as="section">
      <div className="rounded-t-2xl border-b border-admin-sidebar bg-admin-sidebar-active px-6 py-5 text-white">
        <h2 className="text-18 font-semibold">ประวัติการจัดการ</h2>
        <p className="mt-1 text-14 text-admin-sidebar-muted">
          เก็บประวัติ 1 เดือน · ลบรายการที่หมดอายุอัตโนมัติทุกชั่วโมง · ไม่บันทึกรหัสผ่าน
        </p>
      </div>
      <form className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4" onSubmit={search}>
        <label className="space-y-2 text-15">
          ผู้ดำเนินการ / บัญชีเป้าหมาย
          <Input
            value={draft.query}
            onChange={(event) => field('query', event.target.value)}
            placeholder="ค้นหาด้วยอีเมล"
            maxLength={254}
          />
        </label>
        <label className="space-y-2 text-15">
          ประเภท
          <select
            value={draft.action}
            onChange={(event) => field('action', event.target.value)}
            className="block min-h-14 w-full rounded-xl border border-admin-line bg-admin-panel px-3"
          >
            <option value="">ทั้งหมด</option>
            {Object.entries(auditActions).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2 text-15">
          ตั้งแต่วันที่
          <Input
            type="date"
            value={draft.from}
            max={draft.to || undefined}
            onChange={(event) => field('from', event.target.value)}
          />
        </label>
        <label className="space-y-2 text-15">
          ถึงวันที่
          <Input
            type="date"
            value={draft.to}
            min={draft.from || undefined}
            onChange={(event) => field('to', event.target.value)}
          />
        </label>
        <div className="flex flex-wrap gap-3 sm:col-span-2 xl:col-span-4">
          <Button type="submit">ค้นหา</Button>
          <Button variant="outline" onClick={reset}>
            ล้างตัวกรอง
          </Button>
        </div>
      </form>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] text-left text-16 leading-7">
          <thead className="border-y border-admin-line bg-admin-heading text-14 text-admin-heading-text">
            <tr>
              {['วันเวลา', 'ผู้ดำเนินการ', 'บัญชีเป้าหมาย', 'รายละเอียด'].map((label) => (
                <th key={label} className="px-6 py-4 font-semibold" scope="col">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.items.map((item) => (
              <tr key={item.id} className="border-b border-admin-line">
                <td className="whitespace-nowrap px-6 py-5 text-15">
                  {new Date(item.created_at).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}
                </td>
                <td className="max-w-64 break-all px-6 py-5">{item.actor_email}</td>
                <td className="max-w-64 break-all px-6 py-5">{item.target_email}</td>
                <td className="min-w-56 px-6 py-5">{auditDescription(item)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!data.items.length && (
        <div className="p-10 text-center text-16" role="status">
          {data.status === 'loading'
            ? 'กำลังโหลดประวัติ…'
            : data.status === 'error'
              ? data.error || 'ยังโหลดประวัติไม่ได้'
              : 'ไม่พบประวัติที่ตรงกับเงื่อนไข'}
          {data.status === 'error' && (
            <button className="ml-3 underline" onClick={retry}>
              ลองอีกครั้ง
            </button>
          )}
        </div>
      )}
      <p className="border-t border-admin-line px-6 py-3 text-13 text-text-muted">
        วันเวลาแสดงตามเวลาไทย
      </p>
      {data.status === 'ready' && (
        <Pagination
          page={filters.page}
          total={data.total}
          onPageChange={setPage}
          label="หน้าประวัติการจัดการ"
        />
      )}
    </Panel>
  );
}
