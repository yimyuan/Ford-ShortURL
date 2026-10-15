import { Icon } from '../../../shared/ui/index.js';
import Panel from './AdminPanel.jsx';
import AdminStatusSummary from './AdminStatusSummary.jsx';
import AdminTodaySummary from './AdminTodaySummary.jsx';
export default function AdminOverview({ model }) {
  const { metrics, summary } = model;
  const ready = summary.status === 'ready';
  const data = ready ? summary.data : null;
  return (
    <>
      <section
        aria-label="สรุปข้อมูลระบบ"
        className="grid grid-cols-1 gap-4 min-[430px]:grid-cols-2 xl:grid-cols-4"
      >
        {metrics.map((metric) => (
          <Panel
            key={metric.label}
            className="[--panel-surface:var(--background-image-admin-stat)] [--panel-border:var(--color-admin-stat-border)] [--panel-shadow:var(--shadow-admin-stat)]"
          >
            <div className="p-6 text-admin-heading-text">
              <div className="mb-5 flex min-h-10 items-start justify-between gap-3">
                <span className="pt-2 text-15 font-medium leading-6 text-admin-heading-text">
                  {metric.label}
                </span>
                <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-admin-stat-border bg-white/50 text-admin-sidebar-active">
                  <Icon name={metric.icon} width="19" height="19" />
                </span>
              </div>
              <p className="break-all font-display text-[42px] font-medium leading-[1.15] tracking-[-1px] tabular-nums">
                {metric.value === null ? '—' : metric.value.toLocaleString('th-TH')}
              </p>
              <p className="mt-4 border-t border-admin-stat-border/60 pt-3 text-13 leading-6 text-text-muted">
                {metric.value === null ? 'รอข้อมูลจริง · ' : ''}
                {metric.caption}
              </p>
            </div>
          </Panel>
        ))}
      </section>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <AdminStatusSummary
          title="สถานะบัญชี"
          icon="users"
          ready={ready}
          total={data?.users ?? '0'}
          rows={[
            {
              key: 'active',
              label: 'บัญชีเปิดใช้งาน',
              tone: 'success',
              value: data?.usersActive ?? '0',
            },
            {
              key: 'suspended',
              label: 'บัญชีถูกระงับ',
              tone: 'warning',
              value: data?.usersSuspended ?? '0',
            },
          ]}
        />
        <AdminStatusSummary
          title="สถานะลิงก์"
          icon="link"
          ready={ready}
          total={data?.links ?? '0'}
          rows={[
            {
              key: 'active',
              label: 'ลิงก์ใช้งานได้',
              tone: 'success',
              value: data?.linksActive ?? '0',
            },
            {
              key: 'disabled',
              label: 'ลิงก์ที่ปิดไว้',
              tone: 'danger',
              value: data?.linksDisabled ?? '0',
            },
            {
              key: 'suspended',
              label: 'หยุดเพราะเจ้าของถูกระงับ',
              tone: 'warning',
              value: data?.linksOwnerSuspended ?? '0',
            },
          ]}
        />
      </div>
      <AdminTodaySummary data={data} />
    </>
  );
}
