# Money102 Life Simulation — Thai Life Foundation

## Non-negotiable constraints
- No generative AI, Gemini, LLM, inference endpoint, or AI API in simulation or dialogue.
- Preserve Money102 authentication, existing features, and user data. Never reset the Money102 account/database when resetting game characters.
- Character reset applies only to the fictional simulation cast and world save. Migrate/backup existing game save before replacing it.
- Server is authoritative for time, needs, money, relationships, actions, and event history.
- Offline progression is server-side scheduled simulation; browser time is not trusted for rewards or money.

## Product direction
A detailed top-down 2D pixel-life simulation grounded in everyday contemporary Thailand. The world is a neighbourhood, not a caricature: rented rooms, dorms, row houses, family homes, market stalls, food shops, public parks, bus stops, motorcycle taxis, delivery riders, office workers, students, shift workers, small business owners, elders and neighbours.

## Daily-life systems
1. **Clock and calendar:** 24-hour Thai-local clock, weekday/weekend, work shifts, school terms, public holidays, rainy-season/heat events as deterministic calendar rules.
2. **Needs:** hunger, energy/sleep debt, hygiene, bladder, social connection, fun, health, stress, and comfort. Needs drift continuously and influence priorities.
3. **Schedules:** character-specific routines by hour, flexible around urgent needs, work/school shifts, travel time, and player commands.
4. **Sleep:** bedtime and wake windows, sleeping status, sleep debt recovery, interrupted sleep if bladder/hunger is critical, shift-work schedules, morning preparation and commute. No sexualized content; bedrooms are private interiors and sleeping is a normal life activity.
5. **Food:** Thai meal categories and costs (rice and curry, noodles, made-to-order food, market snacks, home cooking), affordability, cooking supplies, meals and leftovers.
6. **Money and work:** fictional cash, wage/earnings rules, commuting and meal costs, bills/rent, savings, part-time shifts, payday and budgeting. This simulation wallet is separate from real Money102 financial records unless the user explicitly authorizes a read-only integration.
7. **Home:** chores, laundry, dishes, cleaning, showering, sleep, cooking, furniture comfort and rent due dates.
8. **Mobility:** walkable paths, map collision, destination routing, transit/ride-hailing/motorcycle taxi/bus rules, commute durations, rain/heat slowdown.
9. **Relationships:** acquaintance/friend/family/romance boundaries, affinity, trust, familiarity, recent interaction cooldowns, gossip/events. Relationships change from explicit actions and context, not hidden AI.
10. **Work and study:** shifts, attendance, study blocks, fatigue, performance, deadlines, income and outcomes via explicit formulas.
11. **Community events:** market day, temple/community fair, local sports, rainy-day disruption, family call, delivery peak, payday, school exam, and public holiday events from rules and seeded schedules.
12. **Health and safety:** fatigue and wellness effects only, no medical diagnosis. Respectful portrayal of gender, age, disability and occupations.
13. **Player commands:** select resident, go to location, eat, sleep, shower, work, study, socialize, exercise, shop, cook, clean, relax, use phone, use toilet. Orders have priorities, duration and cancellation rules.
14. **Events and memory:** event ledger with timestamp, actor, location, action and result; canned dialogue templates with condition tags; no free-form AI response.
15. **Pixel-world presentation:** Phaser scene, tilemap, collision layers, pathfinding, animated sprites, interiors, day/night palette, rain, Thai signage and sound toggle. Asset size is not a concern, but bundle lazy-loading and mobile performance still matter.

## Initial fictional cast (replace old game characters only)
- Ploy, 27, accounting staff; careful with money, rents near a market, calls family after work.
- Non, 30, food-delivery rider; income depends on shifts and peak hours, sends money home.
- Fah, 22, university student; dorm life, study schedule, part-time work and discretionary spending.
- Uncle Somchai, 58, curry-rice stall owner; early start, community ties, evening gardening.
- May, 34, nurse on rotating shifts; sleep schedule adapts to shifts.
- Jay, 25, mobile-repair technician; works at a small shop and games after work.
Names and traits are fictional and editable.

## Technical architecture
- Client: React + Phaser + TypeScript; rendering is separate from simulation rules.
- Rules package: pure deterministic functions; seeded randomness only if added, so test/replay remains possible.
- Server: existing Cloudflare Worker routes, authenticated user scope, scheduled handler/cron. First inspect deployed Worker source and D1 schema before changing routes or migrations.
- Persistence: world metadata, resident state, commands, and event ledger are separate from financial transactions/notes/health data.
- Offline progression: store last_simulated_at in the database; scheduled job advances fixed-size bounded ticks and commits state atomically. On reconnect, run bounded catch-up to cover scheduler delays, with idempotency to prevent duplicate ticks.
- Concurrency: optimistic version or transaction/lock per world; prevent overlapping scheduled jobs and duplicate commands.
- API: GET state, POST command, GET event history. Remove /turn AI route from UI; keep unrelated Worker routes untouched.
- Security: validate commands server-side, check authenticated owner on every read/write, bound catch-up and event history, never trust client-provided cash or needs.
- Reliability: snapshot backup before cast reset, schema migration only after confirming current D1 tables and owner key.
- Tests: need drift, sleep schedule, shift work, affordability, relationships, day rollover, 7-day offline cap, command validation, ownership isolation, duplicate scheduled run and rollback.

## Implementation status (feature branch; not deployed)
- Added a Phaser-powered canvas renderer with a broad Thai semi-urban neighbourhood: market, curry-rice shop, grocery, rental rooms, dorm, office, clinic, repair shop, laundry, pharmacy, library, bus stop, park, community pavilion, transit station and temple.
- Buildings have clickable entry areas with separate room-interior scenes; the large map supports drag panning and wheel zoom.
- Added selectable pixel-style residents, resident needs bars and an in-game wallet panel. Game money is separate from real Money102 financial data.
- Replaced the old starter cast with six fictional Thai residents and distinct work/school/sleep routines, including an overnight nursing shift.
- Added deterministic hunger, energy, hygiene, social, fun and bladder progression, activity labels, mood bands, work income, weekly household spending and monthly rent.
- Added a smoke test by evaluating the Worker source with a deterministic UUID stub: syntax passed; 6-resident world, bounded needs, valid activities, finite balances and multi-week progression passed.
- Vercel status still reports a build-rate-limit failure, so the frontend TypeScript/Vite build is not yet independently confirmed.
- Still to do before rollout: proper Phaser tilemap/collision/pathfinding and animated sprite assets, richer room-specific interaction/actions, automated tests in repository CI, staging deployment with the intended D1 binding, Cron Trigger configuration, and end-to-end verification of login and all Money102 features.
- No production deployment, D1 reset, login changes or real Money102 data changes have been made.
