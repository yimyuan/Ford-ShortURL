CREATE INDEX idx_links_owner_clicks ON app.links(user_id,click_count DESC,created_at DESC,id DESC);
CREATE FUNCTION app.user_link_history(p_actor UUID,p_page INTEGER DEFAULT 1,p_query TEXT DEFAULT '',p_clicks TEXT DEFAULT 'all',p_period TEXT DEFAULT 'all',p_sort TEXT DEFAULT 'newest')
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result JSONB; today DATE := (now() AT TIME ZONE 'Asia/Bangkok')::date; start_at TIMESTAMPTZ; end_at TIMESTAMPTZ;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM app.users WHERE id=p_actor AND is_active AND NOT must_change_password) THEN RAISE EXCEPTION 'LINK_HISTORY_FORBIDDEN'; END IF;
 IF p_page IS NULL OR p_page<1 OR p_page>999999 OR p_query IS NULL OR length(p_query)>8192
  OR p_clicks IS NULL OR p_clicks NOT IN ('all','opened','unopened') OR p_period IS NULL OR p_period NOT IN ('all','today','7d','30d')
  OR p_sort IS NULL OR p_sort NOT IN ('newest','oldest','clicks') THEN RAISE EXCEPTION 'INVALID_LINK_FILTERS'; END IF;
 IF p_period<>'all' THEN
  start_at := (today - CASE p_period WHEN '7d' THEN 6 WHEN '30d' THEN 29 ELSE 0 END)::timestamp AT TIME ZONE 'Asia/Bangkok';
  end_at := (today+1)::timestamp AT TIME ZONE 'Asia/Bangkok';
 END IF;
 WITH filtered AS MATERIALIZED (
  SELECT id,short_code,original_url,click_count,is_active,created_at,last_clicked_at FROM app.links
  WHERE user_id=p_actor AND (p_query='' OR position(lower(p_query) IN lower(short_code))>0 OR position(lower(p_query) IN lower(original_url))>0)
   AND (p_clicks='all' OR (p_clicks='opened' AND click_count>0) OR (p_clicks='unopened' AND click_count=0))
   AND (p_period='all' OR (created_at>=start_at AND created_at<end_at))
 ), ordered AS (
  SELECT *,row_number() OVER(ORDER BY CASE WHEN p_sort='clicks' THEN click_count END DESC,
   CASE WHEN p_sort='oldest' THEN created_at END ASC,
   CASE WHEN p_sort<>'oldest' THEN created_at END DESC,id DESC) AS ordinal FROM filtered
 ), paged AS (SELECT * FROM ordered ORDER BY ordinal LIMIT 10 OFFSET (p_page-1)*10)
 SELECT jsonb_build_object('items',coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'short_code',short_code,'original_url',original_url,
  'click_count',click_count::text,'is_active',is_active,'created_at',created_at,'last_clicked_at',last_clicked_at) ORDER BY ordinal) FROM paged),'[]'::jsonb),
  'total',(SELECT count(*) FROM filtered),'page',p_page,'pageSize',10) INTO result;
 RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION app.user_link_history(UUID,INTEGER,TEXT,TEXT,TEXT,TEXT) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION app.user_link_history(UUID,INTEGER,TEXT,TEXT,TEXT,TEXT) TO service_role;
NOTIFY pgrst,'reload schema';
