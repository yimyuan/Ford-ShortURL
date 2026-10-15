CREATE TABLE app.analytics_state (
 singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK(singleton),
 daily_started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO app.analytics_state(singleton) VALUES(TRUE);
ALTER TABLE app.analytics_state ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app.analytics_state FROM PUBLIC,anon,authenticated,service_role;

CREATE TABLE app.link_click_daily (
 link_id UUID NOT NULL REFERENCES app.links(id) ON DELETE CASCADE,
 day DATE NOT NULL,
 click_count BIGINT NOT NULL CHECK(click_count > 0),
 PRIMARY KEY(link_id,day)
);
ALTER TABLE app.link_click_daily ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app.link_click_daily FROM PUBLIC,anon,authenticated,service_role;

-- One transaction counts a successful GET in both lifetime and Thai-day totals.
-- HEAD, disabled links/owners and stale cache IDs do not increment either counter.
CREATE OR REPLACE FUNCTION app.resolve_short_link(p_code TEXT,p_id UUID DEFAULT NULL,p_count BOOLEAN DEFAULT TRUE)
RETURNS TABLE(id UUID,original_url TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF p_code IS NULL OR p_code !~ '^[A-Za-z0-9][A-Za-z0-9-]{1,38}[A-Za-z0-9]$' THEN RETURN; END IF;
 IF p_count THEN
  RETURN QUERY WITH resolved AS (
   UPDATE app.links AS l
   SET click_count=l.click_count+1,last_clicked_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP
   FROM app.users AS u
   WHERE l.short_code=p_code AND (p_id IS NULL OR l.id=p_id) AND l.is_active AND u.id=l.user_id AND u.is_active
   RETURNING l.id,l.original_url
  ), recorded AS (
   INSERT INTO app.link_click_daily AS daily(link_id,day,click_count)
   SELECT r.id,(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Bangkok')::date,1 FROM resolved AS r
   ON CONFLICT(link_id,day) DO UPDATE SET click_count=daily.click_count+1
   RETURNING daily.link_id
  ) SELECT r.id,r.original_url FROM resolved AS r JOIN recorded AS d ON d.link_id=r.id;
 ELSE
  RETURN QUERY SELECT l.id,l.original_url FROM app.links AS l JOIN app.users AS u ON u.id=l.user_id
   WHERE l.short_code=p_code AND (p_id IS NULL OR l.id=p_id) AND l.is_active AND u.is_active;
 END IF;
END;
$$;
REVOKE ALL ON FUNCTION app.resolve_short_link(TEXT,UUID,BOOLEAN) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION app.resolve_short_link(TEXT,UUID,BOOLEAN) TO service_role;

CREATE FUNCTION app.user_dashboard(p_actor UUID) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result JSONB;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM app.users WHERE id=p_actor AND is_active AND NOT must_change_password) THEN
  RAISE EXCEPTION 'DASHBOARD_FORBIDDEN';
 END IF;
 WITH owned AS MATERIALIZED (SELECT * FROM app.links WHERE user_id=p_actor),
 bounds AS (SELECT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Bangkok')::date AS today,
  daily_started_at,(daily_started_at AT TIME ZONE 'Asia/Bangkok')::date AS started_day FROM app.analytics_state WHERE singleton),
 days AS (SELECT b.today-offsets.n AS day FROM bounds AS b CROSS JOIN generate_series(0,6) AS offsets(n)),
 daily AS (SELECT d.day,sum(d.click_count) AS clicks FROM app.link_click_daily AS d
  JOIN owned AS l ON l.id=d.link_id CROSS JOIN bounds AS b WHERE d.day BETWEEN b.today-6 AND b.today GROUP BY d.day),
 top_links AS (SELECT id,short_code,original_url,click_count,last_clicked_at FROM owned WHERE click_count>0
  ORDER BY click_count DESC,created_at DESC,id LIMIT 5)
 SELECT jsonb_build_object(
  'totalLinks',(SELECT count(*)::text FROM owned),
  'totalClicks',(SELECT coalesce(sum(click_count),0)::text FROM owned),
  'clickedLinks',(SELECT count(*)::text FROM owned WHERE click_count>0),
  'today',b.today,'timezone','Asia/Bangkok','trackingSince',b.daily_started_at,
  'daily',(SELECT jsonb_agg(jsonb_build_object('day',days.day,'clicks',CASE WHEN days.day<b.started_day THEN NULL ELSE coalesce(daily.clicks,0)::text END) ORDER BY days.day)
   FROM days LEFT JOIN daily ON daily.day=days.day),
  'topLinks',coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'shortCode',short_code,'originalUrl',original_url,'clickCount',click_count::text,'lastClickedAt',last_clicked_at)
   ORDER BY click_count DESC,id) FROM top_links),'[]'::jsonb)
 ) INTO result FROM bounds AS b;
 RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION app.user_dashboard(UUID) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION app.user_dashboard(UUID) TO service_role;
NOTIFY pgrst,'reload schema';
