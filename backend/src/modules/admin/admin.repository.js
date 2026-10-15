import { getSupabase } from '../../infrastructure/supabase.js';
import { AppError } from '../../errors/app-error.js';
import { adminPageSize, searchPattern } from './admin-query.js';
const errors = {
  ADMIN_FORBIDDEN: [403, 'บัญชีนี้ไม่มีสิทธิ์จัดการรายการนี้'],
  PRIMARY_ADMIN_PROTECTED: [403, 'ไม่สามารถจัดการบัญชีหลักหรือบัญชีของตัวเองได้'],
  USER_NOT_FOUND: [404, 'ไม่พบบัญชีผู้ใช้'],
  USER_CHANGED: [409, 'ข้อมูลมีการเปลี่ยนแปลง กรุณาเปิดรายการและยืนยันใหม่'],
  NO_CHANGE: [409, 'ข้อมูลตรงกับค่าปัจจุบันอยู่แล้ว'],
  EMAIL_CONFIRMATION_REQUIRED: [422, 'กรุณาพิมพ์อีเมลให้ตรงกับบัญชีที่จะลบ'],
  INVALID_ACTION: [422, 'คำสั่งจัดการไม่ถูกต้อง'],
  LINK_NOT_FOUND: [404, 'ไม่พบลิงก์ของเจ้าของบัญชีนี้'],
  LINK_CHANGED: [409, 'ลิงก์มีการเปลี่ยนแปลง กรุณาเปิดรายละเอียดและยืนยันใหม่'],
  CODE_CONFIRMATION_REQUIRED: [422, 'กรุณาพิมพ์รหัสลิงก์ให้ตรงก่อนลบ'],
};
export function assertDatabaseResult(error) {
  if (!error) return;
  const known = errors[error.message];
  if (known) throw new AppError(known[0], error.message, known[1]);
  throw new AppError(
    503,
    'DATABASE_UNAVAILABLE',
    'ยังดำเนินการไม่ได้ กรุณาโหลดข้อมูลใหม่เพื่อตรวจสอบผลก่อนลองอีกครั้ง',
  );
}
export function createAdminRepository(db) {
  return {
    async impact(id) {
      const { data, error } = await db
        .from('users')
        .select('id,email,role,is_active,is_primary_admin,auth_version::text')
        .eq('id', id)
        .maybeSingle()
        .abortSignal(AbortSignal.timeout(5000));
      assertDatabaseResult(error);
      if (!data) throw new AppError(404, 'USER_NOT_FOUND', 'ไม่พบบัญชีผู้ใช้');
      const result = await db
        .from('links')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', id)
        .abortSignal(AbortSignal.timeout(5000));
      assertDatabaseResult(result.error);
      return { ...data, linkCount: result.count };
    },
    async manage(args) {
      const { data, error } = await db
        .rpc('admin_manage_user', args)
        .abortSignal(AbortSignal.timeout(15000));
      assertDatabaseResult(error);
      return data;
    },
    async history({ query = '', action = '', from = '', to = '', page = 1 } = {}) {
      let request = db
        .from('admin_audit_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .order('id', { ascending: false });
      if (query) {
        const pattern = JSON.stringify(searchPattern(query));
        request = request.or(`actor_email.ilike.${pattern},target_email.ilike.${pattern}`);
      }
      if (action) request = request.eq('action', action);
      if (from) request = request.gte('created_at', from + 'T00:00:00+07:00');
      if (to)
        request = request.lt(
          'created_at',
          new Date(Date.parse(to + 'T00:00:00+07:00') + 86400000).toISOString(),
        );
      const { data, error, count } = await request
        .range((page - 1) * adminPageSize, page * adminPageSize - 1)
        .abortSignal(AbortSignal.timeout(5000));
      assertDatabaseResult(error);
      return { items: data, total: count, page, pageSize: adminPageSize };
    },
    async summary(actorId) {
      const { data, error } = await db
        .rpc('admin_summary', { p_actor: actorId })
        .abortSignal(AbortSignal.timeout(5000));
      assertDatabaseResult(error);
      return data;
    },
  };
}
export const adminRepository = Object.fromEntries(
  ['impact', 'manage', 'history', 'summary'].map((method) => [
    method,
    async (...args) => createAdminRepository(await getSupabase())[method](...args),
  ]),
);
