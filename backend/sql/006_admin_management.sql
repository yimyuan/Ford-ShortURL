ALTER TABLE app.users ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE app.admin_audit_logs (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 actor_id UUID NOT NULL,
 actor_email TEXT NOT NULL,
 target_id UUID NOT NULL,
 target_email TEXT NOT NULL,
 action TEXT NOT NULL CHECK (action IN ('change_role','suspend','activate','reset_password','delete_user','change_password')),
 details JSONB NOT NULL DEFAULT '{}'::jsonb,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_admin_audit_created ON app.admin_audit_logs (created_at DESC, id DESC);
ALTER TABLE app.admin_audit_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app.admin_audit_logs FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON app.admin_audit_logs TO service_role;

-- Audit snapshots intentionally survive deletion of the target or actor account.
CREATE FUNCTION app.admin_manage_user(
 p_actor UUID, p_target UUID, p_action TEXT, p_version BIGINT,
 p_role TEXT DEFAULT NULL, p_password_hash TEXT DEFAULT NULL,
 p_email_confirmation TEXT DEFAULT NULL, p_link_count BIGINT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor app.users%ROWTYPE; target app.users%ROWTYPE;
 details JSONB := '{}'::jsonb; affected BIGINT; audit_id UUID;
BEGIN
 -- A single lock order prevents deadlocks between administrators managing each other.
 PERFORM id FROM app.users WHERE id IN (p_actor,p_target) ORDER BY id FOR UPDATE;
 SELECT * INTO actor FROM app.users WHERE id=p_actor;
 SELECT * INTO target FROM app.users WHERE id=p_target;
 IF actor.id IS NULL OR actor.role <> 'admin' OR NOT actor.is_active OR actor.must_change_password THEN
  RAISE EXCEPTION 'ADMIN_FORBIDDEN';
 END IF;
 IF target.id IS NULL THEN RAISE EXCEPTION 'USER_NOT_FOUND'; END IF;
 IF target.is_primary_admin OR target.id=actor.id THEN RAISE EXCEPTION 'PRIMARY_ADMIN_PROTECTED'; END IF;
 IF (target.role='admin' OR p_action='change_role') AND NOT actor.is_primary_admin THEN
  RAISE EXCEPTION 'ADMIN_FORBIDDEN';
 END IF;
 IF p_version IS NULL OR target.auth_version <> p_version THEN RAISE EXCEPTION 'USER_CHANGED'; END IF;
 IF p_action='change_role' THEN
  IF p_role IS NULL OR p_role NOT IN ('admin','user') THEN RAISE EXCEPTION 'INVALID_ACTION'; END IF;
  IF target.role=p_role THEN RAISE EXCEPTION 'NO_CHANGE'; END IF;
  details := jsonb_build_object('from',target.role,'to',p_role);
  UPDATE app.users SET role=p_role,auth_version=auth_version+1 WHERE id=p_target;
 ELSIF p_action IN ('activate','suspend') THEN
  IF target.is_active=(p_action='activate') THEN RAISE EXCEPTION 'NO_CHANGE'; END IF;
  UPDATE app.users SET is_active=(p_action='activate'),auth_version=auth_version+1 WHERE id=p_target;
 ELSIF p_action='reset_password' THEN
  IF p_password_hash IS NULL OR p_password_hash !~ '^scrypt\$131072\$8\$1\$[a-f0-9]{32}\$[a-f0-9]{128}$' THEN
   RAISE EXCEPTION 'INVALID_ACTION';
  END IF;
  UPDATE app.users SET password_hash=p_password_hash,must_change_password=TRUE,auth_version=auth_version+1 WHERE id=p_target;
 ELSIF p_action='delete_user' THEN
  IF p_email_confirmation IS DISTINCT FROM target.email THEN RAISE EXCEPTION 'EMAIL_CONFIRMATION_REQUIRED'; END IF;
  SELECT count(*) INTO affected FROM app.links WHERE user_id=p_target;
  IF p_link_count IS DISTINCT FROM affected THEN RAISE EXCEPTION 'USER_CHANGED'; END IF;
  details := jsonb_build_object('deletedLinks',affected);
  DELETE FROM app.links WHERE user_id=p_target;
  DELETE FROM app.users WHERE id=p_target;
 ELSE RAISE EXCEPTION 'INVALID_ACTION';
 END IF;
 INSERT INTO app.admin_audit_logs(actor_id,actor_email,target_id,target_email,action,details)
 VALUES(actor.id,actor.email,target.id,target.email,p_action,details) RETURNING id INTO audit_id;
 RETURN jsonb_build_object('auditId',audit_id,'action',p_action);
END;
$$;
REVOKE ALL ON FUNCTION app.admin_manage_user(UUID,UUID,TEXT,BIGINT,TEXT,TEXT,TEXT,BIGINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION app.admin_manage_user(UUID,UUID,TEXT,BIGINT,TEXT,TEXT,TEXT,BIGINT) TO service_role;

CREATE FUNCTION app.change_own_password(p_user UUID,p_version BIGINT,p_password_hash TEXT)
 RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE account app.users%ROWTYPE;
BEGIN
 SELECT * INTO account FROM app.users WHERE id=p_user FOR UPDATE;
 IF account.id IS NULL OR NOT account.is_active OR account.auth_version IS DISTINCT FROM p_version THEN
  RAISE EXCEPTION 'USER_CHANGED';
 END IF;
 IF p_password_hash IS NULL OR p_password_hash !~ '^scrypt\$131072\$8\$1\$[a-f0-9]{32}\$[a-f0-9]{128}$' THEN
  RAISE EXCEPTION 'INVALID_ACTION';
 END IF;
 UPDATE app.users SET password_hash=p_password_hash,must_change_password=FALSE,auth_version=auth_version+1 WHERE id=p_user;
 INSERT INTO app.admin_audit_logs(actor_id,actor_email,target_id,target_email,action)
 VALUES(account.id,account.email,account.id,account.email,'change_password');
END;
$$;
REVOKE ALL ON FUNCTION app.change_own_password(UUID,BIGINT,TEXT) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION app.change_own_password(UUID,BIGINT,TEXT) TO service_role;
NOTIFY pgrst,'reload schema';
