export class ApiError extends Error {
  constructor(status, code, message) {
    super(message || code);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

let refreshPromise;

async function renewSession() {
  // A different tab may already have refreshed the shared HttpOnly cookies.
  try {
    await request('/api/auth/me');
    return;
  } catch (error) {
    if (error.status !== 401) throw error;
  }
  await request('/api/auth/refresh', { method: 'POST', body: {} });
}

function refreshSession() {
  return typeof navigator !== 'undefined' && navigator.locks?.request
    ? navigator.locks.request('shorturl.session-refresh', renewSession)
    : renewSession();
}

async function request(path, options = {}) {
  const { body, headers, responseType, ...rest } = options;
  const response = await fetch(path, {
    ...rest,
    signal: rest.signal
      ? AbortSignal.any([rest.signal, AbortSignal.timeout(15000)])
      : AbortSignal.timeout(15000),
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
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

export async function apiRequest(path, { skipRefresh = false, ...options } = {}) {
  try {
    return await request(path, options);
  } catch (error) {
    if (error.status !== 401 || skipRefresh || options.signal?.aborted) throw error;
    if (!refreshPromise) {
      refreshPromise = refreshSession().finally(() => {
        refreshPromise = null;
      });
    }
    try {
      await refreshPromise;
    } catch (refreshError) {
      throw refreshError.status === 401 ? error : refreshError;
    }
    return request(path, options);
  }
}
