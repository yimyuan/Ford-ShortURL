import { apiRequest } from '../../shared/api/client.js';
import { readHistory, readLink } from './validation.js';
export async function createLink(
  originalUrl,
  customCode = '',
  requestId = globalThis.crypto.randomUUID(),
) {
  return readLink(
    await apiRequest('/api/links', {
      method: 'POST',
      headers: { 'Idempotency-Key': requestId },
      body: { originalUrl, ...(customCode ? { customCode } : {}) },
    }),
  );
}
export async function listLinks(page, { query, clicks, period, sort, ...options } = {}) {
  const params = new URLSearchParams({ page: String(page) });
  if (query) params.set('query', query);
  if (clicks && clicks !== 'all') params.set('clicks', clicks);
  if (period && period !== 'all') params.set('period', period);
  if (sort && sort !== 'newest') params.set('sort', sort);
  return readHistory(await apiRequest(`/api/links?${params}`, options));
}
export function getLink(id, options) {
  return apiRequest(`/api/links/${encodeURIComponent(id)}`, options).then(readLink);
}
export function saveLinkQr(id, style, version) {
  return apiRequest(`/api/links/${encodeURIComponent(id)}/qr`, {
    method: 'PATCH',
    body: { style, version, confirmed: true },
  });
}
export function getLinkQr(id, { style, format, ...options } = {}) {
  const query = new URLSearchParams();
  if (style) {
    for (const key of ['dark', 'light', 'size']) query.set(key, String(style[key]));
    if (style.shape) query.set('shape', style.shape);
  }
  if (format) query.set('format', format);
  return apiRequest(`/api/links/${encodeURIComponent(id)}/qr${query.size ? `?${query}` : ''}`, {
    ...options,
    responseType: 'blob',
  });
}
