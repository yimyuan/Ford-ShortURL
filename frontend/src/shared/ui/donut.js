export function donutSegments(total, rows) {
  const count = BigInt(total);
  let offset = 0;
  return rows.map((row) => {
    const value = BigInt(row.value);
    const percent = count > 0n ? Number((value * 1000000n) / count) / 10000 : 0;
    const displayPercent = count > 0n ? Number((value * 1000n + count / 2n) / count) / 10 : 0;
    const segment = { ...row, percent, displayPercent, offset };
    offset += percent;
    return segment;
  });
}
