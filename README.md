# Money102

Money102 is currently a private, single-owner login shell.

## Current scope

- The public frontend contains only the sign-in screen.
- After a successful sign-in, the app shows an empty authenticated screen with a sign-out action.
- Public sign-up is disabled.
- Authentication is handled by the existing Cloudflare Worker API.
- Account and session data remain in Cloudflare D1.
- The static frontend is built with Vite and deployed on Render.

## Configuration

Set `VITE_CLOUDFLARE_API_URL` to the existing Money102 Worker URL. If unset, the frontend uses the production Worker URL configured in `src/CloudAuth.tsx`.

## Local development

```sh
npm install
npm run build
npm run preview
```

## Important

This cleanup removes obsolete DayTogether application code and documentation from the active repository. It does not delete the existing Cloudflare D1 database, user account, password hash, or login sessions.
