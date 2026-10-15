-- Allow all opaque colors; contrast becomes a non-blocking editor warning.
CREATE OR REPLACE FUNCTION app.valid_qr_style(style JSONB) RETURNS BOOLEAN
LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $$
BEGIN
 IF style IS NULL OR jsonb_typeof(style) <> 'object' THEN RETURN FALSE; END IF;
 IF NOT (style ?& ARRAY['dark','light','size']) OR style - ARRAY['dark','light','size'] <> '{}'::jsonb
  OR jsonb_typeof(style->'dark') <> 'string' OR jsonb_typeof(style->'light') <> 'string'
  OR jsonb_typeof(style->'size') <> 'number'
  OR style->>'dark' !~ '^#[0-9a-fA-F]{6}$' OR style->>'light' !~ '^#[0-9a-fA-F]{6}$'
  OR style->>'size' NOT IN ('256','512','1024') THEN RETURN FALSE; END IF;
 RETURN TRUE;
END;
$$;

NOTIFY pgrst,'reload schema';
