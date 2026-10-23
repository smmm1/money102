# money102: Cloudflare Workers + D1 migration

## Safety status

This branch is a staging implementation only. It does not change `main`, Render production, or the existing Supabase project.

- Existing Supabase Auth is intentionally retained so current email/password accounts continue to work.
- Savings, health, notes, and other `lamoon-*` browser state will be copied to Cloudflare D1 after a successful authenticated request.
- The Worker verifies the bearer token with Supabase Auth and derives the user ID from that verified response. The client cannot choose another user's ID.
- Browser localStorage is retained as a local cache/fallback. Do not clear browser storage or delete Supabase resources during migration.
- This stores the existing app state as one JSON snapshot per user, rather than normalizing each domain into separate SQL tables.

## Create the staging database

1. In Cloudflare Dashboard, create a D1 database named `money102-data`.
2. Copy its actual database ID into `wrangler.toml` (replace `REPLACE_WITH_D1_DATABASE_ID`).
3. Apply the schema to the new D1 database: `npx wrangler d1 execute money102-data --remote --file=worker/schema.sql`.
4. Configure Worker secrets:
   - `SUPABASE_URL`: the existing Supabase project URL.
   - `SUPABASE_PUBLISHABLE_KEY`: the existing publishable key (not a service-role/secret key).
   Use `npx wrangler secret put SUPABASE_URL` and `npx wrangler secret put SUPABASE_PUBLISHABLE_KEY`.
5. Deploy this Worker only to a staging Worker name/environment first, and set `VITE_CLOUDFLARE_API_URL` in a preview build to that staging URL.

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
