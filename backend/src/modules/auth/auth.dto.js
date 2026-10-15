import { AppError } from '../../errors/app-error.js';
import { normalizeEmail } from '../users/users.dto.js';
export function parseCredentials(input) {
 if (!input || typeof input !== 'object' || Array.isArray(input)
  || Object.keys(input).some(key => !['email', 'password'].includes(key))
  || typeof input.password !== 'string' || !input.password || Buffer.byteLength(input.password) > 1024) {
  throw new AppError(422, 'INVALID_CREDENTIALS', 'Invalid email or password input');
 }
 return { email: normalizeEmail(input.email), password: input.password };
}
export function toAuthDto(user) {
 return { user: { id: user.id, email: user.email, role: user.role } };
}
