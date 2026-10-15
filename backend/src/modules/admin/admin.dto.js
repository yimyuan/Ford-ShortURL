import { AppError } from '../../errors/app-error.js';
export const adminActions = ['change_role', 'suspend', 'activate', 'reset_password', 'delete_user'];
export function parseUserId(value) {
  if (
    typeof value !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  )
    throw new AppError(422, 'INVALID_USER_ID', 'Invalid user ID');
  return value;
}
export function parseAdminAction(input) {
  if (
    !input ||
    typeof input !== 'object' ||
    Array.isArray(input) ||
    input.confirmed !== true ||
    Object.keys(input).some(
      (key) =>
        !['action', 'confirmed', 'version', 'role', 'emailConfirmation', 'linkCount'].includes(key),
    ) ||
    !adminActions.includes(input.action) ||
    typeof input.version !== 'string' ||
    !/^\d{1,18}$/.test(input.version) ||
    (input.action === 'change_role' && !['user', 'admin'].includes(input.role)) ||
    (input.action === 'delete_user' &&
      (typeof input.emailConfirmation !== 'string' ||
        !Number.isSafeInteger(input.linkCount) ||
        input.linkCount < 0))
  ) {
    throw new AppError(422, 'CONFIRMATION_REQUIRED', 'กรุณาตรวจสอบข้อมูลและยืนยันการดำเนินการ');
  }
  return { ...input };
}
export function parseAuditQuery(input = {}) {
  if (
    Object.keys(input).some((key) => !['query', 'action', 'from', 'to', 'page'].includes(key)) ||
    ['query', 'action', 'from', 'to', 'page'].some(
      (key) => input[key] !== undefined && typeof input[key] !== 'string',
    ) ||
    (input.page !== undefined && !/^[1-9]\d{0,5}$/.test(input.page))
  )
    throw new AppError(422, 'INVALID_AUDIT_QUERY', 'ตัวกรองประวัติไม่ถูกต้อง');
  const query = String(input.query ?? '').trim();
  const action = String(input.action ?? '');
  const from = String(input.from ?? '');
  const to = String(input.to ?? '');
  const page = Number(input.page ?? 1);
  const date = (value) =>
    !value ||
    (/^\d{4}-\d{2}-\d{2}$/.test(value) &&
      !Number.isNaN(Date.parse(value)) &&
      new Date(value).toISOString().slice(0, 10) === value);
  if (
    query.length > 254 ||
    !/^[\p{L}\p{N}@. +_-]*$/u.test(query) ||
    ![
      ...adminActions,
      'change_password',
      'link_enable',
      'link_disable',
      'link_delete',
      '',
    ].includes(action) ||
    !date(from) ||
    !date(to) ||
    (from && to && from > to) ||
    !Number.isSafeInteger(page) ||
    page < 1 ||
    page > 100000
  )
    throw new AppError(422, 'INVALID_AUDIT_QUERY', 'ตัวกรองประวัติไม่ถูกต้อง');
  return { query, action, from, to, page };
}
