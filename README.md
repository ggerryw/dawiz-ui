# DaWiz L

Standings page for a 12-team NHL pool. One NHL point = one pool point. Skaters only, no goalies, no other scoring.

Each owner has 16 active players (one per draft round) and 8 bench players. Bench players are shown but never count toward totals.

## How it works

- `public/index.html` is the whole frontend: one file, no framework or build step.
- `netlify/functions/standings.mjs` is a Netlify function. On each page load it pulls season stats, last night's games and today's schedule from the public NHL API, totals each owner's active players, and returns JSON. (The NHL API can't be called straight from a browser, which is why the function exists.)
- `dataFeed.csv` is the source of truth for who owns whom.
- `scripts/build-rosters.mjs` turns that CSV into `netlify/functions/rosters.json`.
- `server.mjs` is a local stand-in for Netlify, for testing only.

## Updating rosters (e.g. after the drop/pick)

1. Edit `dataFeed.csv`.
2. Rebuild the roster file:
   ```bash
   node scripts/build-rosters.mjs
   ```
3. Commit and push. Netlify redeploys on every push to `main`.
   ```bash
   git add -A && git commit -m "Update rosters" && git push
   ```

`rosters.json` must be committed, since Netlify doesn't run the build script.

### CSV layout

- Row 2: owner names, one per column.
- Rows labelled `1`–`16`: the active player in that draft round for each owner.
- Rows labelled `B1`–`B8`: bench players, in display order.
- IDs are NHL player IDs without the leading `84` (sheet `78402` = API `8478402`).

Names and positions aren't in the CSV; the build script looks them up from the NHL API.

## Run locally

Requires Node 18+. No install step.

```bash
node server.mjs
```

Then open http://localhost:8888. Restart the server after changing the function or `rosters.json`; changes to `index.html` just need a refresh.

## Deploy

Hosted on Netlify's free tier. `netlify.toml` sets `public/` as the site and `netlify/functions/` as the functions folder, so importing the repo into Netlify needs no extra settings.

## Data sources

- Stats and schedule: `api.nhle.com` and `api-web.nhle.com` (public, no key)
- Player photos and team logos: `assets.nhle.com`
- Player links: `nhl.com/player/{id}`
