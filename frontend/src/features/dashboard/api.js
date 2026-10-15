import { apiRequest, ApiError } from '../../shared/api/client.js';
const count = (value) => typeof value === 'string' && /^\d{1,40}$/.test(value);
const day = (value) =>
  typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(`${value}T00:00:00Z`));
export function readDashboard(data) {
  if (
    !data ||
    !['totalLinks', 'totalClicks', 'clickedLinks'].every((key) => count(data[key])) ||
    data.timezone !== 'Asia/Bangkok' ||
    !day(data.today) ||
    !Number.isFinite(Date.parse(data.trackingSince)) ||
    !Array.isArray(data.daily) ||
    data.daily.length !== 7 ||
    !data.daily.every(
      (row, index) =>
        day(row?.day) &&
        (row.clicks === null || count(row.clicks)) &&
        Date.parse(`${row.day}T00:00:00Z`) ===
          Date.parse(`${data.today}T00:00:00Z`) - (6 - index) * 86400000,
    ) ||
    !Array.isArray(data.topLinks) ||
    data.topLinks.length > 5 ||
    !data.topLinks.every(
      (row) =>
        typeof row?.id === 'string' &&
        typeof row.shortCode === 'string' &&
        typeof row.shortUrl === 'string' &&
        typeof row.originalUrl === 'string' &&
        count(row.clickCount),
    )
  )
    throw new ApiError(502, 'INVALID_RESPONSE', 'Invalid dashboard response');
  return data;
}
export const getUserDashboard = (options) =>
  apiRequest('/api/dashboard', options).then(readDashboard);
