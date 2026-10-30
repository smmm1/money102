# DayTogether (ชื่อชั่วคราว)

เว็บจดบันทึกชีวิตส่วนตัวภาษาไทย พัฒนาด้วย React + TypeScript + Vite, Cloudflare Worker API, Cloudflare D1 และ Render

## Phase 2 architecture

- **Frontend:** React + TypeScript + Vite. Render serves the static app.
- **Authentication:** Cloudflare Worker provides sign-up/sign-in, hashed sessions, password change, logout and account deletion. Passwords are hashed with PBKDF2-SHA-256; session tokens are stored hashed in D1.
- **Persistence:** App state is validated on the server and stored in D1 by authenticated `user_id`. The browser storage bridge is memory-only; it does not use persistent browser localStorage.
- **Isolation:** Cloudflare D1 does not provide PostgreSQL-style Row Level Security. Equivalent access isolation is enforced in the Worker: the user ID is derived only from a validated bearer session, and all snapshot reads/writes/deletes are scoped to that user ID. Never accept a client-supplied user ID as authority.
- **Migrations:** `workers/migrations/0000_auth_snapshot.sql` creates the authentication/session/snapshot tables; `0001_daytogether.sql` defines normalized domain tables; `0002_migration_ledger.sql` records the applied schema set; `0003_auth_rate_limits.sql` adds hashed IP/identity counters for sign-in and sign-up throttling (8 attempts per identity and 30 per IP per 15-minute window). Old rate-limit buckets are periodically pruned. The current UI writes a validated JSON snapshot; normalized domain tables are prepared but are not yet the active write path.
- **Staging resources:** `wrangler.daytogether.toml` targets the isolated `daytogether-phase2-preview-data` D1 database and `daytogether-api-staging` Worker. The Phase 2 preview must use `VITE_CLOUDFLARE_API_URL=https://daytogether-api-staging.s2mtha16.workers.dev`.
- **Production safety:** This Phase 2 branch/preview is isolated. It does not alter `money102.onrender.com`, the production Worker, or the production D1 database.

## Development and checks

Requires Node.js 22+.

```sh
npm install
npm test
npm run check
npm run build
```

For the Worker, apply the SQL migrations to the configured staging database before deploying:

```sh
npx wrangler d1 migrations apply daytogether-phase2-preview-data --config wrangler.daytogether.toml --remote
npx wrangler deploy --config wrangler.daytogether.toml
```

Do not run these commands against the production database without a reviewed backup and an explicit production deployment plan.

## Authentication and privacy

- `POST /api/auth/signup`, `POST /api/auth/signin`, `GET /api/auth/me`
- `POST /api/auth/password`, `POST /api/auth/logout`, `DELETE /api/auth/account`
- `GET/PUT /api/state` (server validates payload shape and money constraints; compare-and-set revision prevents silent cross-tab overwrite)
- Health and note content, password fields and request bodies must not be written to logs.
- Logout clears the in-memory browser snapshot and session token.
- JSON and CSV exports are generated locally on demand. CSV values are escaped against spreadsheet formula injection.
- Email-based password reset is not implemented because no email provider or verification flow is configured.
- Native RLS is not available in D1; ownership checks in the Worker are the enforcement boundary.

## Current scope limits

- Normalized domain tables are defined by migration but the frontend currently persists a single validated snapshot. CRUD over the normalized tables is a later migration step.
- No private photo storage for BBQ visits yet.
- E2E browser checks against separate user accounts, responsive widths and failure/expiry paths remain necessary before production release.
- A passing CI run does not prove a production deploy. Render/Worker deploy status must be verified separately.
