-- Keep security audit history indefinitely. No existing audit rows are changed.
BEGIN;
DO $$
DECLARE job_id BIGINT;
BEGIN
 IF to_regclass('cron.job') IS NOT NULL THEN
  FOR job_id IN EXECUTE 'SELECT jobid FROM cron.job WHERE jobname = ''shorturl-admin-audit-retention'''
  LOOP
   PERFORM cron.unschedule(job_id);
  END LOOP;
 END IF;
END;
$$;

-- Old/manual callers must also be unable to prune history through this function.
CREATE OR REPLACE FUNCTION app.prune_admin_audit_logs() RETURNS BIGINT
LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$ SELECT 0::bigint; $$;
REVOKE ALL ON FUNCTION app.prune_admin_audit_logs() FROM PUBLIC,anon,authenticated,service_role;
COMMENT ON FUNCTION app.prune_admin_audit_logs() IS 'Disabled: security audit history is retained indefinitely. Returns zero without deleting records.';
COMMENT ON TABLE app.admin_audit_logs IS 'Security audit history retained indefinitely; no automatic expiry.';
COMMIT;
NOTIFY pgrst,'reload schema';
