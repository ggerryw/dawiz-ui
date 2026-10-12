# DaWiz L

NHL pool standings page. See README.md for the overview and file layout.

## Rules to keep

- Scoring: 1 NHL point = 1 pool point. Skaters only. Bench players are shown but never count toward totals, GP, PPG or the "tonight" count.
- Ordering: active players are in feed order (draft round 1..16) and bench is in feed order (B1..B8). Do not sort players by points. Only the owners in the standings sort by points.
- CSV IDs drop the leading `84` (sheet `78402` = NHL API `8478402`). `scripts/build-rosters.mjs` adds it back.
- All NHL API calls go through the Netlify functions (`netlify/functions/`), using shared helpers in `netlify/lib/nhl.mjs`. Browsers can't call that API directly.
- Overnight page: lists everyone with at least one point on the previous ET day. An owner chip means an active roster spot. Bench players are deliberately ignored on this page (a bench-only scorer shows as unowned). Owned scorers' points must add up to the Standings "last night" TP column.

## Workflow gotchas

- After any change to `dataFeed.csv`, run `node scripts/build-rosters.mjs` and commit `netlify/functions/rosters.json` with it. Netlify does not run the script.
- The local server (`node server.mjs`) caches the function and `rosters.json`: restart it after changing either. Edits under `public/` only need a refresh.
- The NHL API rate-limits bursts. Don't fire many parallel requests; the build script retries with backoff for this reason.
- Do not push, deploy or change the live site without asking first. The repo is public.

## Style

- Keep it plain: static HTML pages (`index.html`, `overnight.html`) sharing `style.css` and `common.js`. No framework, no build step.
- UI is deliberately large with generous spacing for readability. Don't shrink text or tap targets without asking.
- It must fit phone widths (360px and up) with no sideways scrolling. On phones the PPG column is hidden to make room.
- No auto-refresh of any kind (timers or refresh-on-focus burn free-tier credits). Each page fetches its data once on load; visitors reload to get new data.
- Respect light and dark mode via `prefers-color-scheme`.
