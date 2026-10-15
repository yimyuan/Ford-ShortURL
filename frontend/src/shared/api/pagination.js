import { ApiError } from './client.js';
export const tablePageSize = 10;
export function readPage(data) {
  if (
    !Array.isArray(data?.items) ||
    data.items.length > tablePageSize ||
    !Number.isSafeInteger(data.total) ||
    data.total < 0 ||
    !Number.isSafeInteger(data.page) ||
    data.page < 1 ||
    data.pageSize !== tablePageSize
  )
    throw new ApiError(502, 'INVALID_RESPONSE', 'Invalid paginated response');
  return data;
}
