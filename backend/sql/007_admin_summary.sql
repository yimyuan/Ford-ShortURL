-- Aggregate all records without loading the paginated tables into Node or the browser.
CREATE FUNCTION app.admin_summary(p_actor UUID) RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM app.users WHERE id=p_actor AND role='admin' AND is_active AND NOT must_change_password) THEN
  RAISE EXCEPTION 'ADMIN_FORBIDDEN';
 END IF;
 RETURN jsonb_build_object(
  'users',(SELECT count(*)::text FROM app.users),
  'admins',(SELECT count(*)::text FROM app.users WHERE role='admin'),
  'links',(SELECT count(*)::text FROM app.links),
  'clicks',(SELECT coalesce(sum(click_count),0)::text FROM app.links)
 );
END;
$$;
REVOKE ALL ON FUNCTION app.admin_summary(UUID) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION app.admin_summary(UUID) TO service_role;
NOTIFY pgrst,'reload schema';
