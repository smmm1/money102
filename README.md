# DayTogether — A Life in 8 Billion

DayTogether is a Thai-first life simulation experience inspired by the idea of living one life among billions. Players create multiple lives, begin with different countries and family backgrounds, make choices as each person grows, and revisit each life through its timeline.

## Current application

- **Frontend:** React 19 + TypeScript + Vite.
- **Hosting:** Existing Render production service at https://money102.onrender.com. The project identity remains DayTogether.
- **Authentication:** Existing Cloudflare Worker sign-in and session flow is retained. Signup remains disabled for the existing single-account setup.
- **Persistence:** Each user's life records are stored in Cloudflare D1 through the authenticated `/api/state` snapshot endpoint, under the separate `lamoon-life-sim-v1` namespace.
- **Legacy data:** Previous DayTogether/Money102 snapshot namespaces are not deleted or rewritten by the life simulation. Writes merge the latest snapshot and use `expected_updated_at` compare-and-set.
- **Privacy:** No life records are persisted in browser localStorage. Session token handling remains in the existing authentication layer.

## Life simulation scope

- Start multiple independent lives.
- Randomized starting country, region, family background, and initial conditions.
- Age progression and life-stage events.
- Branching decisions that affect health, happiness, education, relationships, skills, and wealth.
- A timeline and archive of each life.
- Responsive Thai-first interface for desktop and mobile.

## Important simulation note

The current origin and life-event data are a creative game model, not a statistically calibrated forecast of real-world birth probabilities, socioeconomic outcomes, health, or lifespan. Country-level demographic data and more nuanced event systems are future simulation-engine work.

## Development and validation

Requires Node.js 22+.

```sh
npm install
npm test
npm run check
npm run build
```

Do not deploy to the production Render service or change the production Cloudflare Worker/D1 resources until CI, authenticated browser testing, and save/reload verification have passed.
