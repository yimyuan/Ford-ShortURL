import { Router } from 'express';
export const healthRouter = Router();
// Process liveness only, not database/Redis readiness; no service layer needed.
healthRouter.get('/health', (_req, res) => {
 res.set('Cache-Control', 'no-store').json({ status: 'ok', service: 'short-url-api' });
});
