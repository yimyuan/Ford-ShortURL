import { AppError } from '../../errors/app-error.js';
import { dashboardRepository } from './dashboard.repository.js';
import { publicLinkUrl } from '../links/public-url.js';
import { config } from '../../config.js';
export function createDashboardService(repository = dashboardRepository, settings = config) {
  return {
    async summary(identity) {
      if (!identity?.id) throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
      const data = await repository.summary(identity.id);
      return {
        totalLinks: data.totalLinks,
        totalClicks: data.totalClicks,
        clickedLinks: data.clickedLinks,
        today: data.today,
        timezone: data.timezone,
        trackingSince: data.trackingSince,
        daily: data.daily.map((row) => ({ day: row.day, clicks: row.clicks })),
        topLinks: data.topLinks.map((row) => ({
          id: row.id,
          shortCode: row.shortCode,
          shortUrl: publicLinkUrl(row.shortCode, settings),
          originalUrl: row.originalUrl,
          clickCount: row.clickCount,
          lastClickedAt: row.lastClickedAt,
        })),
      };
    },
  };
}
export const dashboardService = createDashboardService();
