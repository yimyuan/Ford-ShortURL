import { notImplemented } from '../../errors/app-error.js';
import { AppError } from '../../errors/app-error.js';
import { getSupabase } from '../../infrastructure/supabase.js';
import { adminPageSize, filterAdminList, searchPattern } from '../admin/admin-query.js';

const identityColumns =
  'id,email,password_hash,role,is_active,is_primary_admin,auth_version,must_change_password';
const publicColumns = 'id,email,role,is_active,is_primary_admin,created_at';

export function createUsersRepository(supabase) {
  async function find(column, value) {
    const { data, error } = await supabase
      .from('users')
      .select(identityColumns)
      .eq(column, value)
      .maybeSingle()
      .abortSignal(AbortSignal.timeout(5000));
    if (error)
      throw new AppError(503, 'DATABASE_UNAVAILABLE', 'User data is temporarily unavailable');
    return data;
  }
  return {
    findById: (id) => find('id', id),
    findByEmail: (email) => find('email', email),
    async create({ email, passwordHash }) {
      const { data, error } = await supabase
        .from('users')
        .insert({
          email,
          password_hash: passwordHash,
          role: 'user',
          is_active: true,
          is_primary_admin: false,
        })
        .select(identityColumns)
        .single()
        .abortSignal(AbortSignal.timeout(10000));
      if (error?.code === '23505')
        throw new AppError(409, 'EMAIL_EXISTS', 'This email is already registered');
      if (error)
        throw new AppError(503, 'DATABASE_UNAVAILABLE', 'User data is temporarily unavailable');
      return data;
    },
    update: async () => notImplemented('Update user'),
    async list({ page = 1, query = '', filter = 'all' } = {}) {
      let request = supabase
        .from('users')
        .select(publicColumns, { count: 'exact' })
        .order('is_primary_admin', { ascending: false })
        .order('created_at', { ascending: false })
        .order('id', { ascending: false });
      request = filterAdminList(request, { filter });
      if (query) request = request.ilike('email', searchPattern(query));
      const { data, error, count } = await request
        .range((page - 1) * adminPageSize, page * adminPageSize - 1)
        .abortSignal(AbortSignal.timeout(5000));
      if (error)
        throw new AppError(503, 'DATABASE_UNAVAILABLE', 'User data is temporarily unavailable');
      return { items: data, total: count, page, pageSize: adminPageSize };
    },
  };
}

// Raw credential rows stay inside repositories/services; HTTP responses use DTOs.
export const usersRepository = Object.fromEntries(
  ['findById', 'findByEmail', 'create', 'update', 'list'].map((method) => [
    method,
    async (...args) => createUsersRepository(await getSupabase())[method](...args),
  ]),
);
