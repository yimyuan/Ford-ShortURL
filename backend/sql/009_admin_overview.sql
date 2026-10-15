CREATE OR REPLACE FUNCTION app.admin_summary(p_actor UUID) RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE day_start TIMESTAMPTZ := date_trunc('day',now() AT TIME ZONE 'Asia/Bangkok') AT TIME ZONE 'Asia/Bangkok'; result JSONB;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM app.users WHERE id=p_actor AND role='admin' AND is_active AND NOT must_change_password) THEN
  RAISE EXCEPTION 'ADMIN_FORBIDDEN';
 END IF;
 WITH users_summary AS (
  SELECT count(*)::text AS total,count(*) FILTER(WHERE role='admin')::text AS admins,
   count(*) FILTER(WHERE is_active)::text AS active,count(*) FILTER(WHERE NOT is_active)::text AS suspended,
   count(*) FILTER(WHERE created_at>=day_start AND created_at<day_start+interval '1 day')::text AS today FROM app.users
 ), links_summary AS (
  SELECT count(*)::text AS total,coalesce(sum(l.click_count),0)::text AS clicks,
   count(*) FILTER(WHERE l.is_active AND u.is_active)::text AS active,
   count(*) FILTER(WHERE NOT l.is_active)::text AS disabled,
   count(*) FILTER(WHERE l.is_active AND NOT u.is_active)::text AS owner_suspended,
   count(*) FILTER(WHERE l.created_at>=day_start AND l.created_at<day_start+interval '1 day')::text AS today
  FROM app.links l JOIN app.users u ON u.id=l.user_id
 ) SELECT jsonb_build_object('users',u.total,'admins',u.admins,'links',l.total,'clicks',l.clicks,
  'usersActive',u.active,'usersSuspended',u.suspended,'linksActive',l.active,'linksDisabled',l.disabled,
  'linksOwnerSuspended',l.owner_suspended,'usersToday',u.today,'linksToday',l.today,
  'today',to_char(day_start AT TIME ZONE 'Asia/Bangkok','YYYY-MM-DD'),'timezone','Asia/Bangkok')
 INTO result FROM users_summary u CROSS JOIN links_summary l;
 RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION app.admin_summary(UUID) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION app.admin_summary(UUID) TO service_role;
NOTIFY pgrst,'reload schema';
