export function dayLabel(day, options = {}) {
  return new Date(`${day}T00:00:00+07:00`).toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    timeZone: 'Asia/Bangkok',
    ...options,
  });
}
export function dashboardChartData(daily) {
  return daily.map((row) => ({
    ...row,
    plotValue: row.clicks === null ? null : Number(row.clicks),
  }));
}
export const exactClicks = (value) =>
  value === null ? 'ยังไม่ได้เก็บข้อมูล' : `${BigInt(value).toLocaleString('th-TH')} ครั้ง`;
