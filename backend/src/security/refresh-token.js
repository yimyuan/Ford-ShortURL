import { randomBytes, createHash } from 'node:crypto';
export function createRefreshToken() { return randomBytes(32).toString('base64url'); }
export function hashRefreshToken(token) { return createHash('sha256').update(token).digest('hex'); }
