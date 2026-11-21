# Money102 repository guidance

## Current product scope

Money102 is intentionally a private, single-owner login shell:
- Keep sign-in, session validation, and sign-out working.
- Keep public sign-up disabled.
- After sign-in, show only an empty authenticated screen and a sign-out action.
- Do not restore former savings, health, notes, split-bill, BBQ, simulation, or other app modules unless explicitly requested.

## Infrastructure

- Static frontend: Render at `https://money102.onrender.com`.
- Authentication API and account/session records: existing Cloudflare Worker + D1.
- Do not introduce Vercel or Supabase.

## Safety

- Do not delete or reset production D1, the owner account, password hashes, sessions, or stored records as part of code cleanup.
- Keep historical database migrations immutable; they may already be applied in production.
- Never claim a production deploy succeeded without checking the live Render service/deploy status.
- Verify the production build before reporting completion.
