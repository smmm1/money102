# Moneyeep system rebuild

This repository copies the existing [smmm1/Moneyeep](https://github.com/smmm1/Moneyeep) app files while targeting Supabase project `xuxbvoflbrpypjtredrz`.

## Required setup before using the app

1. Open `supabase-config.js`.
2. Replace `PASTE_XUXBVOFLBRPYPJTREDRZ_PUBLISHABLE_KEY_HERE` with the publishable key for project `xuxbvoflbrpypjtredrz` from Supabase Project Settings / API Keys.
3. Never put a `service_role` or secret key in browser code.
4. Verify the existing tables and RLS policies in that project before relying on production writes. This repository change does not change database schema or policies.

Tables referenced in the source code: `finance_transactions`, `finance_recurring_expenses`, `finance_savings_goals`, `exercise_profiles`, `exercise_logs`, and `finance_notes`. The connected Supabase account denied permission to inspect the target project's schema, so the presence of these tables and their policies is not confirmed.

No mock data, AI features, or database migrations are included. Page source and UI assets are copied from the original repository without redesign.
