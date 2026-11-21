# Money102 repository guidance

## Current product scope

Money102 is intentionally reduced to a private login shell:
- Keep the sign-in flow and session validation working.
- Keep public sign-up disabled.
- After sign-in, show only an empty authenticated screen and a sign-out action.
- Do not restore savings, health, notes, split-bill, BBQ, simulation, or other former app modules unless the user explicitly requests them.

## Infrastructure

- Static frontend: Render.
- Authentication API and database: existing Cloudflare Worker + D1.
- Do not introduce Vercel or Supabase.

## Safety

- Do not delete or reset the production D1 database, owner account, password hash, or sessions as part of frontend cleanup.
- Never claim a production deploy succeeded without checking the live Render service/deploy status.
- Keep changes focused and verify the production build before reporting completion.
