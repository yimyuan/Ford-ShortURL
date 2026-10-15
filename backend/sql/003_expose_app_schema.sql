-- Supabase API schema configuration applied on 2026-10-15.
-- This database override takes precedence over Dashboard Exposed schemas.
-- Update this list for future schemas, or RESET pgrst.db_schemas to return control to Dashboard.
ALTER ROLE authenticator SET pgrst.db_schemas = 'public, graphql_public, app';
NOTIFY pgrst, 'reload config';
NOTIFY pgrst, 'reload schema';
