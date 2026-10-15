import { Button, Icon, Input } from '../../../shared/ui/index.js';
import Pagination from '../../../shared/ui/Pagination.jsx';
import Panel from './AdminPanel.jsx';
import AdminLinkActions from './AdminLinkActions.jsx';
import AdminLinkStatus from './AdminLinkStatus.jsx';
import AdminLinkAddress from './AdminLinkAddress.jsx';
export default function AdminLinksContent({ model, onSelectOwner }) {
  const { ownerId, state, query, filter, page, setPage, setQuery, setFilter, reload } = model;
  const owner = model.owner;
  return (
    <>
      {owner && (
        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-5 p-6">
            <div className="min-w-0">
              <p className="text-13 text-text-muted">เจ้าของลิงก์</p>
              <h2 className="mt-1 break-all text-20 font-semibold text-admin-heading-text">
                {owner.email}
              </h2>
              <p className="mt-2 text-14 text-text-muted">
                {owner.role === 'admin' ? 'Admin' : 'User'} ·{' '}
                <span
                  className={
                    owner.isActive ? 'font-medium text-success' : 'font-medium text-warning'
                  }
                >
                  {owner.isActive ? 'บัญชีเปิดใช้งาน' : 'บัญชีถูกระงับ'}
                </span>
                {owner.isPrimaryAdmin ? ' · บัญชีหลัก' : ''}
              </p>
            </div>
            <dl className="flex flex-wrap gap-8">
              <div>
                <dt className="text-13 text-text-muted">ลิงก์ทั้งหมด</dt>
                <dd className="mt-1 font-display text-28 font-semibold text-admin-heading-text">
                  {BigInt(owner.linkCount).toLocaleString('th-TH')}
                </dd>
              </div>
              <div>
                <dt className="text-13 text-text-muted">ยอดเปิดรวม</dt>
                <dd className="mt-1 font-display text-28 font-semibold text-admin-heading-text">
                  {BigInt(owner.clickCount).toLocaleString('th-TH')}
                </dd>
              </div>
            </dl>
          </div>
        </Panel>
      )}
      <Panel as="section">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-t-2xl bg-admin-sidebar-active px-6 py-5 text-white">
          <h2 className="text-18 font-semibold">
            {ownerId ? 'ลิงก์ของบัญชีนี้' : 'เจ้าของลิงก์ในระบบ'}
          </h2>
          <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-13">
            {state.status === 'ready'
              ? `${state.total.toLocaleString('th-TH')} ${ownerId ? 'ลิงก์' : 'บัญชี'}`
              : 'กำลังโหลด'}
          </span>
        </div>
        <div className="flex flex-col gap-3 p-5 sm:flex-row">
          <label className="min-w-0 flex-1">
            <span className="sr-only">{ownerId ? 'ค้นหาลิงก์' : 'ค้นหาเจ้าของ'}</span>
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              maxLength={ownerId ? 8192 : 254}
              placeholder={
                ownerId ? 'ค้นหาลิงก์สั้นหรือ URL ปลายทาง…' : 'ค้นหาด้วยอีเมลเจ้าของลิงก์…'
              }
            />
          </label>
          <label>
            <span className="sr-only">กรองสถานะ</span>
            <select
              className="min-h-14 w-full rounded-xl border border-admin-line bg-white px-4 text-15 sm:w-auto"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            >
              <option value="all">ทุกสถานะ</option>
              <option value="active">{ownerId ? 'ลิงก์เปิดใช้งาน' : 'บัญชีเปิดใช้งาน'}</option>
              <option value="inactive">{ownerId ? 'ปิดลิงก์' : 'บัญชีถูกระงับ'}</option>
              {ownerId && <option value="owner_suspended">หยุดเพราะเจ้าของถูกระงับ</option>}
            </select>
          </label>
          {(query || filter !== 'all') && (
            <button
              onClick={() => {
                setQuery('');
                setFilter('all');
              }}
              className="px-3 text-14 underline"
            >
              ล้างตัวกรอง
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table
            className={
              ownerId
                ? 'w-full min-w-[960px] text-left text-15 leading-7'
                : 'w-full min-w-[720px] text-left text-15 leading-7'
            }
          >
            <thead className="border-y border-admin-line bg-admin-heading text-14 text-admin-heading-text">
              <tr>
                {(ownerId
                  ? ['ลิงก์สั้น / ปลายทาง', 'จำนวนเปิด', 'สถานะ', 'วันที่สร้าง', 'จัดการ']
                  : ['เจ้าของลิงก์', 'จำนวนลิงก์', 'ยอดเปิดรวม', 'จัดการ']
                ).map((label) => (
                  <th key={label} scope="col" className="px-6 py-4 font-semibold">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {state.status === 'ready' &&
                state.items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-admin-line even:bg-admin-soft/60 last:border-0 hover:bg-admin-heading/30"
                  >
                    {ownerId ? (
                      <>
                        <td className="max-w-[420px] px-6 py-5">
                          <AdminLinkAddress link={item} />
                        </td>
                        <td className="px-6 py-5 font-display font-semibold">
                          {BigInt(item.clickCount).toLocaleString('th-TH')}
                        </td>
                        <td className="px-6 py-5">
                          <AdminLinkStatus status={item.status} />
                        </td>
                        <td className="whitespace-nowrap px-6 py-5 text-13 text-text-muted">
                          {new Date(item.createdAt).toLocaleString('th-TH')}
                        </td>
                        <td className="px-6 py-5">
                          <AdminLinkActions ownerId={ownerId} target={item} onChanged={reload} />
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="max-w-[340px] px-6 py-5">
                          <p className="break-all font-semibold text-admin-heading-text">
                            {item.email}
                          </p>
                          <p className="mt-1 text-13 text-text-muted">
                            {item.role === 'admin' ? 'Admin' : 'User'}
                            {item.isPrimaryAdmin ? ' · บัญชีหลัก' : ''} ·{' '}
                            <span className={item.isActive ? 'text-success' : 'text-warning'}>
                              {item.isActive ? 'เปิดใช้งาน' : 'ถูกระงับ'}
                            </span>
                          </p>
                        </td>
                        <td className="px-6 py-5 font-display font-semibold">
                          {BigInt(item.linkCount).toLocaleString('th-TH')}
                        </td>
                        <td className="px-6 py-5 font-display font-semibold">
                          {BigInt(item.clickCount).toLocaleString('th-TH')}
                        </td>
                        <td className="px-6 py-5">
                          <Button
                            variant="info"
                            onClick={() => onSelectOwner(item)}
                            className="[&&]:rounded-xl [&&]:text-14"
                          >
                            ดูลิงก์
                            <Icon name="chevron" width="15" />
                          </Button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {(state.status !== 'ready' || !state.items.length) && (
          <div className="space-y-3 px-6 py-12 text-center text-15 text-text-muted" role="status">
            <Icon name={ownerId ? 'link' : 'users'} width="28" className="mx-auto" />
            <p>
              {state.status === 'loading'
                ? 'กำลังโหลดข้อมูล…'
                : state.status === 'error'
                  ? state.error
                  : ownerId
                    ? 'ไม่พบลิงก์ที่ตรงกับเงื่อนไข'
                    : 'ไม่พบบัญชีที่มีลิงก์ตรงกับเงื่อนไข'}
            </p>
            {state.status === 'error' && (
              <button onClick={reload} className="underline">
                ลองอีกครั้ง
              </button>
            )}
          </div>
        )}
        {state.status === 'ready' && (
          <Pagination
            page={page}
            total={state.total}
            onPageChange={setPage}
            label={ownerId ? 'หน้าลิงก์ของเจ้าของ' : 'หน้ารายชื่อเจ้าของลิงก์'}
          />
        )}
      </Panel>
    </>
  );
}
