import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { parseCredentials } from './auth.dto.js';
import * as handler from './auth.handler.js';
import { authenticate } from '../../middleware/authenticate.js';
import { protectAuthWrite } from '../../middleware/csrf.js';
import { createAuthRateLimit } from '../../middleware/rate-limit.js';
export const authRouter = Router();
authRouter.get('/me', authenticate, handler.me);
authRouter.post(
  '/change-password',
  authenticate,
  protectAuthWrite,
  createAuthRateLimit('password'),
  handler.changePassword,
);
authRouter.post(
  '/register',
  protectAuthWrite,
  createAuthRateLimit('register'),
  validate(parseCredentials),
  handler.register,
);
authRouter.post(
  '/login',
  protectAuthWrite,
  createAuthRateLimit('login'),
  validate(parseCredentials),
  handler.login,
);
authRouter.post('/refresh', protectAuthWrite, createAuthRateLimit('refresh'), handler.refresh);
authRouter.post('/logout', protectAuthWrite, createAuthRateLimit('logout'), handler.logout);
