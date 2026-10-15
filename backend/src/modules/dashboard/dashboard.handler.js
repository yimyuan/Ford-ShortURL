import { dashboardService } from './dashboard.service.js';
export async function summary(req, res) {
  res.json(await dashboardService.summary(req.user));
}
