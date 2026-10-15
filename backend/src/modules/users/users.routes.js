import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { getMe } from './users.handler.js';
export const usersRouter = Router();
usersRouter.get('/me', authenticate, getMe);
