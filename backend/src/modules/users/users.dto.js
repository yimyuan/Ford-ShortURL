import { AppError } from '../../errors/app-error.js';
export function normalizeEmail(value) {
  const email = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new AppError(422, 'INVALID_EMAIL', 'Invalid email');
  return email;
}
export function toUserDto(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    isActive: user.is_active,
    isPrimaryAdmin: user.is_primary_admin,
    ...(user.must_change_password ? { mustChangePassword: true } : {}),
  };
}
