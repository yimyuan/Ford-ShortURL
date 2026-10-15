import { apiRequest } from '../../shared/api/client.js';
import { readUser } from './validation.js';
export async function getCurrentUser() {
  return readUser(await apiRequest('/api/auth/me'));
}
export async function authenticateUser(mode, credentials) {
  return readUser(
    await apiRequest(`/api/auth/${mode === 'signup' ? 'register' : 'login'}`, {
      method: 'POST',
      body: credentials,
      skipRefresh: true,
    }),
  );
}
export function logoutUser() {
  return apiRequest('/api/auth/logout', { method: 'POST', body: {}, skipRefresh: true });
}
export function changeOwnPassword(body) {
  return apiRequest('/api/auth/change-password', { method: 'POST', body });
}
