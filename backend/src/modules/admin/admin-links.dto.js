import { AppError } from '../../errors/app-error.js';
import { parseAdminList } from './admin-query.js';
import { isValidShortCode } from '../links/short-code.js';
export const linkActions = ['link_enable', 'link_disable', 'link_delete'];
export function parseOwnerList(input = {}) {
  const result = parseAdminList(input, 'links');
  if (result.query.length > 254)
    throw new AppError(422, 'INVALID_LIST_QUERY', 'อีเมลค้นหายาวเกินกำหนด');
  return result;
}
export function parseOwnerLinks(input = {}) {
  const filter = input.filter ?? 'all';
  if (!['all', 'active', 'inactive', 'owner_suspended'].includes(filter))
    throw new AppError(422, 'INVALID_LIST_QUERY', 'ตัวกรองลิงก์ไม่ถูกต้อง');
  return {
    ...parseAdminList({ ...input, filter: filter === 'owner_suspended' ? 'all' : filter }, 'links'),
    filter,
  };
}
export function parseLinkAction(input) {
  if (
    !input ||
    Array.isArray(input) ||
    input.confirmed !== true ||
    !linkActions.includes(input.action) ||
    typeof input.version !== 'string' ||
    !/^\d{1,18}$/.test(input.version) ||
    Object.keys(input).some(
      (key) => !['action', 'version', 'confirmed', 'codeConfirmation'].includes(key),
    ) ||
    (input.action === 'link_delete' && !isValidShortCode(input.codeConfirmation))
  )
    throw new AppError(422, 'CONFIRMATION_REQUIRED', 'กรุณาตรวจสอบและยืนยันการจัดการลิงก์');
  return { ...input };
}
