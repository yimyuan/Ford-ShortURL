import { Icon, Input } from '../../../shared/ui/index.js';
import Panel from './AdminPanel.jsx';
import AdminDataTable from './AdminDataTable.jsx';
import Pagination from '../../../shared/ui/Pagination.jsx';
export default function AdminRecords({ model }) {
  const { section, state, query, setQuery, filter, setFilter } = model;
  return (
    <Panel as="section">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-t-2xl border-b border-admin-sidebar bg-admin-sidebar-active px-6 py-5 text-white">
        <h2 className="text-18 font-semibold">
          {section === 'users' ? 'ผู้ใช้งานในระบบ' : 'ลิงก์ในระบบ'}
        </h2>
        <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-14 font-medium text-white">
          {state.status === 'ready' ? `${state.items.length} รายการที่โหลด` : 'รอข้อมูล'}
        </span>
      </div>
      <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <label htmlFor="admin-search" className="sr-only">
            {section === 'users' ? 'ค้นหาอีเมลผู้ใช้' : 'ค้นหาลิงก์'}
          </label>
          <Icon
            name="search"
            width="18"
            className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-accent-muted"
          />
          <Input
            id="admin-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={section === 'users' ? 'ค้นหาด้วยอีเมลผู้ใช้…' : 'ค้นหา URL หรือรหัสลิงก์…'}
            className="[&&]:rounded-xl [&&]:py-3 [&&]:pl-11 [&&]:text-16"
          />
        </div>
        <label className="sr-only" htmlFor="admin-filter">
          กรองรายการ
        </label>
        <select
          id="admin-filter"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          className="min-h-12 rounded-xl border border-admin-line bg-admin-panel px-4 py-3 text-15 sm:min-w-40"
        >
          <option value="all">ทั้งหมด</option>
          {section === 'users' && (
            <>
              <option value="admin">ผู้ดูแลระบบ</option>
              <option value="user">ผู้ใช้งานทั่วไป</option>
            </>
          )}
          <option value="active">เปิดใช้งาน</option>
          <option value="inactive">ปิดใช้งาน</option>
        </select>
        {(query || filter !== 'all') && (
          <button
            className="px-2 py-2 text-14 underline underline-offset-4"
            onClick={() => {
              setQuery('');
              setFilter('all');
            }}
          >
            ล้างตัวกรอง
          </button>
        )}
      </div>
      <AdminDataTable kind={section} state={state} query={query} onChanged={model.reload} />
      {state.status === 'ready' && (
        <Pagination
          page={model.page}
          total={state.total}
          onPageChange={model.setPage}
          label="หน้ารายการผู้ดูแลระบบ"
        />
      )}
    </Panel>
  );
}
