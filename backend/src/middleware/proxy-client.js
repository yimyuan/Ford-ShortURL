import { timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';
import { AppError } from '../errors/app-error.js';
import { config } from '../config.js';

// Do not trust arbitrary X-Forwarded-For or a hop count on a public backend.
// Netlify's edge proxy overwrites these headers using context.ip and a runtime secret.
export function createProxyClient(settings = config) {
  return (req, _res, next) => {
    if (settings.proxyMode !== 'netlify') return next();
    if (req.method === 'GET' && req.path === '/api/health') return next();
    const secret = settings.proxySecret || '';
    if (Buffer.byteLength(secret) < 32)
      return next(new AppError(503, 'PROXY_NOT_READY', 'Trusted proxy is not configured'));
    const supplied = req.get('x-shorturl-proxy-secret') || '';
    const expected = Buffer.from(secret);
    const actual = Buffer.from(supplied);
    const ip = req.get('x-shorturl-client-ip');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected) || !isIP(ip || ''))
      return next(new AppError(403, 'PROXY_REQUIRED', 'Use the application URL'));
    req.clientIp = ip;
    next();
  };
}
