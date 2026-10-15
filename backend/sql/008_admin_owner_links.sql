ALTER TABLE app.links ADD COLUMN management_version BIGINT NOT NULL DEFAULT 0 CHECK (management_version>=0);
ALTER TABLE app.admin_audit_logs DROP CONSTRAINT admin_audit_logs_action_check;
ALTER TABLE app.admin_audit_logs ADD CONSTRAINT admin_audit_logs_action_check CHECK(action IN
 ('change_role','suspend','activate','reset_password','delete_user','change_password','link_enable','link_disable','link_delete'));
CREATE INDEX idx_links_owner_page ON app.links(user_id,created_at DESC,id DESC);

CREATE FUNCTION app.admin_link_owners(p_actor UUID,p_page INTEGER DEFAULT 1,p_query TEXT DEFAULT '',p_filter TEXT DEFAULT 'all')
 RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE result JSONB;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM app.users WHERE id=p_actor AND role='admin' AND is_active AND NOT must_change_password) THEN RAISE EXCEPTION 'ADMIN_FORBIDDEN'; END IF;
 IF p_page IS NULL OR p_page<1 OR p_page>999999 OR p_query IS NULL OR length(p_query)>254 OR p_filter IS NULL OR p_filter NOT IN ('all','active','inactive') THEN RAISE EXCEPTION 'INVALID_ACTION'; END IF;
 WITH totals AS (
  SELECT user_id,count(*)::text AS link_count,sum(click_count)::text AS click_count FROM app.links GROUP BY user_id
 ), owners AS (
  SELECT u.id,u.email,u.role,u.is_active,u.is_primary_admin,t.link_count,t.click_count FROM app.users u JOIN totals t ON t.user_id=u.id
  WHERE position(lower(p_query) in lower(u.email))>0 AND (p_filter='all' OR u.is_active=(p_filter='active'))
 ), page AS (SELECT * FROM owners ORDER BY is_primary_admin DESC,email,id LIMIT 10 OFFSET (p_page-1)*10)
 SELECT jsonb_build_object('items',coalesce((SELECT jsonb_agg(jsonb_build_object(
  'id',id,'email',email,'role',role,'isActive',is_active,'isPrimaryAdmin',is_primary_admin,'linkCount',link_count,'clickCount',click_count)
  ORDER BY is_primary_admin DESC,email,id) FROM page),'[]'::jsonb),'total',(SELECT count(*) FROM owners),'page',p_page,'pageSize',10) INTO result;
 RETURN result;
END;
$$;

CREATE FUNCTION app.admin_owner_links(p_actor UUID,p_owner UUID,p_page INTEGER DEFAULT 1,p_query TEXT DEFAULT '',p_filter TEXT DEFAULT 'all')
 RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE owner app.users%ROWTYPE; result JSONB;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM app.users WHERE id=p_actor AND role='admin' AND is_active AND NOT must_change_password) THEN RAISE EXCEPTION 'ADMIN_FORBIDDEN'; END IF;
 SELECT * INTO owner FROM app.users WHERE id=p_owner;
 IF owner.id IS NULL THEN RAISE EXCEPTION 'USER_NOT_FOUND'; END IF;
 IF p_page IS NULL OR p_page<1 OR p_page>999999 OR p_query IS NULL OR length(p_query)>8192 OR p_filter IS NULL OR p_filter NOT IN ('all','active','inactive','owner_suspended') THEN RAISE EXCEPTION 'INVALID_ACTION'; END IF;
 WITH matches AS (
  SELECT id,short_code,original_url,click_count::text,is_active,created_at,last_clicked_at,management_version::text FROM app.links
  WHERE user_id=p_owner AND (position(lower(p_query) in lower(original_url))>0 OR position(lower(p_query) in lower(short_code))>0)
   AND (p_filter='all' OR (p_filter='active' AND is_active AND owner.is_active) OR (p_filter='inactive' AND NOT is_active)
    OR (p_filter='owner_suspended' AND is_active AND NOT owner.is_active))
 ), page AS (SELECT * FROM matches ORDER BY created_at DESC,id DESC LIMIT 10 OFFSET (p_page-1)*10)
 SELECT jsonb_build_object('items',coalesce((SELECT jsonb_agg(to_jsonb(page) ORDER BY created_at DESC,id DESC) FROM page),'[]'::jsonb),
  'total',(SELECT count(*) FROM matches),'page',p_page,'pageSize',10,
  'owner',jsonb_build_object('id',owner.id,'email',owner.email,'role',owner.role,'isActive',owner.is_active,'isPrimaryAdmin',owner.is_primary_admin,
   'linkCount',(SELECT count(*)::text FROM app.links WHERE user_id=p_owner),'clickCount',(SELECT coalesce(sum(click_count),0)::text FROM app.links WHERE user_id=p_owner))) INTO result;
 RETURN result;
END;
$$;

CREATE FUNCTION app.admin_manage_link(p_actor UUID,p_owner UUID,p_link UUID,p_action TEXT,p_version BIGINT,p_code_confirmation TEXT DEFAULT NULL)
 RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor app.users%ROWTYPE; owner app.users%ROWTYPE; link app.links%ROWTYPE; audit_id UUID;
BEGIN
 PERFORM id FROM app.users WHERE id IN(p_actor,p_owner) ORDER BY id FOR UPDATE;
 SELECT * INTO actor FROM app.users WHERE id=p_actor;
 SELECT * INTO owner FROM app.users WHERE id=p_owner;
 IF actor.id IS NULL OR actor.role<>'admin' OR NOT actor.is_active OR actor.must_change_password THEN RAISE EXCEPTION 'ADMIN_FORBIDDEN'; END IF;
 IF owner.id IS NULL THEN RAISE EXCEPTION 'USER_NOT_FOUND'; END IF;
 IF owner.role='admin' AND owner.id<>actor.id AND NOT actor.is_primary_admin THEN RAISE EXCEPTION 'ADMIN_FORBIDDEN'; END IF;
 SELECT * INTO link FROM app.links WHERE id=p_link AND user_id=p_owner FOR UPDATE;
 IF link.id IS NULL THEN RAISE EXCEPTION 'LINK_NOT_FOUND'; END IF;
 IF p_version IS NULL OR link.management_version<>p_version THEN RAISE EXCEPTION 'LINK_CHANGED'; END IF;
 IF p_action IN ('link_enable','link_disable') THEN
  IF link.is_active=(p_action='link_enable') THEN RAISE EXCEPTION 'NO_CHANGE'; END IF;
  UPDATE app.links SET is_active=(p_action='link_enable'),management_version=management_version+1 WHERE id=p_link;
 ELSIF p_action='link_delete' THEN
  IF p_code_confirmation IS DISTINCT FROM link.short_code THEN RAISE EXCEPTION 'CODE_CONFIRMATION_REQUIRED'; END IF;
  DELETE FROM app.links WHERE id=p_link;
 ELSE RAISE EXCEPTION 'INVALID_ACTION'; END IF;
 INSERT INTO app.admin_audit_logs(actor_id,actor_email,target_id,target_email,action,details)
 VALUES(actor.id,actor.email,owner.id,owner.email,p_action,jsonb_build_object('linkId',link.id,'shortCode',link.short_code)) RETURNING id INTO audit_id;
 RETURN jsonb_build_object('auditId',audit_id,'action',p_action);
END;
$$;
REVOKE ALL ON FUNCTION app.admin_link_owners(UUID,INTEGER,TEXT,TEXT) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION app.admin_owner_links(UUID,UUID,INTEGER,TEXT,TEXT) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION app.admin_manage_link(UUID,UUID,UUID,TEXT,BIGINT,TEXT) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION app.admin_link_owners(UUID,INTEGER,TEXT,TEXT),app.admin_owner_links(UUID,UUID,INTEGER,TEXT,TEXT),app.admin_manage_link(UUID,UUID,UUID,TEXT,BIGINT,TEXT) TO service_role;
NOTIFY pgrst,'reload schema';
