import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { config } from '../config.js';
import { AppError } from '../errors/app-error.js';

const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const invalid = () => new AppError(401, 'UNAUTHENTICATED', 'Invalid or expired login');
export function createAccessTokenCodec(settings = config, now = () => Math.floor(Date.now() / 1000)) {
 function assertReady() {
  if (Buffer.byteLength(settings.jwtSecret || '') < 32) throw new AppError(503, 'AUTH_NOT_READY', 'Authentication secret is not configured');
 }
 const mac = value => createHmac('sha256', settings.jwtSecret).update(value).digest();
 return {
  assertReady,
  sign({ userId, sessionId }) {
   assertReady();
   if (typeof userId !== 'string' || !userId || userId.length > 128 || !uuid.test(sessionId)) throw invalid();
   const issuedAt = now();
   const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
   const payload = Buffer.from(JSON.stringify({ iss: settings.jwtIssuer, aud: settings.jwtAudience, sub: userId,
    sid: sessionId, jti: randomUUID(), iat: issuedAt, exp: issuedAt + settings.accessTokenTtl })).toString('base64url');
   const body = `${header}.${payload}`;
   return `${body}.${mac(body).toString('base64url')}`;
  },
  verify(token) {
   assertReady();
   if (typeof token !== 'string' || token.length > 2048 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) throw invalid();
   const [headerPart, payloadPart, signaturePart] = token.split('.');
   const signature = Buffer.from(signaturePart, 'base64url');
   const expected = mac(`${headerPart}.${payloadPart}`);
   if (signature.toString('base64url') !== signaturePart || signature.length !== expected.length || !timingSafeEqual(signature, expected)) throw invalid();
   let header, payload;
   try { header = JSON.parse(Buffer.from(headerPart, 'base64url')); payload = JSON.parse(Buffer.from(payloadPart, 'base64url')); }
   catch { throw invalid(); }
   if (!header || header.alg !== 'HS256' || header.typ !== 'JWT' || Object.keys(header).length !== 2 || !payload
    || payload.iss !== settings.jwtIssuer || payload.aud !== settings.jwtAudience || typeof payload.sub !== 'string'
    || !payload.sub || payload.sub.length > 128 || !uuid.test(payload.sid) || !uuid.test(payload.jti)
    || !Number.isSafeInteger(payload.iat) || !Number.isSafeInteger(payload.exp) || payload.iat > now() + 30
    || payload.exp <= now() || payload.exp <= payload.iat || payload.exp - payload.iat > settings.accessTokenTtl) throw invalid();
   return payload;
  }
 };
}
export const accessTokenCodec = createAccessTokenCodec();
export const signAccessToken = input => accessTokenCodec.sign(input);
export const verifyAccessToken = token => accessTokenCodec.verify(token);
