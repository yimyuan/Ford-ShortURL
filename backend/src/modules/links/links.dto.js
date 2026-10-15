import { AppError } from '../../errors/app-error.js';
import { isValidShortCode } from './short-code.js';
export function parseCreateLink(input) {
  if (
    !input ||
    typeof input !== 'object' ||
    Array.isArray(input) ||
    Object.keys(input).some((key) => !['originalUrl', 'customCode'].includes(key)) ||
    typeof input.originalUrl !== 'string' ||
    input.originalUrl.length > 8192
  )
    throw new AppError(422, 'INVALID_URL', 'Invalid URL');
  let customCode;
  if (input.customCode !== undefined) {
    if (typeof input.customCode !== 'string')
      throw new AppError(422, 'INVALID_CUSTOM_CODE', 'Invalid custom short name');
    customCode = input.customCode.trim();
    if (customCode && !isValidShortCode(customCode))
      throw new AppError(
        422,
        'INVALID_CUSTOM_CODE',
        'Use 3-40 letters, digits or hyphens; start and end with a letter or digit',
      );
  }
  try {
    const url = new URL(input.originalUrl.trim());
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password)
      throw new Error();
    return {
      originalUrl: url.toString(),
      ...(customCode ? { customCode } : {}),
    };
  } catch {
    throw new AppError(422, 'INVALID_URL', 'Use an HTTP or HTTPS URL');
  }
}
export function toLinkDto(link) {
  return {
    id: link.id,
    ...(link.qr_style ? { qrStyle: link.qr_style, qrVersion: String(link.qr_version ?? 0) } : {}),
    shortCode: link.short_code,
    originalUrl: link.original_url,
    clickCount: String(link.click_count),
    createdAt: link.created_at,
  };
}
export function parseLinkPage(input = {}) {
  if (
    Object.keys(input).some(
      (key) => !['page', 'query', 'clicks', 'period', 'sort'].includes(key),
    ) ||
    (input.query !== undefined && (typeof input.query !== 'string' || input.query.length > 8192)) ||
    (input.clicks !== undefined && !['all', 'opened', 'unopened'].includes(input.clicks)) ||
    (input.period !== undefined && !['all', 'today', '7d', '30d'].includes(input.period)) ||
    (input.sort !== undefined && !['newest', 'oldest', 'clicks'].includes(input.sort)) ||
    (input.page !== undefined &&
      (typeof input.page !== 'string' || !/^[1-9]\d{0,5}$/.test(input.page)))
  ) {
    throw new AppError(422, 'INVALID_PAGE', 'Invalid history page');
  }
  return {
    page: Number(input.page || 1),
    pageSize: 10,
    ...(input.query?.trim() ? { query: input.query.trim() } : {}),
    ...(input.clicks && input.clicks !== 'all' ? { clicks: input.clicks } : {}),
    ...(input.period && input.period !== 'all' ? { period: input.period } : {}),
    ...(input.sort && input.sort !== 'newest' ? { sort: input.sort } : {}),
  };
}
export function parseLinkId(id) {
  if (
    typeof id !== 'string' ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(id)
  )
    throw new AppError(404, 'LINK_NOT_FOUND', 'Link not found');
  return id;
}
