import { AppError } from '../../errors/app-error.js';
export const adminPageSize = 10;
export function parseAdminList(input = {}, kind = 'users') {
  const allowed = ['page', 'query', 'filter'];
  if (
    Object.keys(input).some((key) => !allowed.includes(key)) ||
    (input.page !== undefined &&
      (typeof input.page !== 'string' || !/^[1-9]\d{0,5}$/.test(input.page))) ||
    (input.query !== undefined && typeof input.query !== 'string') ||
    (input.filter !== undefined && typeof input.filter !== 'string')
  )
    throw new AppError(422, 'INVALID_LIST_QUERY', 'ตัวกรองรายการไม่ถูกต้อง');
  const query = (input.query ?? '').trim();
  const filter = input.filter ?? 'all';
  if (
    query.length > (kind === 'users' ? 254 : 8192) ||
    !['all', 'active', 'inactive', ...(kind === 'users' ? ['user', 'admin'] : [])].includes(filter)
  )
    throw new AppError(422, 'INVALID_LIST_QUERY', 'ตัวกรองรายการไม่ถูกต้อง');
  return { page: Number(input.page ?? 1), pageSize: adminPageSize, query, filter };
}
export const parseAdminUsers = (input) => parseAdminList(input, 'users');
export const parseAdminLinks = (input) => parseAdminList(input, 'links');
export function searchPattern(query) {
  return `%${query.replace(/[\\%_]/g, (character) => '\\' + character)}%`;
}
export function filterAdminList(request, { filter }) {
  if (['user', 'admin'].includes(filter)) return request.eq('role', filter);
  if (filter === 'active' || filter === 'inactive')
    return request.eq('is_active', filter === 'active');
  return request;
}
