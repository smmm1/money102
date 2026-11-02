# DayTogether — Thailand Life Simulation

DayTogether is a Thai-first life simulation. Each character is born in a randomized year in Thailand (default range 1930–2025), province, urban/rural setting, and fictional household profile. The player advances year by year and makes choices shaped by age, work, education, household resources, relationships, and the historical period.

## Technology and production constraints

- React 19 + TypeScript + Vite.
- Existing Render production target: https://money102.onrender.com. The project remains DayTogether in the existing repository.
- Existing Cloudflare authentication is retained.
- Each player's lives persist in the authenticated Cloudflare D1 snapshot under the separate `lamoon-life-sim-v1` key.
- Writes merge the latest snapshot and use `expected_updated_at`; no browser localStorage is used.
- Do not modify the production Render service, Cloudflare Worker, or D1 schema while validating this branch.

## Simulation model

- Thailand only: random birth year, all 77 provinces including Bangkok, urban/rural context, household profile, parents' occupations, and siblings.
- Birth-year range is user-adjustable. Default: 1930–2025 (Gregorian years internally; Thai Buddhist Era shown in the interface).
- Each simulated year produces a sourced historical event when the year matches the event register; otherwise it generates a life-stage personal event.
- Choices include costs, success chances, success/failure outcomes, and stat effects. Chances are game mechanics affected by character education and skills, not measured real-world probabilities.
- Major historical events currently include 1932, 1941, 1957, 1973, 1976, 1992, 1997, 2004, 2006, 2010, 2011, 2014, and 2020. Each event stores a source URL and note.
- Location-sensitive events distinguish local direct exposure from national context. A nationwide headline is not treated as if every character personally experienced the same direct impact.
- Household profiles, personal events, and outcomes are fictional scenarios, not census distributions, biography claims, or forecasts.

## Historical source register

- 1932: Library of Congress — https://www.loc.gov/item/today-in-history/june-24/
- 1941: U.S. Department of State — https://history.state.gov/historicaldocuments/frus1941v05/d424
- 1957: U.S. Department of State — https://history.state.gov/historicaldocuments/frus1955-57v22/d523
- 1973: Cambridge University Press — https://www.cambridge.org/core/books/abs/political-change-in-southeast-asia/thailand/6F763505F17AFC9FC04BDFED22C78E66
- 1976: Moments of Silence — https://www.jstor.org/stable/j.ctvwvr2pb.12
- 1992: Amnesty International — https://www.amnesty.org/en/documents/asa39/010/1992/en/
- 1997: Bank of Thailand — https://www.bot.or.th/en/our-roles/special-measures/Tom-Yum-Kung-lesson.html
- 2004: United Nations Thailand — https://old.un.or.th/tsunamiinthailand/tsunami2004anditsimpact.html
- 2006: U.S. Department of State — https://2009-2017.state.gov/j/drl/rls/hrrpt/2006/78792.htm
- 2010: Human Rights Watch — https://www.hrw.org/report/2011/05/03/descent-chaos/thailands-2010-red-shirt-protests-and-government-crackdown
- 2011: World Bank / Royal Thai Government — https://openknowledge.worldbank.org/bitstream/10986/26862/1/698220WP0v20P10se0Only060Box370022B.pdf
- 2014: Amnesty International — https://www.amnesty.org/en/documents/ASA39/011/2014/en/
- 2020: WHO South-East Asia — https://apo.who.int/publications/i/item/9789290228011

## Known limitations before production

This is the first Thailand-focused simulation slice, not a complete social history of Thailand. Province-level demographic weights, household economics, occupational pathways, legal/social systems, local event coverage, and the personal event library still need deeper research. Demographic probabilities and historical household economics are not yet calibrated to census or longitudinal datasets. The game labels fictional probabilities and resource points as simulation mechanics rather than facts.

## Validation

```sh
npm install
npm test
npm run check
npm run build
```

Do not merge or deploy until CI, authenticated browser QA, and D1 save/reload behavior have been verified.