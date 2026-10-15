-- Only the trusted backend can resolve/count links. Counters stay atomic under concurrent GETs.
CREATE OR REPLACE FUNCTION app.resolve_short_link(p_code TEXT, p_id UUID DEFAULT NULL, p_count BOOLEAN DEFAULT TRUE)
RETURNS TABLE(id UUID, original_url TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF p_code IS NULL OR p_code !~ '^[A-Za-z0-9]{8}$' THEN RETURN; END IF;
 IF p_count THEN
  RETURN QUERY UPDATE app.links AS l
   SET click_count = l.click_count + 1, last_clicked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
   FROM app.users AS u
   WHERE l.short_code = p_code AND (p_id IS NULL OR l.id = p_id)
    AND l.is_active AND u.id = l.user_id AND u.is_active
   RETURNING l.id, l.original_url;
 ELSE
  RETURN QUERY SELECT l.id, l.original_url FROM app.links AS l JOIN app.users AS u ON u.id = l.user_id
   WHERE l.short_code = p_code AND (p_id IS NULL OR l.id = p_id) AND l.is_active AND u.is_active;
 END IF;
END;
$$;
REVOKE ALL ON FUNCTION app.resolve_short_link(TEXT, UUID, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION app.resolve_short_link(TEXT, UUID, BOOLEAN) TO service_role;
NOTIFY pgrst, 'reload schema';
