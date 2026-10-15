const strokes = { success: 'stroke-success', warning: 'stroke-warning', danger: 'stroke-danger' };
export default function DonutChart({ total, segments, ready, label }) {
  const formatted = ready ? BigInt(total).toLocaleString('th-TH') : '—';
  return (
    <div className="relative mx-auto size-44 shrink-0">
      <svg
        viewBox="0 0 160 160"
        role="img"
        aria-label={
          ready
            ? `${label} รวม ${formatted} รายการ · ${segments.map((item) => `${item.label} ${BigInt(item.value).toLocaleString('th-TH')} รายการ`).join(' · ')}`
            : `${label} กำลังโหลดข้อมูล`
        }
        className="size-full"
      >
        <circle
          cx="80"
          cy="80"
          r="62"
          fill="none"
          strokeWidth="16"
          className="stroke-admin-heading/60"
        />
        <g transform="rotate(-90 80 80)">
          {ready &&
            segments
              .filter((item) => item.percent > 0)
              .map((item) => (
                <circle
                  key={item.key}
                  cx="80"
                  cy="80"
                  r="62"
                  fill="none"
                  strokeWidth="16"
                  pathLength="100"
                  strokeDasharray={`${item.percent} ${100 - item.percent}`}
                  strokeDashoffset={-item.offset}
                  className={`ui-donut-segment ${strokes[item.tone]}`}
                  style={{ '--donut-length': item.percent, '--donut-rest': 100 - item.percent }}
                />
              ))}
        </g>
      </svg>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 px-8 text-center"
      >
        <span className="text-12 text-text-muted">ทั้งหมด</span>
        <span
          className={
            formatted.length > 12
              ? 'max-w-full break-all font-display text-16 font-semibold tabular-nums leading-tight text-admin-heading-text'
              : formatted.length > 7
                ? 'max-w-full break-all font-display text-22 font-semibold tabular-nums leading-tight text-admin-heading-text'
                : 'max-w-full break-all font-display text-32 font-semibold tabular-nums leading-tight text-admin-heading-text'
          }
        >
          {formatted}
        </span>
      </div>
    </div>
  );
}
