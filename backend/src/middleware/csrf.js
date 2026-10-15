import { AppError } from '../errors/app-error.js';
import { config } from '../config.js';
// Wire a signed CSRF-token verifier when implementing cookie-based refresh/logout.
export function createCsrfMiddleware(verifyToken) {
 return async (req, _res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  try {
   if (!verifyToken) throw new AppError(503, 'CSRF_NOT_READY', 'CSRF protection is not configured yet');
   if (!await verifyToken(req)) throw new AppError(403, 'CSRF_INVALID', 'Invalid CSRF token');
   next();
  } catch (error) { next(error); }
 };
}
export function createOriginGuard(settings = config) {
 return createCsrfMiddleware(req => {
  if (Buffer.byteLength(settings.csrfSecret || '') < 32) throw new AppError(503, 'CSRF_NOT_READY', 'Request protection is not configured');
  let configured;
  try { configured = new URL(settings.appOrigin); }
  catch { throw new AppError(503, 'CSRF_NOT_READY', 'Application origin is not configured'); }
  if (!['http:', 'https:'].includes(configured.protocol) || configured.username || configured.password
   || (settings.production && configured.protocol !== 'https:')) throw new AppError(503, 'CSRF_NOT_READY', 'Application origin is invalid');
  const allowed = new Set([configured.origin]);
  if (!settings.production && ['localhost', '127.0.0.1'].includes(configured.hostname)) {
   const alternate = new URL(configured.origin);
   alternate.hostname = configured.hostname === 'localhost' ? '127.0.0.1' : 'localhost';
   allowed.add(alternate.origin);
  }
  // Cookies are HttpOnly + SameSite. Origin and JSON validation also block same-site sibling origins.
  const origin = req.get('origin');
  return typeof origin === 'string' && allowed.has(origin)
   && /^application\/json(?:\s*;|$)/i.test(req.get('content-type') || '');
 });
}
export const protectAuthWrite = createOriginGuard();
