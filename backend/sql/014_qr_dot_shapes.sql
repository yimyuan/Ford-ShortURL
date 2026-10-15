-- Add only a short setting to each link; no images or logos are stored.
CREATE OR REPLACE FUNCTION app.valid_qr_style(style JSONB) RETURNS BOOLEAN
LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $$
BEGIN
 IF style IS NULL OR jsonb_typeof(style) <> 'object' THEN RETURN FALSE; END IF;
 IF NOT (style ?& ARRAY['dark','light','size']) OR style - ARRAY['dark','light','size','shape'] <> '{}'::jsonb
  OR jsonb_typeof(style->'dark') <> 'string' OR jsonb_typeof(style->'light') <> 'string'
  OR jsonb_typeof(style->'size') <> 'number'
  OR style->>'dark' !~ '^#[0-9a-fA-F]{6}$' OR style->>'light' !~ '^#[0-9a-fA-F]{6}$'
  OR style->>'size' NOT IN ('256','512','1024') THEN RETURN FALSE; END IF;
 IF style ? 'shape' AND (jsonb_typeof(style->'shape') <> 'string' OR style->>'shape' NOT IN ('square','rounded','dots')) THEN RETURN FALSE; END IF;
 RETURN TRUE;
END;
$$;
ALTER TABLE app.links ALTER COLUMN qr_style SET DEFAULT '{"dark":"#111827","light":"#ffffff","size":512,"shape":"square"}'::jsonb;
-- Existing three-field styles remain valid and render as square without rewriting links.
NOTIFY pgrst,'reload schema';
