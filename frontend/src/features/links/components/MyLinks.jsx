import { useState } from 'react';
import { paths } from '../../../app/navigation.js';
import { Button, Icon } from '../../../shared/ui/index.js';
import useLinkHistory from '../hooks/useLinkHistory.js';
import MyLinksFilters from './MyLinksFilters.jsx';
import MyLinksTable from './MyLinksTable.jsx';
import MyLinkDialog from './MyLinkDialog.jsx';
import Pagination from '../../../shared/ui/Pagination.jsx';
export default function MyLinks({ revision }) {
  const model = useLinkHistory(revision);
  const { state, page, setPage, reload, hasFilters, clearFilters } = model;
  const [selectedId, setSelectedId] = useState(null);
  return (
    <section id="my-links" className="bg-page py-10 sm:py-12" aria-labelledby="my-links-title">
      <div className="mx-auto w-[calc(100%_-_40px)] max-w-[1160px] sm:w-[calc(100%_-_64px)]">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 id="my-links-title" className="text-28 font-semibold leading-10 sm:text-32">
              ลิงก์ของฉัน
            </h1>
            <p className="mt-2 text-14 leading-7 text-text-muted">
              ค้นหา ติดตามยอดเปิด และจัดการลิงก์ทั้งหมดของคุณ
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button href={paths.home} className="[&&]:rounded-xl [&&]:text-13">
              สร้างลิงก์ใหม่ <Icon name="arrow" width="17" />
            </Button>
            <Button
              variant="outline"
              disabled={state.loading}
              onClick={reload}
              className="[&&]:rounded-xl [&&]:text-13"
            >
              <Icon name="refresh" width="17" />
              อัปเดตข้อมูล
            </Button>
          </div>
        </div>
        <MyLinksFilters model={model} />
        {state.loading ? (
          <p
            role="status"
            className="rounded-2xl border border-admin-line bg-white px-6 py-12 text-center text-14 text-text-muted"
          >
            กำลังโหลดลิงก์ของคุณ…
          </p>
        ) : state.error ? (
          <div role="alert" className="rounded-2xl bg-warning-surface p-6 text-14 text-warning">
            {state.error}
            <button type="button" className="ml-3 font-semibold underline" onClick={reload}>
              ลองอีกครั้ง
            </button>
          </div>
        ) : !state.items.length ? (
          <div className="rounded-2xl border border-admin-line bg-white px-6 py-12 text-center">
            <Icon name="link" className="mx-auto mb-4 text-text-muted" />
            <p className="text-16 font-medium">
              {hasFilters ? 'ไม่พบลิงก์ตามเงื่อนไข' : 'ยังไม่มีลิงก์'}
            </p>
            <p className="mt-2 text-13 leading-7 text-text-muted">
              {hasFilters
                ? 'ลองเปลี่ยนคำค้นหาหรือล้างตัวกรอง'
                : 'เริ่มสร้างลิงก์แรกของคุณจากหน้าแรก'}
            </p>
            {hasFilters ? (
              <Button variant="outline" onClick={clearFilters} className="mt-4 [&&]:text-13">
                ล้างตัวกรอง
              </Button>
            ) : (
              <Button href={paths.home} className="mt-4 [&&]:text-13">
                สร้างลิงก์แรก <Icon name="arrow" width="16" />
              </Button>
            )}
          </div>
        ) : (
          <MyLinksTable items={state.items} onManage={setSelectedId} />
        )}
        {!state.loading && !state.error && (
          <div className="mt-5">
            <Pagination
              page={page}
              total={state.total}
              onPageChange={setPage}
              label="หน้ารายการลิงก์ของฉัน"
            />
          </div>
        )}
      </div>
      {selectedId && (
        <MyLinkDialog
          key={selectedId}
          id={selectedId}
          onClose={() => {
            setSelectedId(null);
            reload();
          }}
        />
      )}
    </section>
  );
}
