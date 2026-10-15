import { lazy, Suspense } from 'react';
import { exactClicks, dayLabel } from '../chart-data.js';
const DashboardBarChart = lazy(() => import('./DashboardBarChart.jsx'));
export { dayLabel } from '../chart-data.js';
export default function DashboardChart({ data }) {
  const values = data.daily.filter((row) => row.clicks !== null).map((row) => BigInt(row.clicks));
  const total = values.reduce((a, b) => a + b, 0n);
  return (
    <section
      className="min-w-0 rounded-2xl border border-admin-line bg-white p-5 sm:p-7"
      aria-labelledby="daily-chart-title"
    >
      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="daily-chart-title" className="text-18 font-semibold">
            ยอดเปิดลิงก์ย้อนหลัง 7 วัน
          </h2>
          <p className="mt-1 text-13 leading-6 text-text-muted">
            รวมทุกลิงก์ของคุณ · เวลาไทย · วันนี้ยังไม่ครบวัน
          </p>
        </div>
        <div className="text-right">
          <p className="text-12 text-text-muted">รวมช่วงที่มีข้อมูล</p>
          <p className="mt-1 break-all text-25 font-semibold tabular-nums">
            {total.toLocaleString('th-TH')}{' '}
            <span className="text-13 font-normal text-text-muted">ครั้ง</span>
          </p>
        </div>
      </div>
      <Suspense fallback={<div role="status" className="grid h-72 place-items-center text-13 text-text-muted">กำลังโหลดกราฟ…</div>}>
        <DashboardBarChart daily={data.daily} />
      </Suspense>
      <ul className="sr-only" aria-label="ยอดเปิดลิงก์รายวันแบบข้อความ">
        {data.daily.map((row) => (
          <li key={row.day}>{`${dayLabel(row.day)}: ${exactClicks(row.clicks)}`}</li>
        ))}
      </ul>

      <p className="mt-3 text-12 leading-6 text-text-muted">
        เริ่มเก็บยอดรายวัน{' '}
        {new Date(data.trackingSince).toLocaleString('th-TH', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Asia/Bangkok',
        })}{' '}
        น. · เครื่องหมาย * คือช่วงที่ยังไม่มีข้อมูลย้อนหลัง
      </p>
    </section>
  );
}
