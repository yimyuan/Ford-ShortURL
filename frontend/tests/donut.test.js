import test from 'node:test';
import assert from 'node:assert/strict';
import { donutSegments } from '../src/shared/ui/donut.js';
test('donuts preserve exact count inputs and split offsets in order', () => {
  const rows = [
    { key: 'active', value: '12' },
    { key: 'disabled', value: '5' },
    { key: 'suspended', value: '3' },
  ];
  const segments = donutSegments('20', rows);
  assert.deepEqual(
    segments.map((item) => [item.percent, item.offset, item.displayPercent]),
    [
      [60, 0, 60],
      [25, 60, 25],
      [15, 85, 15],
    ],
  );
  assert.deepEqual(
    donutSegments('0', [{ key: 'a', value: '0' }]).map((item) => item.percent),
    [0],
  );
  assert.equal(
    donutSegments('9007199254740993', [{ key: 'a', value: '9007199254740993' }])[0].percent,
    100,
  );
  assert.equal(donutSegments('3', [{ key: 'a', value: '1' }])[0].displayPercent, 33.3);
});
