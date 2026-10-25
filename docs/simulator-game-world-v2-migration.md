# Money102 Game World v2 — migration and safety plan

## Scope

The game world becomes the entry hub for the existing Money102 tools. The world map contains interactive entrances to the real finance, notes, health, split-bill, and BBQ pages. The game reads a small summary from the existing Command Center state; it does not copy that data into simulator storage or write financial records.

## Data preservation

- Keep the existing D1 authentication tables: `app_users`, `app_sessions`, and `user_app_data`.
- Keep `simulator_worlds` as the per-user world-state table.
- Keep `simulator_memories` and all existing message rows unchanged.
- No tables are dropped, renamed, recreated, or truncated.
- World state is versioned additively inside the existing `state_json` payload. New optional fields are `version`, `lastSimulatedAt`, and resident `activity`.
- Older state JSON is read with defaults and upgraded only when a user loads or acts in their own world.
- Existing resident IDs (Mira, Nori, Kai) are preserved.

## Hybrid simulation rules

- D1 remains the source of truth for each authenticated user's world.
- On opening the world, the Worker calculates elapsed time since `lastSimulatedAt`; the world catches up without a continuously running process.
- Catch-up is capped at 24 real hours per load. Each elapsed real minute represents five in-world minutes.
- Routine and mood updates are deterministic and do not require Gemini.
- Gemini is still only called for conversation turns. If Gemini fails, basic world progression remains available.
- The app does not claim that a Money102 transaction was saved from the game. Actual finance/notes/health actions remain in their existing pages and save path.

## Verification before production

1. Confirm the PR branch builds and type-checks.
2. Sign in with an existing account and verify the world loads.
3. Compare memory counts and confirm previous conversations still appear.
4. Verify elapsed time is applied once on return, not repeatedly on every refresh.
5. Verify each world entrance opens the intended existing Money102 page.
6. Verify app data and world state remain isolated by authenticated user.
7. Test Gemini unavailable, then verify wander/socialize/time actions still work.
8. Confirm finance, notes, health, split, and BBQ data are unchanged.
9. Back up D1 before any production rollout.
10. Deploy only after review and explicit production approval.

## Current limitations

- Offline progression is catch-up on the next authenticated state request, not a background process running every second while the browser is closed.
- Portal tiles are connected to the existing page state and current in-memory summary; they do not duplicate those pages' forms inside the map yet.
- This branch does not deploy or change production bindings.
