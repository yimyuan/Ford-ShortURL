-- Custom names are allocated once. Existing random eight-character codes remain valid.
ALTER TABLE app.links ALTER COLUMN short_code TYPE VARCHAR(40);
ALTER TABLE app.links DROP CONSTRAINT ck_links_code_alphabet;
ALTER TABLE app.links ADD CONSTRAINT ck_links_code_alphabet
 CHECK (short_code ~ '^[A-Za-z0-9][A-Za-z0-9-]{1,38}[A-Za-z0-9]$');

CREATE FUNCTION app.prevent_short_code_change() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
 IF NEW.short_code IS DISTINCT FROM OLD.short_code THEN
  RAISE EXCEPTION 'SHORT_CODE_IMMUTABLE' USING ERRCODE = '23514';
 END IF;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION app.prevent_short_code_change() FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER links_short_code_immutable BEFORE UPDATE OF short_code ON app.links
 FOR EACH ROW EXECUTE FUNCTION app.prevent_short_code_change();

-- Only the trusted backend can resolve/count links. Counters stay atomic under concurrent GETs.
CREATE OR REPLACE FUNCTION app.resolve_short_link(p_code TEXT, p_id UUID DEFAULT NULL, p_count BOOLEAN DEFAULT TRUE)
RETURNS TABLE(id UUID, original_url TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF p_code IS NULL OR p_code !~ '^[A-Za-z0-9][A-Za-z0-9-]{1,38}[A-Za-z0-9]$' THEN RETURN; END IF;
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
