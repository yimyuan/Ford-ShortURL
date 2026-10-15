import { getSupabase } from '../../infrastructure/supabase.js';
import { AppError } from '../../errors/app-error.js';
export function createDashboardRepository(db) {
  return {
    async summary(actor) {
      const { data, error } = await db
        .rpc('user_dashboard', { p_actor: actor })
        .abortSignal(AbortSignal.timeout(5000));
      if (error?.message === 'DASHBOARD_FORBIDDEN')
        throw new AppError(403, 'DASHBOARD_FORBIDDEN', 'Dashboard unavailable for this account');
      if (error)
        throw new AppError(503, 'DATABASE_UNAVAILABLE', 'Dashboard is temporarily unavailable');
      return data;
    },
  };
}
export const dashboardRepository = {
  summary: async (actor) => createDashboardRepository(await getSupabase()).summary(actor),
};
