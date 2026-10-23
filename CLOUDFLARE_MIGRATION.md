# money102: Cloudflare Workers + D1 migration

## Safety status

This branch is a staging implementation only. It does not change `main`, Render production, or the existing Supabase project.

- Existing Supabase Auth is intentionally retained so current email/password accounts continue to work.
- Savings, health, notes, and other `lamoon-*` browser state will be copied to Cloudflare D1 after a successful authenticated request.
- The Worker verifies the bearer token with Supabase Auth and derives the user ID from that verified response. The client cannot choose another user's ID.
- Browser localStorage is retained as a local cache/fallback. Do not clear browser storage or delete Supabase resources during migration.
- This stores the existing app state as one JSON snapshot per user, rather than normalizing each domain into separate SQL tables.

## Provisioned staging resources

- D1 database: `money102-data`
- D1 database ID: `0af52b75-09ca-4fbe-aab7-d406688303c2`
- D1 schema: applied and verified (`user_app_data` table and `idx_user_app_data_updated_at` index)
- Worker: `money102-api`
- Worker URL: `https://money102-api.s2mtha16.workers.dev`
- Worker is deployed with D1 binding and Supabase Auth validation settings. This does not change the Render frontend or production app configuration.
- `wrangler.toml` on this branch has the real D1 ID.

## Staging checks required before production

The Worker has been provisioned, but the HTTP/authentication and frontend end-to-end checks below are not yet complete. Do not treat the migration as production-ready until they pass.

## Staging checks required before production

- `GET /health` returns `{"ok":true,...}`.
- `GET /api/state` without a bearer token returns 401.
- A signed-in test user can write and read a snapshot.
- A second test user cannot read the first user's snapshot.
- A first login migrates local `lamoon-*` keys without deleting them.
- Reopen the app and confirm savings transactions, health profiles/records, and notes persist.
- Test save, edit, delete, sign out/in, refresh, and a second browser.
- Inspect Worker logs and D1 rows; do not use real sensitive data for the first test.

## Production cutover

Do not merge this branch, change the Render production environment, or remove Supabase tables until all staging checks pass and a backup/export of existing data is available. The current Supabase schema from PR #11 was not confirmed applied, so treat browser localStorage as the known source of existing user data until verified otherwise.

## Important limitations

- Supabase Auth remains in use. Moving authentication itself to Cloudflare would require a separate account/password migration and cannot preserve existing passwords by simply copying D1 data.
- Cloudflare D1 stores the current app state as a JSON payload for compatibility. Normalized tables can be a later migration once the data flow is stable.
- This worker validates each request by calling Supabase Auth's `/auth/v1/user` endpoint. If Supabase Auth is unavailable, the API fails closed and does not accept unauthenticated writes.
