import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { summary } from './dashboard.handler.js';
export const dashboardRouter = Router();
dashboardRouter.get('/', authenticate, summary);
