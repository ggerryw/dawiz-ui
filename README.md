# DaWiz

Standings page for a 12-team NHL pool. One NHL point = one pool point. Skaters only, no goalies, no other scoring.

Each owner has 16 active players (one per draft round) and 8 bench players. Bench players are shown but never count toward totals.

## How it works

- `public/` is the frontend: `index.html` (standings), `overnight.html` (everyone who scored last night, with their pool owner) and `draft.html` (recap of the draft, read from the static `draft.json`), sharing `style.css` and `common.js`. No framework or build step.
- `netlify/functions/standings.mjs` and `overnight.mjs` are Netlify functions (shared helpers in `netlify/lib/nhl.mjs`). On each page load they pull stats, last night's games and today's schedule from the public NHL API and return JSON; `standings` totals each owner's active players, `overnight` lists last night's scorers and who owns them. (The NHL API can't be called straight from a browser, which is why the function exists.)
- `data/` holds the two spreadsheets you edit by hand. `data/teamFeed.csv` is the source of truth for who owns whom. `data/bibleFeed.csv` lists every player with their draft price and position, and is the source of truth for both. A drafted player listed at $0.00 is a "freebie" priced by draft position: (owners × 16 + 1 − pick) / 100.
- `scripts/build-bible.mjs` turns the bible into `netlify/lib/bible.json`; `scripts/build-rosters.mjs` turns `data/teamFeed.csv` into `netlify/functions/rosters.json`, using bible positions.
- `server.mjs` is a local stand-in for Netlify, for testing only.

## When the feeds change

The two files in `data/` only change in two situations. Everything else (stats, schedule, last night's scorers) comes from the NHL automatically.

### 1. Midseason drop/pick (some owners' teams change)

Only `data/teamFeed.csv` changes. The bible stays the same unless players were added to it.

1. Edit `data/teamFeed.csv`.
2. Rebuild the rosters (**not** the draft, which must stay a record of the original draft):
   ```bash
   node scripts/build-rosters.mjs
   ```
3. Check it locally with `node server.mjs`.
4. Commit, push and publish (see Deploy).

### 2. New year (new bible, new draft, new teams)

1. Replace `data/bibleFeed.csv` and `data/teamFeed.csv` with the new versions.
2. Rebuild everything. The draft step needs `--force` because it normally refuses to overwrite the old draft, and a new season is the one time you want that:
   ```bash
   node scripts/build-bible.mjs
   node scripts/build-rosters.mjs
   node scripts/build-draft.mjs --force
   ```
3. Change the edition in the Standings heading: in `public/index.html`, `DaWiz L` becomes `DaWiz LI` (it's the only place the numeral appears).
4. Check it locally with `node server.mjs`. Early in a season, standings show zeros and Overnight is empty until games are played. Make sure the owners, the draft order, positions and prices look right.
5. Commit, push and publish (see Deploy).

The season is worked out from today's date (it switches on September 1), and the snake order and freebie pricing follow the number of owners and rounds in `teamFeed.csv`, so nothing else needs editing.

`rosters.json`, `bible.json` and `draft.json` must be committed, since Netlify doesn't run the build scripts.

### Feed layouts

`teamFeed.csv`:
- Row 2: owner names, one per column, in round-1 pick order.
- Rows labelled `1`–`16`: the active player in that draft round for each owner.
- Rows labelled `B1`–`B8`: bench players, in display order.
- IDs are NHL player IDs without the leading `84` (sheet `78402` = API `8478402`).

`bibleFeed.csv`: header `NHL ID,Full Name,Cost,Pos`, one row per player, IDs without the leading `84`.

Player names come from the NHL API (the build script looks them up). Positions and prices come from the bible.

## Draft snapshot

`public/draft.json` is generated with `node scripts/build-draft.mjs` and is deliberately not rebuilt when rosters change (such as after the drop/pick), so the draft page stays a true record of the draft. The script refuses to overwrite it unless run with `--force`, which you only use at the start of a new season.

## Run locally

Requires Node 18+. No install step.

```bash
node server.mjs
```

Then open http://localhost:8888. Restart the server after changing the function or `rosters.json`; changes to `index.html` just need a refresh.

## Deploy

Hosted on Netlify's free tier. `netlify.toml` sets `public/` as the site and `netlify/functions/` as the functions folder, so importing the repo into Netlify needs no extra settings.

Auto-publish is turned off. Pushing to GitHub does not change the live site; publish from the site's Deploys tab in Netlify when you're ready. Production deploys cost 15 of the 300 free monthly credits, so release in batches rather than per change.

## Data sources

- Stats and schedule: `api.nhle.com` and `api-web.nhle.com` (public, no key)
- Player photos and team logos: `assets.nhle.com`
- Player links: `nhl.com/player/{id}`
