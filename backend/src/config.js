function integer(name, fallback, min, max) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value < min || value > max)
    throw new Error('Invalid configuration: ' + name);
  return value;
}
export const config = Object.freeze({
  trustProxyHops: integer('TRUST_PROXY_HOPS', 0, 0, 5),
  host: process.env.HOST || '127.0.0.1',
  port: integer('PORT', 3000, 1, 65535),
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseSecretKey: process.env.SUPABASE_SECRET_KEY || '',
  redisUrl: process.env.REDIS_URL || '',
  production: process.env.NODE_ENV === 'production',
  appOrigin: process.env.APP_ORIGIN || 'http://127.0.0.1:5173',
  publicBaseUrl: process.env.PUBLIC_BASE_URL || process.env.APP_ORIGIN || 'http://127.0.0.1:5173',
  jwtSecret: process.env.JWT_SECRET || '',
  csrfSecret: process.env.CSRF_SECRET || '',
  jwtIssuer: process.env.JWT_ISSUER || 'short-url-api',
  jwtAudience: process.env.JWT_AUDIENCE || 'short-url-web',
  accessTokenTtl: integer('ACCESS_TOKEN_TTL_SECONDS', 900, 60, 3600),
});
