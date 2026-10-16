-- Remove unused cleanup machinery; preserve every audit record.
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
DROP FUNCTION IF EXISTS app.prune_admin_audit_logs();
COMMIT;
NOTIFY pgrst,'reload schema';
