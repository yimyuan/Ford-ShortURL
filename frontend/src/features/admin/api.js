import { ApiError, apiRequest } from '../../shared/api/client.js';
import { readPage } from '../../shared/api/pagination.js';
function queryString(filters) {
  return new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== ''));
}
async function list(path, filters, options) {
  return readPage(await apiRequest(`${path}?${queryString(filters)}`, options));
}
export function listAdminUsers(filters = { page: 1 }, options) {
  return list('/api/admin/users', filters, options);
}
export function listAdminLinks(filters = { page: 1 }, options) {
  return list('/api/admin/links', filters, options);
}
export async function getAdminSummary(options) {
  const data = await apiRequest('/api/admin/summary', options);
  if (
    !data ||
    ![
      'users',
      'admins',
      'links',
      'clicks',
      'usersActive',
      'usersSuspended',
      'linksActive',
      'linksDisabled',
      'linksOwnerSuspended',
      'usersToday',
      'linksToday',
    ].every((key) => typeof data[key] === 'string' && /^\d+$/.test(data[key])) ||
    data.timezone !== 'Asia/Bangkok' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(data.today ?? '')
  )
    throw new ApiError(502, 'INVALID_RESPONSE', 'Invalid summary response');
  return data;
}
export function getUserImpact(id, options) {
  return apiRequest(`/api/admin/users/${encodeURIComponent(id)}/impact`, options);
}
export function manageUser(id, body) {
  return apiRequest(`/api/admin/users/${encodeURIComponent(id)}`, { method: 'PATCH', body });
}
export function listAdminHistory(filters = { page: 1 }, options) {
  return list('/api/admin/history', filters, options);
}
const ownerPath = (id) => `/api/admin/link-owners/${encodeURIComponent(id)}/links`;
export function listLinkOwners(filters = { page: 1 }, options) {
  return list('/api/admin/link-owners', filters, options);
}
export function listOwnerLinks(id, filters = { page: 1 }, options) {
  return list(ownerPath(id), filters, options);
}
export function getAdminLink(owner, id, options) {
  return apiRequest(`${ownerPath(owner)}/${encodeURIComponent(id)}`, options);
}
export function manageAdminLink(owner, id, body) {
  return apiRequest(`${ownerPath(owner)}/${encodeURIComponent(id)}`, { method: 'PATCH', body });
}
export function getAdminLinkQr(owner, id, options) {
  return apiRequest(`${ownerPath(owner)}/${encodeURIComponent(id)}/qr`, {
    ...options,
    responseType: 'blob',
  });
}
