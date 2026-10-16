import { AppError } from '../errors/app-error.js';
import { authService } from '../modules/auth/auth.service.js';
// Inject a verifier that checks JWT, Redis login state and the latest database user.
// Never trust decoded JWT payloads or a role supplied by the client.
export function createAuthenticate(verifyIdentity) {
  return async (req, _res, next) => {
    try {
      const match = /^Bearer ([^\s]+)$/.exec(req.get('authorization') || '');
      const token = match?.[1];
      if (!token) throw new AppError(401, 'UNAUTHENTICATED', 'Login required');
      if (!verifyIdentity)
        throw new AppError(503, 'AUTH_NOT_READY', 'Authentication is not configured yet');
      const user = await verifyIdentity(token);
      if (!user?.id || !['user', 'admin'].includes(user.role))
        throw new AppError(401, 'UNAUTHENTICATED', 'Invalid login');
      req.user = user;
      req.accessToken = token;
      if (
        user.mustChangePassword &&
        !(req.baseUrl === '/api/auth' && ['/me', '/change-password', '/logout'].includes(req.path))
      )
        throw new AppError(403, 'PASSWORD_CHANGE_REQUIRED', 'กรุณาเปลี่ยนรหัสผ่านก่อนใช้งาน');
      next();
    } catch (error) {
      next(error);
    }
  };
}
export const authenticate = createAuthenticate((token) => authService.verifyIdentity(token));
