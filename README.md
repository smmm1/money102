# Money102

Money102 is a private, single-owner login shell.

## Current scope

- The frontend contains only the sign-in screen.
- After a successful sign-in, the app shows an empty authenticated screen with a sign-out action.
- Public sign-up is disabled.
- The Cloudflare Worker exposes only health, sign-in, session validation, and sign-out endpoints.
- Authentication records remain in the existing Cloudflare D1 database.
- The static frontend is built with Vite and deployed on Render.

## Configuration

Set `VITE_CLOUDFLARE_API_URL` to the existing Money102 Worker URL. If unset, the frontend uses the production Worker URL configured in `src/CloudAuth.tsx`.

## Local development

```sh
npm install
npm run build
npm run preview
```

## Data safety

The cleanup removes obsolete application routes, validation logic, and unused Worker source from the active code. It does not delete or reset Cloudflare D1, the owner account, password hashes, existing sessions, historical migration files, or stored records. Historical migrations are retained because they document the database schema already applied in production.
