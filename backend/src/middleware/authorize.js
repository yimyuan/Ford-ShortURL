import { AppError } from '../errors/app-error.js';
export function authorize(...roles) {
 return (req, _res, next) => {
  if (!req.user) return next(new AppError(401, 'UNAUTHENTICATED', 'Login required'));
  if (!roles.includes(req.user.role)) return next(new AppError(403, 'FORBIDDEN', 'Permission denied'));
  next();
 };
}
