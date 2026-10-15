CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- One calendar month, measured in Thailand time (not a fixed thirty days).
-- This is database maintenance; application roles cannot invoke it directly.
CREATE FUNCTION app.prune_admin_audit_logs() RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE cutoff TIMESTAMPTZ := ((now() AT TIME ZONE 'Asia/Bangkok')-interval '1 month') AT TIME ZONE 'Asia/Bangkok'; removed BIGINT;
BEGIN
 DELETE FROM app.admin_audit_logs WHERE created_at<cutoff;
 GET DIAGNOSTICS removed=ROW_COUNT;
 RETURN removed;
END;
$$;
REVOKE ALL ON FUNCTION app.prune_admin_audit_logs() FROM PUBLIC,anon,authenticated,service_role;
COMMENT ON FUNCTION app.prune_admin_audit_logs() IS 'Deletes only admin audit records older than one calendar month in Asia/Bangkok. Scheduled hourly by pg_cron.';

SELECT cron.schedule('shorturl-admin-audit-retention','0 * * * *','SELECT app.prune_admin_audit_logs();');
NOTIFY pgrst,'reload schema';
