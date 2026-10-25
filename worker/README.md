# Money102 Worker — Life Simulation

This source is copied from the currently deployed `money102-api` Worker as a version-controlled baseline. The branch contains proposed changes only; it has **not** been deployed to production or staging.

## Life simulation changes
- The first authenticated visit after this migration detects the old Mira/Nori/Kai game cast.
- The old simulator state is archived in `simulator_world_archive` before the new Thai neighbourhood is saved.
- Old simulator chat-memory rows are cleared because the new game has no AI chat. This table is game-only and is separate from Money102 finance, notes, health and account data.
- Player actions are deterministic rules. The old `/api/simulator/turn` route returns HTTP 410 and does not call Gemini.
- A `scheduled()` handler advances resident needs and routines for elapsed time, bounded to seven days per run.

## Before deploy
1. Review the full diff and run syntax/build checks.
2. Confirm production and staging Worker bindings both point to their intended D1 databases.
3. Configure a Cron Trigger such as `*/5 * * * *` for the scheduled handler in both environments.
4. Deploy staging first; test sign-in, existing app data, cast migration, activity commands, offline catch-up, and idempotency.
5. Promote to production only after staging passes.

## Data safety
Only fictional simulator state and simulator chat memory are reset. The `app_users`, `app_sessions`, `user_app_data` tables and all Money102 account records are not modified by the cast reset.
