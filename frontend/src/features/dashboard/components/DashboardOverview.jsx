import { Button, Icon } from '../../../shared/ui/index.js';
import { paths } from '../../../app/navigation.js';
import DashboardChart, { dayLabel } from './DashboardChart.jsx';
export default function DashboardOverview({ model }) {
  const { data, loading, error, reload } = model;
  const stats = [
    {
      key: 'totalLinks',
      label: 'ลิงก์ทั้งหมด',
      caption: 'ลิงก์ที่คุณสร้างไว้',
      icon: 'link',
      unit: 'ลิงก์',
    },
    {
      key: 'totalClicks',
      label: 'ยอดเปิดทั้งหมด',
      caption: 'ยอดสะสมผ่านลิงก์สั้นของคุณ',
      icon: 'chart',
      unit: 'ครั้ง',
    },
    {
      key: 'clickedLinks',
      label: 'ลิงก์ที่มีคนเปิดแล้ว',
      caption: 'ลิงก์ที่มียอดเปิดอย่างน้อย 1 ครั้ง',
      icon: 'check',
      unit: 'ลิงก์',
    },
  ];
  return (
    <div className="mx-auto w-[calc(100%_-_40px)] max-w-[1160px] py-10 sm:w-[calc(100%_-_64px)] sm:py-12">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 className="text-28 font-semibold sm:text-32">ภาพรวมของฉัน</h1>
          <p className="mt-2 text-14 text-text-muted">
            ติดตามผลการแชร์และการเปิดลิงก์ของคุณ
            {data ? ` · ${dayLabel(data.today, { year: 'numeric' })}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={reload}
            disabled={loading}
            className="[&&]:rounded-xl [&&]:text-13"
          >
            <Icon name="refresh" width="17" />
            อัปเดตข้อมูล
          </Button>
          <Button href={paths.home} className="[&&]:rounded-xl [&&]:text-13">
            สร้างลิงก์ใหม่ <Icon name="arrow" width="17" />
          </Button>
        </div>
      </div>
      {error && (
        <div role="alert" className="mb-6 rounded-2xl bg-warning-surface p-5 text-14 text-warning">
          {error}{' '}
          <button onClick={reload} className="ml-2 font-semibold underline">
            ลองอีกครั้ง
          </button>
        </div>
      )}
      <dl className="mb-6 grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.key}
            className="min-w-0 rounded-2xl border border-admin-line bg-linear-to-br from-white to-admin-soft p-6"
          >
            <div className="mb-5 flex items-center justify-between gap-3">
              <dt className="text-14 font-medium text-text-secondary">{stat.label}</dt>
              <span className="rounded-xl border border-admin-line bg-white/70 p-2.5 text-text-secondary">
                <Icon name={stat.icon} width="20" />
              </span>
            </div>
            <dd className="flex flex-wrap items-baseline gap-2">
              <span className="break-all font-display text-[40px] font-semibold leading-tight tracking-tight tabular-nums">
                {data ? BigInt(data[stat.key]).toLocaleString('th-TH') : '—'}
              </span>
              <span className="text-13 text-text-muted">{stat.unit}</span>
            </dd>
            <p className="mt-4 text-12 leading-6 text-text-muted">{stat.caption}</p>
          </div>
        ))}
      </dl>
      {loading && (
        <div
          role="status"
          className="rounded-2xl border border-admin-line bg-white p-12 text-center text-14 text-text-muted"
        >
          กำลังโหลดภาพรวม…
        </div>
      )}
      {data && (
        <div className="space-y-6">
          <DashboardChart data={data} />
          <section
            className="overflow-hidden rounded-2xl border border-admin-line bg-white"
            aria-labelledby="popular-links-title"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-admin-line p-5 sm:px-7">
              <div>
                <h2 id="popular-links-title" className="text-18 font-semibold">
                  ลิงก์ยอดนิยม 5 อันดับ
                </h2>
                <p className="mt-1 text-13 text-text-muted">เรียงตามยอดเปิดสะสม</p>
              </div>
              <a
                href={paths.myLinks}
                className="inline-flex items-center gap-2 text-13 font-medium text-text-secondary hover:underline"
              >
                จัดการลิงก์ทั้งหมด <Icon name="arrow" width="16" />
              </a>
            </div>
            {data.topLinks.length ? (
              <ol className="divide-y divide-admin-line">
                {data.topLinks.map((link, index) => (
                  <li key={link.id} className="flex flex-wrap items-center gap-4 p-5 sm:px-7">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-admin-soft text-14 font-semibold text-text-secondary">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <a
                        href={link.shortUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex max-w-full items-center gap-2 text-16 font-semibold text-text-secondary hover:text-text"
                      >
                        <span className="truncate">{link.shortCode}</span>
                        <Icon name="external" width="16" />
                      </a>
                      <p className="mt-1 truncate text-12 text-text-muted" title={link.originalUrl}>
                        {link.originalUrl}
                      </p>
                    </div>
                    <div className="ml-auto text-right">
                      <p className="break-all text-25 font-semibold tabular-nums">
                        {BigInt(link.clickCount).toLocaleString('th-TH')}
                      </p>
                      <p className="text-12 text-text-muted">ครั้ง</p>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="px-6 py-12 text-center">
                <Icon name="chart" className="mx-auto mb-4 text-text-muted" />
                <p className="text-16 font-medium">ยังไม่มีลิงก์ที่ถูกเปิด</p>
                <p className="mt-2 text-13 text-text-muted">
                  แชร์ลิงก์สั้นของคุณ แล้วกลับมาดูผลได้ที่นี่
                </p>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
