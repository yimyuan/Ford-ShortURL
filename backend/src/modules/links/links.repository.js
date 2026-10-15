import { AppError } from '../../errors/app-error.js';
import { getSupabase } from '../../infrastructure/supabase.js';
import { adminPageSize, filterAdminList, searchPattern } from '../admin/admin-query.js';

const columns =
  'id,user_id,short_code,original_url,click_count::text,is_active,created_at,last_clicked_at,qr_style,qr_version::text';
const databaseError = () =>
  new AppError(503, 'DATABASE_UNAVAILABLE', 'Link data is temporarily unavailable');
export function createLinksRepository(supabase) {
  return {
    async saveQr(userId, id, { style, version }) {
      const { data, error } = await supabase
        .rpc('save_link_qr', {
          p_actor: userId,
          p_link: id,
          p_style: style,
          p_version: version,
        })
        .abortSignal(AbortSignal.timeout(5000));
      if (error?.message === 'QR_CHANGED')
        throw new AppError(409, 'QR_CHANGED', 'QR was changed; reload before saving');
      if (error?.message === 'LINK_NOT_FOUND')
        throw new AppError(404, 'LINK_NOT_FOUND', 'Link not found');
      if (error?.message === 'QR_FORBIDDEN')
        throw new AppError(403, 'QR_FORBIDDEN', 'QR update is not allowed');
      if (error) throw databaseError();
      return data;
    },
    async create({ userId, shortCode, originalUrl }) {
      const { data, error } = await supabase
        .from('links')
        .insert({ user_id: userId, short_code: shortCode, original_url: originalUrl })
        .select(columns)
        .single()
        .abortSignal(AbortSignal.timeout(5000));
      if (error?.code === '23505')
        throw new AppError(409, 'SHORT_CODE_COLLISION', 'Short code already exists');
      if (error) throw databaseError();
      return data;
    },
    async listByUser(
      userId,
      { page, query = '', clicks = 'all', period = 'all', sort = 'newest' },
    ) {
      const { data, error } = await supabase
        .rpc('user_link_history', {
          p_actor: userId,
          p_page: page,
          p_query: query,
          p_clicks: clicks,
          p_period: period,
          p_sort: sort,
        })
        .abortSignal(AbortSignal.timeout(5000));
      if (error?.message === 'LINK_HISTORY_FORBIDDEN')
        throw new AppError(
          403,
          'LINK_HISTORY_FORBIDDEN',
          'Link history unavailable for this account',
        );
      if (error) throw databaseError();
      return data;
    },
    async findById(id, userId) {
      const { data, error } = await supabase
        .from('links')
        .select(columns)
        .eq('id', id)
        .eq('user_id', userId)
        .maybeSingle()
        .abortSignal(AbortSignal.timeout(5000));
      if (error) throw databaseError();
      return data;
    },
    async list({ page = 1, query = '', filter = 'all' } = {}) {
      let request = supabase
        .from('links')
        .select(columns, { count: 'exact' })
        .order('created_at', { ascending: false })
        .order('id', { ascending: false });
      request = filterAdminList(request, { filter });
      if (query) {
        const pattern = JSON.stringify(searchPattern(query));
        request = request.or(`original_url.ilike.${pattern},short_code.ilike.${pattern}`);
      }
      const { data, error, count } = await request
        .range((page - 1) * adminPageSize, page * adminPageSize - 1)
        .abortSignal(AbortSignal.timeout(5000));
      if (error) throw databaseError();
      return { items: data, total: count, page, pageSize: adminPageSize };
    },
    async incrementAndResolve(shortCode, cachedId = null, countClick = true) {
      const { data, error } = await supabase
        .rpc('resolve_short_link', { p_code: shortCode, p_id: cachedId, p_count: countClick })
        .abortSignal(AbortSignal.timeout(5000));
      if (error) throw databaseError();
      return data?.[0] ?? null;
    },
  };
}
export const linksRepository = Object.fromEntries(
  ['list', 'create', 'listByUser', 'findById', 'incrementAndResolve', 'saveQr'].map((method) => [
    method,
    async (...args) => createLinksRepository(await getSupabase())[method](...args),
  ]),
);
