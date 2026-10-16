// Never log raw errors: Redis messages can contain credentials, URLs or commands.
export function logRedisFailure(operation, error, logger = console.error) {
  const knownCodes = new Set([
    'ENOTFOUND',
    'EAI_AGAIN',
    'ECONNREFUSED',
    'ECONNRESET',
    'ETIMEDOUT',
    'EHOSTUNREACH',
    'ENETUNREACH',
    'ERR_TLS_CERT_ALTNAME_INVALID',
    'SELF_SIGNED_CERT_IN_CHAIN',
    'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
    'REDIS_DEADLINE',
  ]);
  const causes = [error, error?.cause, ...(Array.isArray(error?.errors) ? error.errors : [])];
  let reason = 'UNKNOWN';
  for (const cause of causes) {
    if (knownCodes.has(cause?.code)) {
      reason = cause.code;
      break;
    }
    const message = typeof cause?.message === 'string' ? cause.message : '';
    if (/WRONGPASS|NOAUTH|invalid (?:username|password)|authentication/i.test(message))
      reason = 'AUTHENTICATION';
    else if (/NOPERM|permission/i.test(message)) reason = 'PERMISSION';
    else if (/quota|limit exceeded|max requests/i.test(message)) reason = 'QUOTA';
    else if (/timeout|timed out|deadline/i.test(message) || cause?.name === 'TimeoutError')
      reason = 'TIMEOUT';
    else if (/Invalid URL|Invalid protocol/i.test(message)) reason = 'INVALID_URL';
    else if (/not configured/i.test(message)) reason = 'NOT_CONFIGURED';
    else if (/closed|not ready|offline/i.test(message)) reason = 'NOT_READY';
    else if (cause instanceof TypeError) reason = 'CLIENT_TYPE_ERROR';
    if (reason !== 'UNKNOWN') break;
  }
  const safeOperation = ['connect', 'socket', 'auth-rate-limit', 'link-rate-limit'].includes(
    operation,
  )
    ? operation
    : 'unknown';
  logger(`[Redis] operation=${safeOperation} reason=${reason}`);
}
