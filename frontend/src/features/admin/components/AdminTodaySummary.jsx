import { Icon } from '../../../shared/ui/index.js';
import Panel from './AdminPanel.jsx';
export default function AdminTodaySummary({ data }) {
  const ready = !!data;
  const date = data
    ? new Date(`${data.today}T00:00:00+07:00`).toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'Asia/Bangkok',
      })
    : 'กำลังโหลดข้อมูล';
  return (
    <Panel as="section">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-admin-line px-6 py-5">
        <h2 className="text-18 font-semibold text-admin-heading-text">ข้อมูลวันนี้</h2>
        <p className="text-13 text-text-muted">{date} · เวลาไทย</p>
      </div>
      <dl className="grid grid-cols-1 divide-y divide-admin-line sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        {[
          { key: 'usersToday', label: 'ผู้สมัครใหม่วันนี้', icon: 'users', unit: 'บัญชี' },
          { key: 'linksToday', label: 'ลิงก์ที่สร้างวันนี้', icon: 'link', unit: 'ลิงก์' },
        ].map((item) => (
          <div key={item.key} className="flex items-center gap-4 p-6">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-admin-heading text-admin-heading-text">
              <Icon name={item.icon} width="23" />
            </span>
            <div>
              <dt className="text-15 text-text-muted">{item.label}</dt>
              <dd className="mt-1 flex items-baseline gap-2">
                <span className="font-display text-28 font-semibold tabular-nums text-admin-heading-text">
                  {ready ? BigInt(data[item.key]).toLocaleString('th-TH') : '—'}
                </span>
                <span className="text-13 text-text-muted">{item.unit}</span>
              </dd>
            </div>
          </div>
        ))}
      </dl>
    </Panel>
  );
}
