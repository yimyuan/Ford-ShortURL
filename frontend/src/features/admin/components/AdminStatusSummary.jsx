import { Icon } from '../../../shared/ui/index.js';
import Panel from './AdminPanel.jsx';
import DonutChart from '../../../shared/ui/DonutChart.jsx';
import { donutSegments } from '../../../shared/ui/donut.js';
export default function AdminStatusSummary({ title, icon, total, rows, ready }) {
  const colors = { success: 'bg-success', warning: 'bg-warning', danger: 'bg-danger' };
  const segments = donutSegments(ready ? total : '0', rows);
  return (
    <Panel as="section">
      <div className="flex items-center gap-3 border-b border-admin-line px-6 py-5">
        <span className="grid size-10 place-items-center rounded-xl bg-admin-heading text-admin-heading-text">
          <Icon name={icon} width="20" />
        </span>
        <h2 className="text-18 font-semibold text-admin-heading-text">{title}</h2>
      </div>
      <div className="grid items-center gap-6 p-6 min-[540px]:grid-cols-[176px_minmax(0,1fr)]">
        <DonutChart label={title} total={total} segments={segments} ready={ready} />
        <dl className="min-w-0 space-y-4">
          {segments.map((row) => (
            <div key={row.key} className="flex items-center justify-between gap-4">
              <dt className="flex items-center gap-2.5 text-15 text-text-secondary">
                <span
                  className={`size-2 shrink-0 rounded-full ${colors[row.tone]}`}
                  aria-hidden="true"
                />
                {row.label}
              </dt>
              <dd className="shrink-0 text-right">
                <span className="block font-display text-20 font-semibold tabular-nums text-admin-heading-text">
                  {ready ? BigInt(row.value).toLocaleString('th-TH') : '—'}
                </span>
                <span className="block font-display text-12 tabular-nums text-text-muted">
                  {ready
                    ? `${row.displayPercent.toLocaleString('th-TH', { maximumFractionDigits: 1 })}%`
                    : '—'}
                </span>
              </dd>
            </div>
          ))}
        </dl>
        {ready && BigInt(total) === 0n && (
          <p className="text-center text-13 text-text-muted min-[540px]:col-span-2">
            ยังไม่มีข้อมูลในระบบ
          </p>
        )}
      </div>
    </Panel>
  );
}
