-- Store settings, not rendered images. Existing QR codes and URLs remain valid.
CREATE FUNCTION app.qr_luminance(hex TEXT) RETURNS DOUBLE PRECISION
LANGUAGE sql IMMUTABLE STRICT SET search_path = '' AS $$
 SELECT sum(weight * CASE WHEN value <= 0.04045 THEN value / 12.92 ELSE power((value + 0.055) / 1.055, 2.4) END)
 FROM (SELECT get_byte(decode(substr(hex,2),'hex'),i) / 255.0 AS value,
  CASE i WHEN 0 THEN 0.2126 WHEN 1 THEN 0.7152 ELSE 0.0722 END AS weight
  FROM generate_series(0,2) AS i) AS colors;
$$;
REVOKE ALL ON FUNCTION app.qr_luminance(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION app.qr_luminance(TEXT) TO service_role;

CREATE FUNCTION app.valid_qr_style(style JSONB) RETURNS BOOLEAN
LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $$
BEGIN
 IF style IS NULL OR jsonb_typeof(style) <> 'object' THEN RETURN FALSE; END IF;
 IF NOT (style ?& ARRAY['dark','light','size']) OR style - ARRAY['dark','light','size'] <> '{}'::jsonb
  OR jsonb_typeof(style->'dark') <> 'string' OR jsonb_typeof(style->'light') <> 'string'
  OR jsonb_typeof(style->'size') <> 'number'
  OR style->>'dark' !~ '^#[0-9a-fA-F]{6}$' OR style->>'light' !~ '^#[0-9a-fA-F]{6}$'
  OR style->>'size' NOT IN ('256','512','1024') THEN RETURN FALSE; END IF;
 RETURN (app.qr_luminance(style->>'light')+0.05)/(app.qr_luminance(style->>'dark')+0.05) >= 4.5;
END;
$$;
REVOKE ALL ON FUNCTION app.valid_qr_style(JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION app.valid_qr_style(JSONB) TO service_role;

ALTER TABLE app.links ADD COLUMN qr_style JSONB NOT NULL DEFAULT '{"dark":"#111827","light":"#ffffff","size":512}'::jsonb,
 ADD COLUMN qr_version BIGINT NOT NULL DEFAULT 0 CHECK(qr_version >= 0),
 ADD CONSTRAINT ck_links_qr_style CHECK(app.valid_qr_style(qr_style));

CREATE FUNCTION app.save_link_qr(p_actor UUID, p_link UUID, p_style JSONB, p_version BIGINT) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor app.users%ROWTYPE; link app.links%ROWTYPE;
BEGIN
 SELECT * INTO actor FROM app.users WHERE id=p_actor FOR UPDATE;
 IF NOT FOUND OR NOT actor.is_active OR actor.must_change_password THEN RAISE EXCEPTION 'QR_FORBIDDEN'; END IF;
 SELECT * INTO link FROM app.links WHERE id=p_link AND user_id=p_actor FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'LINK_NOT_FOUND'; END IF;
 IF p_version IS NULL OR link.qr_version <> p_version THEN RAISE EXCEPTION 'QR_CHANGED'; END IF;
 IF NOT app.valid_qr_style(p_style) THEN RAISE EXCEPTION 'INVALID_QR_STYLE'; END IF;
 UPDATE app.links SET qr_style=p_style, qr_version=qr_version+1, updated_at=now() WHERE id=p_link
 RETURNING * INTO link;
 RETURN jsonb_build_object('qrStyle',link.qr_style,'qrVersion',link.qr_version::text);
END;
$$;
REVOKE ALL ON FUNCTION app.save_link_qr(UUID,UUID,JSONB,BIGINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION app.save_link_qr(UUID,UUID,JSONB,BIGINT) TO service_role;
NOTIFY pgrst,'reload schema';
