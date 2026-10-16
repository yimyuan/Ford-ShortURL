import { getAccessToken, expireSession } from './session.js';
export class ApiError extends Error {
  constructor(status, code, message) {
    super(message || code);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}
export function apiOrigin(value = import.meta.env?.VITE_API_ORIGIN || '') {
  if (!value) return '';
  const url = new URL(value);
  if (
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash ||
    (url.protocol !== 'https:' &&
      !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))
  )
    throw new Error('VITE_API_ORIGIN must be an HTTPS origin');
  return url.origin;
}
export async function apiRequest(path, { auth = true, ...options } = {}) {
  if (!path.startsWith('/api/')) throw new ApiError(400, 'INVALID_API_PATH', 'Invalid API path');
  const { body, headers, responseType, ...rest } = options;
  const token = auth ? getAccessToken() : null;
  const response = await fetch(`${apiOrigin()}${path}`, {
    ...rest,
    signal: rest.signal
      ? AbortSignal.any([rest.signal, AbortSignal.timeout(15000)])
      : AbortSignal.timeout(15000),
    credentials: 'omit',
    headers: {
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (response.status === 401 && token && getAccessToken() === token) expireSession();
  if (response.ok && responseType === 'blob') return response.blob();
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!response.ok)
    throw new ApiError(
      response.status,
      data?.error?.code || 'REQUEST_FAILED',
      data?.error?.message,
    );
  if (response.status !== 204 && data === null)
    throw new ApiError(502, 'INVALID_RESPONSE', 'Invalid service response');
  return data;
}
