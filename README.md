# UnderRadar · Steam Hidden-Gem Tracker

UnderRadar is a completed, deployed Steam discovery tracker. This Project is the durable home for maintaining its existing app, preserving source-backed data, and extending its discovery tools.

## Project and existing app

- **Project:** https://www.perplexity.ai/projects/underradar-steam-hidden-gem-tr-Cd0CdpCRSwCiTJpkxuCNvg
- **Project UUID:** `09dd0276-9091-4b00-a24c-9a64c6e08dbe`
- **Existing app:** https://www.perplexity.ai/computer/a/underradar-steam-hidden-gem-tr-yMxveEDkRSelS2P4TK.eDA
- **App asset UUID:** `c8cc6f78-40e4-4527-a54b-63f84caf9e0c`
- **Origin session context UUID:** `e8d68017-acea-424b-9c5b-a186bf4c892e`
- **Preserved source:** `app/`
- **Maintenance and extension brief:** [MAINTENANCE.md](MAINTENANCE.md)
- **Private GitHub repository:** https://github.com/cmdgns/underradar-steam-hidden-gem-tracker

## Local development

Use a current Node.js LTS version with npm. From the repository root:

```sh
cd app
npm ci
npm run dev
```

The Express/Vite development server listens on port 5000 by default. For a production build and server:

```sh
npm run check
npm run build
npm run start
```

The backend initializes a local SQLite database from the preserved source snapshots. Database files and environment files are ignored by Git. Running the app locally does not remove SteamDB's source-access restrictions.

## Continuous integration

[GitHub Actions](https://github.com/cmdgns/underradar-steam-hidden-gem-tracker/actions) runs the **TypeScript and build** workflow on pushes to any branch, pull requests, and manual dispatch. It uses Node.js 22 on Ubuntu and runs `npm ci`, `npm run check`, and `npm run build` from `app/`.

The workflow uses the committed lockfile, caches npm downloads, has read-only repository permissions, and pins its actions to specific commits. It does not deploy the app, run a collector, require custom secrets, or change branch-protection rules.

## Current baseline

The tracker has eight curated October 2026 releases and demos, sortable player/review/price/velocity metrics, adjacent genre and current-player filters, search, a session watchlist, up-to-three-game comparison, source detail dialogs, and filtered CSV export. It is a curated cohort, not a complete October release catalog.

The cohort includes Melvor Idle 2 Demo, just volleyball Demo, Moon Sweepers, Scam With Your Friends, Loftia Demo, Worst Class Ever Demo, GONE Fishing, and We Were Here Tomorrow. The exact app IDs, source URLs, initial metrics, regional prices, metadata caveats, and artwork references are preserved in `app/server/seed.ts`.

## Critical data limitation

Direct refresh from the preview server returned SteamDB HTTP 403 during testing. The working app preserves timestamped research snapshots when refresh is denied; it must not be described as continuously live.

Measured daily player velocity and follower growth remain unavailable until sufficient genuine same-app observations exist. Until then, the UI explicitly labels its fallback as an activity proxy, not growth. Public SteamDB chart pages also limit historical follower data behind sign-in, as shown on [Moon Sweepers charts](https://steamdb.info/app/5335510/charts/).

## Persistence boundary

This repository preserves editable source, the dependency lockfile, seed snapshots, and documentation. Build outputs, `node_modules`, active SQLite files, logs, temporary exports, browser sessions, and synthetic test databases are intentionally excluded.

The deployed backend remains a running preview service and is not made permanently hosted merely by creating this Project. Watchlist selections are currently held in page memory, not durable Project storage.
