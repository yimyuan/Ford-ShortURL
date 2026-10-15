import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import useReducedMotion from '../../../shared/hooks/useReducedMotion.js';
import { dashboardChartData, exactClicks, dayLabel } from '../chart-data.js';

export function DailyTooltip({ active, label, rows }) {
  if (!active) return null;
  const row = rows.find((item) => item.day === label);
  if (!row) return null;
  return (
    <div className="rounded-xl border border-admin-line bg-white px-4 py-3 shadow-lg">
      <p className="text-12 text-text-muted">{dayLabel(row.day)}</p>
      <p className="mt-1 text-15 font-semibold tabular-nums text-text">{exactClicks(row.clicks)}</p>
    </div>
  );
}

export default function DashboardBarChart({ daily }) {
  const rows = dashboardChartData(daily);
  const reduced = useReducedMotion();
  const max = Math.max(1, ...rows.map((row) => row.plotValue || 0));
  const compact = new Intl.NumberFormat('th-TH', { notation: 'compact', maximumFractionDigits: 1 });
  return (
    <div className="h-72 min-w-0 w-full" aria-label="กราฟแท่งยอดเปิดลิงก์รายวัน">
      <ResponsiveContainer
        width="100%"
        height="100%"
        minWidth={0}
        initialDimension={{ width: 640, height: 288 }}
      >
        <BarChart
          data={rows}
          margin={{ top: 10, right: 8, bottom: 10, left: 0 }}
          accessibilityLayer
        >
          <CartesianGrid vertical={false} stroke="var(--color-admin-line)" strokeDasharray="4 5" />
          <XAxis
            dataKey="day"
            axisLine={false}
            tickLine={false}
            tickMargin={12}
            tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
            minTickGap={8}
            tickFormatter={(day) =>
              `${dayLabel(day)}${rows.find((row) => row.day === day)?.clicks === null ? ' *' : ''}`
            }
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
            width={48}
            domain={[0, max === 1 ? 1 : 'auto']}
            tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
            tickFormatter={(value) => compact.format(value)}
          />
          <Tooltip
            filterNull={false}
            cursor={{ fill: 'var(--color-admin-soft)' }}
            content={(props) => <DailyTooltip {...props} rows={rows} />}
          />
          <Bar
            dataKey="plotValue"
            name="ยอดเปิดลิงก์"
            fill="var(--color-text-secondary)"
            radius={[6, 6, 0, 0]}
            maxBarSize={48}
            isAnimationActive={!reduced}
            animationDuration={550}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
