// Memory only: no cookies, localStorage, sessionStorage, or refresh tokens.
let token = null;
let expiresAt = 0;
let timer;
const listeners = new Set();
export function clearAccessToken() {
  clearTimeout(timer);
  token = null;
  expiresAt = 0;
}
export function expireSession() {
  clearAccessToken();
  for (const listener of listeners) listener();
}
export function setAccessToken(value, expiry) {
  clearAccessToken();
  token = value;
  expiresAt = expiry;
  timer = setTimeout(expireSession, Math.max(0, expiry * 1000 - Date.now()));
  timer.unref?.();
}
export function getAccessToken() {
  if (token && expiresAt * 1000 <= Date.now()) expireSession();
  return token;
}
export function onSessionExpired(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
