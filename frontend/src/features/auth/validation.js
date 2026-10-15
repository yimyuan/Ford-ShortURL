import { ApiError } from '../../shared/api/client.js';
export function readUser(data) {
  const user = data?.user;
  if (
    !user ||
    typeof user.id !== 'string' ||
    typeof user.email !== 'string' ||
    !['user', 'admin'].includes(user.role)
  ) {
    throw new ApiError(502, 'INVALID_RESPONSE', 'Invalid account response');
  }
  if (user.isActive === false) throw new ApiError(403, 'ACCOUNT_INACTIVE', 'Account is inactive');
  return user;
}
