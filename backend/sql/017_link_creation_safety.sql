-- Apply once, after 016. Never reassign a published short URL, even after deletion.
BEGIN;
LOCK TABLE app.links IN SHARE ROW EXCLUSIVE MODE;
CREATE TABLE app.short_code_reservations (
 short_code VARCHAR(40) COLLATE "C" PRIMARY KEY,
 CONSTRAINT ck_reserved_code CHECK(short_code ~ '^[A-Za-z0-9][A-Za-z0-9-]{1,38}[A-Za-z0-9]$')
);
ALTER TABLE app.short_code_reservations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app.short_code_reservations FROM PUBLIC,anon,authenticated,service_role;
INSERT INTO app.short_code_reservations(short_code) SELECT short_code FROM app.links;
INSERT INTO app.short_code_reservations(short_code)
 SELECT DISTINCT details->>'shortCode' FROM app.admin_audit_logs
 WHERE action='link_delete' AND details->>'shortCode' ~ '^[A-Za-z0-9][A-Za-z0-9-]{1,38}[A-Za-z0-9]$'
 ON CONFLICT DO NOTHING;

CREATE FUNCTION app.reserve_short_code() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 INSERT INTO app.short_code_reservations(short_code) VALUES(NEW.short_code);
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION app.reserve_short_code() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER reserve_short_code BEFORE INSERT ON app.links
 FOR EACH ROW EXECUTE FUNCTION app.reserve_short_code();

-- Keep only a fingerprint and link reference, not a copy of URLs or QR images.
-- A deleted link leaves a tombstone until its owner account is deleted.
CREATE TABLE app.link_creation_requests (
 user_id UUID NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
 request_id UUID NOT NULL,
 request_hash TEXT NOT NULL CHECK(request_hash ~ '^[a-f0-9]{64}$'),
 link_id UUID REFERENCES app.links(id) ON DELETE SET NULL,
 PRIMARY KEY(user_id,request_id)
);
CREATE INDEX idx_link_creation_requests_link ON app.link_creation_requests(link_id) WHERE link_id IS NOT NULL;
ALTER TABLE app.link_creation_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app.link_creation_requests FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION app.create_short_link(
 p_actor UUID,p_code TEXT,p_url TEXT,p_request_id UUID,p_request_hash TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor app.users%ROWTYPE; prior app.link_creation_requests%ROWTYPE; link app.links%ROWTYPE;
BEGIN
 -- Serialize this user's creation and account changes; recheck state inside the write.
 SELECT * INTO actor FROM app.users WHERE id=p_actor FOR UPDATE;
 IF NOT FOUND OR NOT actor.is_active OR actor.must_change_password THEN
  RAISE EXCEPTION 'LINK_CREATE_FORBIDDEN';
 END IF;
 IF p_request_id IS NULL OR p_request_hash IS NULL OR p_request_hash !~ '^[a-f0-9]{64}$'
  OR p_code IS NULL OR p_code !~ '^[A-Za-z0-9][A-Za-z0-9-]{1,38}[A-Za-z0-9]$'
  OR p_url IS NULL OR length(p_url)>8192 OR p_url !~ '^https?://' THEN
  RAISE EXCEPTION 'INVALID_LINK_REQUEST';
 END IF;
 SELECT * INTO prior FROM app.link_creation_requests WHERE user_id=p_actor AND request_id=p_request_id;
 IF FOUND THEN
  IF prior.request_hash<>p_request_hash THEN RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT'; END IF;
  IF prior.link_id IS NULL THEN RAISE EXCEPTION 'REQUEST_LINK_DELETED'; END IF;
  SELECT * INTO link FROM app.links WHERE id=prior.link_id AND user_id=p_actor;
  IF NOT FOUND THEN RAISE EXCEPTION 'REQUEST_LINK_DELETED'; END IF;
 ELSE
  INSERT INTO app.links(user_id,short_code,original_url) VALUES(p_actor,p_code,p_url) RETURNING * INTO link;
  INSERT INTO app.link_creation_requests(user_id,request_id,request_hash,link_id)
   VALUES(p_actor,p_request_id,p_request_hash,link.id);
 END IF;
 RETURN (to_jsonb(link)-'click_count'-'qr_version') || jsonb_build_object(
  'click_count',link.click_count::text,'qr_version',link.qr_version::text);
END;
$$;
REVOKE ALL ON FUNCTION app.create_short_link(UUID,TEXT,TEXT,UUID,TEXT) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION app.create_short_link(UUID,TEXT,TEXT,UUID,TEXT) TO service_role;
COMMIT;
NOTIFY pgrst,'reload schema';
