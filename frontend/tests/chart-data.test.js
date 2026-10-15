import test from 'node:test';
import assert from 'node:assert/strict';
import { dashboardChartData, exactClicks } from '../src/features/dashboard/chart-data.js';
test('Recharts geometry retains missing days and zero while labels preserve exact BIGINT values', () => {
  const rows = dashboardChartData([
    { day: '2026-10-14', clicks: null },
    { day: '2026-10-15', clicks: '0' },
    { day: '2026-10-16', clicks: '9007199254740993' },
  ]);
  assert.equal(rows[0].plotValue, null);
  assert.equal(rows[1].plotValue, 0);
  assert.ok(Number.isFinite(rows[2].plotValue));
  assert.equal(rows[2].clicks, '9007199254740993');
  assert.equal(exactClicks(rows[2].clicks), '9,007,199,254,740,993 ครั้ง');
  assert.equal(exactClicks(null), 'ยังไม่ได้เก็บข้อมูล');
});
