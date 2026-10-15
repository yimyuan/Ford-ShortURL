import { getSupabase } from '../../infrastructure/supabase.js';
import { assertDatabaseResult } from './admin.repository.js';
export function createAdminLinksRepository(db) {
  async function rpc(name, args) {
    const { data, error } = await db.rpc(name, args).abortSignal(AbortSignal.timeout(10000));
    assertDatabaseResult(error);
    return data;
  }
  return {
    owners: (actor, { page, query, filter }) =>
      rpc('admin_link_owners', { p_actor: actor, p_page: page, p_query: query, p_filter: filter }),
    list: (actor, owner, { page, query, filter }) =>
      rpc('admin_owner_links', {
        p_actor: actor,
        p_owner: owner,
        p_page: page,
        p_query: query,
        p_filter: filter,
      }),
    manage: (args) => rpc('admin_manage_link', args),
    async detail(owner, id) {
      const result = await db
        .from('links')
        .select(
          'id,user_id,short_code,original_url,click_count::text,is_active,created_at,last_clicked_at,management_version::text,qr_style,qr_version::text',
        )
        .eq('user_id', owner)
        .eq('id', id)
        .maybeSingle()
        .abortSignal(AbortSignal.timeout(5000));
      assertDatabaseResult(result.error);
      return result.data;
    },
  };
}
export const adminLinksRepository = Object.fromEntries(
  ['owners', 'list', 'manage', 'detail'].map((method) => [
    method,
    async (...args) => createAdminLinksRepository(await getSupabase())[method](...args),
  ]),
);
