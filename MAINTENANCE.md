# UnderRadar maintenance and extension brief

## User goal

Maintain and extend the existing Steam hidden-gem tracker in this Perplexity Project. Preserve the existing app identity and its evidence-first distinction between observed activity and measured growth.

No particular new feature, unattended collection schedule, public publication, account login, or third-party access change has been requested yet. The backlog below is a proposed order of work, not a set of user-approved product decisions.

## Private GitHub repository

The user authorized placing this Project's app source and maintenance documentation in a private GitHub repository: https://github.com/cmdgns/underradar-steam-hidden-gem-tracker. Verify that its visibility remains private before uploading future changes; do not make it public or add collaborators without authorization.

Project files and GitHub are separate stores. The initial upload is a source-and-documentation snapshot, not an automatic synchronization service. For future maintenance, preserve the Project version, update the existing GitHub repository through a separate working clone, and verify the pushed commit. Never add a GitHub remote to or mutate Git history inside the platform-managed Project checkout.

## Implementation baseline

- **Frontend:** React, TypeScript, Vite, TanStack Query, Lucide icons, custom responsive CSS, and Satoshi typography.
- **Backend:** Express on port 5000, Cheerio public-page parsing, Drizzle ORM, and SQLite through `better-sqlite3`.
- **Source data:** Eight October 2026 games/demos in `app/server/seed.ts`. Initial metric observations are labeled approximately 24 October 2026 at 00:16 UTC.
- **API:** `GET /api/games` serves snapshots and computed metrics. `POST /api/refresh` attempts public SteamDB collection, limited to one attempt per 15 minutes in the running server process.
- **Failure handling:** Stop on access denial, rate limiting, or network unavailability; retain previous snapshots. Do not bypass verification walls or invent replacement measurements.
- **Database:** `snapshots` table stores the app ID, observation time, and JSON payload. Only additive schema changes are allowed; inspect the current schema first.
- **Current runtime:** The original session uses `/home/user/workspace/underradar`; its deployment binding points to `/home/user/workspace/underradar/dist/public`.

## Ranking and data semantics

- **Player velocity:** `((new players - old players) / old players) * 100 * 24 / elapsed hours`. Require two actual observations 6–48 hours apart and a nonzero baseline. The result is normalized daily change, not a forecast.
- **Follower growth:** Apply the same formula to the same app's actual follower observations. Do not substitute a parent game's followers for a demo.
- **Fallback proxy:** `players at observation / 24-hour peak * 100`. This describes activity relative to a daily high; it does not establish growth, retention, acceleration, or breakout probability.
- **Ordering:** Measured games rank first by player velocity. Unmeasured games follow, ordered separately by proxy. Do not numerically compare rates with proxy scores.
- **Prices:** U.S. Dollar row, not an arbitrary regional dollar price or a currency conversion.
- **Reviews:** SteamDB weighted rating, not Steam's raw positive-review share.
- **Missing values:** Keep missing observations null and show N/A or pending. Never manufacture history, sparklines, or follower growth.
- **Release caveats:** Melvor Idle 2 Demo has differing store/Steam metadata dates; the cohort uses the store date. GONE Fishing is an October 1.0 release with earlier Early Access and lifetime reviews. Preserve these notes.

SteamDB source pages remain linked per app in the seed records, including [Melvor Idle 2 Demo](https://steamdb.info/app/5373510/charts/), [just volleyball Demo](https://steamdb.info/app/5401090/charts/), [Moon Sweepers](https://steamdb.info/app/5335510/charts/), and [Scam With Your Friends](https://steamdb.info/app/4954910/charts/).

## Continue development safely

### Same-session changes

Keep using the original local source and deployment folder while its current binding is available. Make matching durable source updates in this Project's `app/` directory and submit the Project files; do not assume that changes to the original sandbox automatically persist here.

### Future sessions

1. Sync Project files and read this brief, the README, and relevant Project knowledge pages.
2. Restore dependencies with `npm ci` inside `app/`, then inspect the existing implementation before editing.
3. Select the existing owned app with `artifact_get(reference="c8cc6f78-40e4-4527-a54b-63f84caf9e0c")` before the first update from a new session. If source is unavailable, use the supported artifact download workflow.
4. Follow the loaded website-building edit checklist. Record the app's main flows before edits, test all flows after edits, and inspect browser errors.
5. Run `npm run check` and `npm run build`. Start the backend with the supported `start_server` tool and `npm run start` on port 5000.
6. Deploy the built `dist/public` directory. For the first cross-session update, pass `update_asset_id="c8cc6f78-40e4-4527-a54b-63f84caf9e0c"` so the existing app and link are updated rather than duplicated.
7. Verify the deployed app in a fresh browser context, then persist the source changes with `pplx project files submit`.

The Project checkout is managed through `pplx project files sync` and `submit`. Do not use mutating Git commands inside that checkout. Do not commit active databases, build outputs, credentials, or temporary test data to Project files.

## Proposed extension backlog

- **Verified snapshot import/export:** Add a validated, provenance-preserving import format so legitimate externally obtained observations can support growth calculation when direct SteamDB collection is blocked. Reject malformed data and distinguish imported observations from direct source reads.
- **Broader October cohort:** Add additional individually verified October releases/demos, with a visible coverage boundary and app-specific release-date caveats.
- **Durable watchlists:** Replace session-only selections with deliberate backend persistence. Define the user/access model before introducing shared state.
- **Durable metric history:** Export and restore genuine observations independently of preview-server lifetime. Add a metric-history chart only after real timestamped history exists.
- **Scouting controls:** Optional quality and sample-size filters, trend confidence, and clearer measured-versus-proxy views. Do not claim an evidence-backed breakout prediction without supporting validation.
- **Operational hosting:** If requested, choose durable backend/database hosting before promising continuous collection. A permanent static URL by itself does not make the current Express/SQLite backend durable.
- **Automated collection or alerts:** Configure only after the user authorizes a specific schedule, source access method, and alert destination. Project creation does not establish a background collector.

## Baseline verification

The initial build passed TypeScript checks and production compilation. Desktop and 375px mobile browser checks covered all eight records, genre/player filters, search, release/demo tabs, watchlist, per-column sorting, missing-value ordering, detail/source dialogs, two- and three-game comparison, methodology, CSV export, and horizontal table containment.

The parser was checked against retrieved Moon Sweepers markup, including the exact U.S. Dollar row. Growth formulas were verified in a separate synthetic test database; those synthetic observations were not added to production snapshots. Direct refresh returned HTTP 403, retained all eight real snapshots, and surfaced the source limitation.

The deployed app was rechecked in a fresh browser context after deployment, with the feed, filters, and detail dialog working and no page errors observed. The final feature card includes a dark score panel for contrast; the mobile table has a positioned scroll container so hidden labels do not widen the document.

See `app/QA.md` for the acceptance checklist. Re-run it after meaningful changes rather than treating this baseline as a permanent guarantee.
