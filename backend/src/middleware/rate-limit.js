import { AppError } from '../errors/app-error.js';
import { createHmac } from 'node:crypto';
import { config } from '../config.js';
import { getRedis } from '../infrastructure/redis.js';
import { withRedisDeadline } from '../infrastructure/deadline.js';
// The injected limiter must use atomic Redis operations with a bounded expiry.
export function createRateLimitMiddleware(consume) {
  return async (req, _res, next) => {
    try {
      if (!consume)
        throw new AppError(503, 'RATE_LIMIT_NOT_READY', 'Rate limiting is not configured yet');
      if (!(await consume(req))) throw new AppError(429, 'RATE_LIMITED', 'Too many requests');
      next();
    } catch (error) {
      next(error);
    }
  };
}

const consumeScript = `
 local allowed = 1
 for i, key in ipairs(KEYS) do
  local count = redis.call('INCR', key)
  if count == 1 then redis.call('EXPIRE', key, ARGV[1]) end
  if count > tonumber(ARGV[i + 1]) then allowed = 0 end
 end
 return allowed
`;
export function createAuthRateLimit(action, { connect = getRedis, settings = config } = {}) {
  const limits = {
    login: [900, 30, 12],
    register: [3600, 10],
    refresh: [900, 120],
    logout: [900, 120],
    admin: [900, 60],
    password: [900, 10],
  };
  const selected = limits[action];
  if (!selected) throw new Error('Unknown authentication rate limit');
  return createRateLimitMiddleware(async (req) => {
    if (Buffer.byteLength(settings.csrfSecret || '') < 32)
      throw new AppError(503, 'RATE_LIMIT_NOT_READY', 'Request limiting is not configured');
    const digest = (value) => createHmac('sha256', settings.csrfSecret).update(value).digest('hex');
    const keys = [
      `shorturl:limit:${action}:ip:${digest(String(req.clientIp || req.ip || 'unknown'))}`,
    ];
    const arguments_ = [String(selected[0]), String(selected[1])];
    if (action === 'login') {
      keys.push(`shorturl:limit:login:email:${digest(resolvedEmail(req))}`);
      arguments_.push(String(selected[2]));
    }
    try {
      return await withRedisDeadline(
        connect,
        async (client) => {
          return Number(await client.eval(consumeScript, { keys, arguments: arguments_ })) === 1;
        },
        2500,
      );
    } catch {
      throw new AppError(503, 'RATE_LIMIT_UNAVAILABLE', 'Request limiting is unavailable');
    }
  });
}
function resolvedEmail(req) {
  return typeof req.body?.email === 'string'
    ? req.body.email.trim().toLowerCase().slice(0, 254)
    : 'invalid';
}
export function createLinkRateLimit({ connect = getRedis } = {}) {
  return createRateLimitMiddleware(async (req) => {
    try {
      return await withRedisDeadline(
        connect,
        async (client) => {
          return (
            Number(
              await client.eval(consumeScript, {
                keys: [`shorturl:limit:create:${req.user.id}`],
                arguments: ['60', '30'],
              }),
            ) === 1
          );
        },
        2500,
      );
    } catch {
      throw new AppError(503, 'RATE_LIMIT_UNAVAILABLE', 'Request limiting is unavailable');
    }
  });
}
