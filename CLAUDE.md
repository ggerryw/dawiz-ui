# DaWiz

NHL pool standings page. See README.md for the overview and file layout.

## Rules to keep

- Scoring: 1 NHL point = 1 pool point. Skaters only. Bench players are shown but never count toward totals, GP, PPG or the "tonight" count.
- Game pill: a player whose team has a game today gets a grey pill on the name line (grey on purpose: green is reserved for points scored, the Last Night pill) ("7 PM vs OTT" or "7:30 PM @ MIN"). It shows every game today whether or not it has been played; there are no live/final variants. The time is rendered in the viewer's time zone in the browser (`gamePill` in `common.js`); `standings.mjs` supplies opponent, home/away and UTC start from the NHL schedule and ignores postponed games. "Playing Tonight" counts every player with a game today.
- Ordering: active players are in feed order (draft round 1..16) and bench is in feed order (B1..B8). Do not sort players by points. Only the owners in the standings sort by points.
- Positions and prices: `data/bibleFeed.csv` is the source of truth for player positions and draft prices. Never display the NHL API's position. A bible price of $0.00 on a drafted player is a "freebie": price = (owners x 16 + 1 - draft pick) / 100, computed in `build-rosters.mjs` (the bible stays untouched). Prices are shown for active players on Standings and on the Draft page. Bench prices are deliberately not displayed (they don't matter); bench rows show "Times Picked: N" instead (how many owners have that player on their bench, computed in `standings.mjs`). Overnight has no prices. `scripts/build-bible.mjs` turns it into `netlify/lib/bible.json`, which `build-rosters.mjs` and the Overnight function read (NHL position is only a fallback for a player missing from the bible).
- CSV IDs drop the leading `84` (sheet `78402` = NHL API `8478402`). `scripts/build-rosters.mjs` adds it back.
- All NHL API calls go through the Netlify functions (`netlify/functions/`), using shared helpers in `netlify/lib/nhl.mjs`. Browsers can't call that API directly.
- Overnight page: lists everyone with at least one point on the previous ET day. An owner chip means an active roster spot. Bench players are deliberately ignored on this page (a bench-only scorer shows as unowned). Owned scorers' points must add up to the Standings "last night" TP column.

- Draft page: `public/draft.json` is a frozen snapshot of the original draft (snake order; owner order in `rosters.json` = round-1 pick order). Do NOT regenerate it after the midseason drop/pick, because the CSV's round rows will then hold replacement players. `scripts/build-draft.mjs` refuses to overwrite without `--force`.

## Workflow gotchas

- After any change to `data/bibleFeed.csv`, run `node scripts/build-bible.mjs` then `node scripts/build-rosters.mjs`. After any change to `data/teamFeed.csv`, run `node scripts/build-rosters.mjs` and commit the generated JSON (`bible.json`, `rosters.json`) with it. Netlify does not run the script.
- The local server (`node server.mjs`) caches the function and `rosters.json`: restart it after changing either. Edits under `public/` only need a refresh.
- The NHL API rate-limits bursts. Don't fire many parallel requests; the build script retries with backoff for this reason.
- Do not push, deploy or change the live site without asking first. The repo is public.

## Style

- Keep it plain: static HTML pages (`index.html`, `overnight.html`, `draft.html`) sharing `style.css` and `common.js` (which also renders the tab bar: add new pages to `TABS` there). No framework, no build step.
- UI is deliberately large with generous spacing for readability. Don't shrink text or tap targets without asking.
- It must fit phone widths (360px and up) with no sideways scrolling. On phones the PPG column is hidden to make room, and open rosters show each player's stats on a second line under the name.
- Standings group headers ("Season", "Last night") use colspan, and CSS can't change colspan. When a column is hidden on phones (PPG), keep a separate phone version of the header (`th.s5` desktop / `th.s4` phone) or the headers drift out of line with their columns. Re-check header alignment whenever a column is added, removed or hidden.
- On phones no text may be smaller than ~14px (older users struggled with small text). Don't shrink fonts to make something fit; change the layout or hide a lower-value column instead.
- No auto-refresh of any kind (timers or refresh-on-focus burn free-tier credits). Each page fetches its data once on load; visitors reload to get new data.
- Respect light and dark mode via `prefers-color-scheme`.
