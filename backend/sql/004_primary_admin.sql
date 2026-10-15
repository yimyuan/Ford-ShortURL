ALTER TABLE app.users ADD COLUMN is_primary_admin BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE app.users ADD CONSTRAINT ck_primary_admin_active
 CHECK (NOT is_primary_admin OR (role = 'admin' AND is_active));
CREATE UNIQUE INDEX uk_single_primary_admin ON app.users ((is_primary_admin)) WHERE is_primary_admin;

CREATE FUNCTION app.protect_primary_admin() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
 IF OLD.is_primary_admin THEN
  IF TG_OP = 'DELETE' THEN
   RAISE EXCEPTION 'PRIMARY_ADMIN_PROTECTED' USING ERRCODE = 'P0001';
  END IF;
  IF NOT NEW.is_primary_admin OR NEW.role <> 'admin' OR NOT NEW.is_active THEN
   RAISE EXCEPTION 'PRIMARY_ADMIN_PROTECTED' USING ERRCODE = 'P0001';
  END IF;
 END IF;
 IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION app.protect_primary_admin() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER protect_primary_admin BEFORE UPDATE OR DELETE ON app.users
 FOR EACH ROW EXECUTE FUNCTION app.protect_primary_admin();

CREATE FUNCTION app.bootstrap_primary_admin(p_email TEXT, p_password_hash TEXT) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE new_id UUID;
BEGIN
 -- Serialize concurrent first-setup attempts in the database, not in Node memory.
 LOCK TABLE app.users IN SHARE ROW EXCLUSIVE MODE;
 IF EXISTS (SELECT 1 FROM app.users WHERE is_primary_admin) THEN
  RAISE EXCEPTION 'PRIMARY_ADMIN_EXISTS' USING ERRCODE = 'P0001';
 END IF;
 IF p_email IS NULL OR length(p_email) > 254 OR p_email <> lower(btrim(p_email))
  OR p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
  RAISE EXCEPTION 'INVALID_ADMIN_EMAIL' USING ERRCODE = '22023';
 END IF;
 IF p_password_hash IS NULL OR p_password_hash !~ '^scrypt\$131072\$8\$1\$[a-f0-9]{32}\$[a-f0-9]{128}$' THEN
  RAISE EXCEPTION 'INVALID_PASSWORD_HASH' USING ERRCODE = '22023';
 END IF;
 INSERT INTO app.users (email, password_hash, role, is_active, is_primary_admin)
 VALUES (p_email, p_password_hash, 'admin', TRUE, TRUE) RETURNING id INTO new_id;
 RETURN new_id;
END;
$$;
REVOKE ALL ON FUNCTION app.bootstrap_primary_admin(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION app.bootstrap_primary_admin(TEXT, TEXT) TO service_role;
NOTIFY pgrst, 'reload schema';
