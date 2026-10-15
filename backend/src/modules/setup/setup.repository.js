export function createSetupRepository(supabase) {
 return {
  async findPrimaryAdmin() {
   const { data, error } = await supabase.from('users')
    .select('id,email,role,is_primary_admin,is_active')
    .eq('is_primary_admin', true).limit(1).abortSignal(AbortSignal.timeout(5000));
   if (error) throw Object.assign(new Error('Admin setup check failed'), { code: 'ADMIN_SETUP_CHECK_FAILED' });
   return data[0] ?? null;
  },
  async createPrimaryAdmin({ email, passwordHash }) {
   // This RPC owns the transaction/lock and rejects concurrent or duplicate setup.
   const { data, error } = await supabase.rpc('bootstrap_primary_admin', {
    p_email: email,
    p_password_hash: passwordHash
   }).abortSignal(AbortSignal.timeout(10000));
   if (error) {
    const code = error.code === 'P0001' ? 'PRIMARY_ADMIN_EXISTS' : 'ADMIN_BOOTSTRAP_FAILED';
    throw Object.assign(new Error(code), { code });
   }
   return data;
  }
 };
}
