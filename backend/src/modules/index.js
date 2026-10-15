import { Router } from 'express';
import { authRouter } from './auth/auth.routes.js';
import { usersRouter } from './users/users.routes.js';
import { healthRouter } from './health/health.routes.js';
import { linksRouter } from './links/links.routes.js';
import { adminRouter } from './admin/admin.routes.js';
import { dashboardRouter } from './dashboard/dashboard.routes.js';

export const apiRouter = Router();
apiRouter.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
apiRouter.use(healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/links', linksRouter);
apiRouter.use('/admin', adminRouter);
apiRouter.use('/dashboard', dashboardRouter);
// One-time admin setup is CLI-only; never register it as a public HTTP route.
