import { apiRequest } from '../../shared/api/client.js';
import { readUser } from './validation.js';
import { setAccessToken, clearAccessToken, getAccessToken } from '../../shared/api/session.js';
export async function getCurrentUser() {
  if (!getAccessToken()) throw Object.assign(new Error('Login required'), { status: 401 });
  return readUser(await apiRequest('/api/auth/me'));
}
export async function authenticateUser(mode, credentials) {
  clearAccessToken();
  const data = await apiRequest(`/api/auth/${mode === 'signup' ? 'register' : 'login'}`, {
    method: 'POST',
    body: credentials,
    auth: false,
  });
  const user = readUser(data);
  if (
    typeof data.accessToken !== 'string' ||
    !data.accessToken ||
    !Number.isSafeInteger(data.expiresAt) ||
    data.expiresAt <= Date.now() / 1000
  )
    throw Object.assign(new Error('Invalid session response'), {
      status: 502,
      code: 'INVALID_RESPONSE',
    });
  setAccessToken(data.accessToken, data.expiresAt);
  return user;
}
export async function logoutUser() {
  await apiRequest('/api/auth/logout', { method: 'POST', body: {} });
  clearAccessToken();
}
export function changeOwnPassword(body) {
  return apiRequest('/api/auth/change-password', { method: 'POST', body });
}
