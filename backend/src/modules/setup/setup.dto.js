export function normalizeAdminEmail(value) {
 const email = typeof value === 'string' ? value.trim().toLowerCase() : '';
 if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  throw Object.assign(new Error('Invalid admin email'), { code: 'INVALID_ADMIN_EMAIL' });
 }
 return email;
}

export function parseSetupAdminInput(input) {
 if (!input || typeof input !== 'object' || Array.isArray(input)
  || Object.keys(input).some(key => !['email', 'password'].includes(key))
  || typeof input.password !== 'string') {
  throw Object.assign(new Error('Invalid setup input'), { code: 'INVALID_SETUP_INPUT' });
 }
 return { email: normalizeAdminEmail(input.email), password: input.password };
}

// Explicit allowlist: never return password hashes or infrastructure fields.
export function toPrimaryAdminDto(user) {
 if (!user) return null;
 return {
  id: user.id,
  email: user.email,
  role: user.role,
  isPrimaryAdmin: user.is_primary_admin,
  isActive: user.is_active
 };
}
