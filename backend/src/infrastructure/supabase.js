import { config } from '../config.js';
let client;
const failure = code => Object.assign(new Error(code), { code });
export function createBackendClient(settings, createClient) {
 let url;
 try { url = new URL(settings.supabaseUrl); } catch { throw failure('SUPABASE_URL_INVALID'); }
 if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw failure('SUPABASE_URL_INVALID');
 const key = settings.supabaseSecretKey;
 let serviceRole = false;
 try { serviceRole = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role === 'service_role'; } catch {}
 if (!key || (!key.startsWith('sb_secret_') && !serviceRole)) throw failure('SUPABASE_SECRET_KEY_INVALID');
 return createClient(url.origin, key, {
  db: { schema: 'app' },
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
 });
}
export async function getSupabase() {
 if (!client) {
  let createClient;
  try { ({ createClient } = await import('@supabase/supabase-js')); }
  catch (error) { if (error.code === 'ERR_MODULE_NOT_FOUND') throw failure('SUPABASE_SDK_MISSING'); throw error; }
  client = createBackendClient(config, createClient);
 }
 return client;
}
export async function checkSupabaseConnection(supabase) {
 supabase ??= await getSupabase();
 // GET with limit 0 returns no rows and preserves structured API error details.
 for (const table of ['users', 'links']) {
  const { error, status } = await supabase.from(table).select('id').limit(0).abortSignal(AbortSignal.timeout(5000));
  if (error) {
   const code = /^([A-Z][A-Z0-9_]{1,63}|[0-9]{5})$/.test(error.code || '') ? error.code : status ? 'HTTP_' + status : 'SUPABASE_REQUEST_FAILED';
   throw failure(code);
  }
 }
}
