import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const derive = promisify(scrypt);
const options = { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };
const format = /^scrypt\$131072\$8\$1\$([a-f0-9]{32})\$([a-f0-9]{128})$/;

export async function hashPassword(password) {
 if (typeof password !== 'string' || [...password].length < 10 || Buffer.byteLength(password) > 1024) {
  throw Object.assign(new Error('Password must contain at least 10 characters and at most 1024 bytes'), { code: 'INVALID_PASSWORD' });
 }
 const salt = randomBytes(16).toString('hex');
 const hash = await derive(password, Buffer.from(salt, 'hex'), 64, options);
 return `scrypt$131072$8$1$${salt}$${hash.toString('hex')}`;
}

export async function verifyPassword(password, stored) {
 if (typeof password !== 'string' || Buffer.byteLength(password) > 1024 || typeof stored !== 'string') return false;
 const match = stored.match(format);
 // Accept only bounded parameters; never allocate memory based on an untrusted hash.
 if (!match) return false;
 const actual = await derive(password, Buffer.from(match[1], 'hex'), 64, options);
 return timingSafeEqual(actual, Buffer.from(match[2], 'hex'));
}
