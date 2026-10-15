-- Run after 001_initial_schema.sql. Enable Data API and add app to Exposed schemas.
-- Only the backend secret key may access these tables; Express authorizes requests.
BEGIN;
REVOKE ALL ON SCHEMA app FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE app.users, app.links FROM PUBLIC, anon, authenticated;
ALTER TABLE app.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.links ENABLE ROW LEVEL SECURITY;
GRANT USAGE ON SCHEMA app TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE app.users, app.links TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
