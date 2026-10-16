import { config } from '../config.js';
import { AppError } from '../errors/app-error.js';
export function allowedOrigins(settings = config) {
  let url;
  try {
    url = new URL(settings.appOrigin);
  } catch {
    throw new AppError(503, 'ORIGIN_NOT_READY', 'Application origin is invalid');
  }
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash ||
    (settings.production && url.protocol !== 'https:')
  )
    throw new AppError(503, 'ORIGIN_NOT_READY', 'Application origin is invalid');
  const allowed = new Set([url.origin]);
  if (!settings.production && ['localhost', '127.0.0.1'].includes(url.hostname)) {
    url.hostname = url.hostname === 'localhost' ? '127.0.0.1' : 'localhost';
    allowed.add(url.origin);
  }
  return allowed;
}
export function createCors(settings = config) {
  return (req, res, next) => {
    const origin = req.get('origin');
    if (!origin) return next();
    let allowed;
    try {
      allowed = allowedOrigins(settings);
    } catch (error) {
      return next(error);
    }
    res.vary('Origin');
    if (!allowed.has(origin))
      return next(new AppError(403, 'ORIGIN_FORBIDDEN', 'Origin is not allowed'));
    res.set('Access-Control-Allow-Origin', origin);
    if (req.method !== 'OPTIONS') return next();
    const method = req.get('access-control-request-method');
    const headers = (req.get('access-control-request-headers') || '')
      .toLowerCase()
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    if (
      !['GET', 'POST', 'PATCH'].includes(method) ||
      headers.some((value) => !['authorization', 'content-type', 'idempotency-key'].includes(value))
    )
      return next(new AppError(403, 'PREFLIGHT_FORBIDDEN', 'Request is not allowed'));
    res.set('Access-Control-Allow-Methods', 'GET, POST, PATCH');
    res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type, Idempotency-Key');
    res.set('Access-Control-Max-Age', '600');
    res.sendStatus(204);
  };
}
export const cors = createCors();
