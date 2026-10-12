// One-time snapshot of the draft -> public/draft.json
//
// The draft is history, so it must NOT change when data/dataFeed.csv is updated after the
// midseason drop/pick. This refuses to overwrite an existing snapshot unless --force.
//
// Reads netlify/functions/rosters.json (run build-rosters.mjs first), which holds each
// owner's active players with their draft pick number and price (freebies priced by pick).
// Team is the player's team at snapshot time.
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const out = new URL("../public/draft.json", import.meta.url);
if (existsSync(out) && !process.argv.includes("--force")) {
  console.error("public/draft.json already exists. Pass --force to overwrite the draft record.");
  process.exit(1);
}

const rosters = JSON.parse(readFileSync(new URL("../netlify/functions/rosters.json", import.meta.url), "utf8"));
const n = rosters.length; // owners; array order = round-1 pick order

const [y, m] = new Date().toISOString().slice(0, 7).split("-").map(Number);
const start = m >= 9 ? y : y - 1;
const bulk = await (
  await fetch(
    `https://api.nhle.com/stats/rest/en/skater/summary?limit=-1&cayenneExp=${encodeURIComponent(`seasonId=${start}${start + 1} and gameTypeId=2`)}`
  )
).json();
const team = new Map(bulk.data.map((p) => [p.playerId, p.teamAbbrevs.split(",").pop().trim()]));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const picks = [];
for (let i = 0; i < n; i++) {
  for (const p of rosters[i].players) {
    if (!team.has(p.id)) {
      const r = await fetch(`https://api-web.nhle.com/v1/player/${p.id}/landing`);
      team.set(p.id, r.ok ? (await r.json()).currentTeamAbbrev ?? null : null);
      await sleep(150);
    }
    picks.push({ pick: p.pick, round: p.round, owner: rosters[i].owner, id: p.id, name: p.name, pos: p.pos, cost: p.cost, team: team.get(p.id) });
  }
}
picks.sort((a, b) => a.pick - b.pick);

writeFileSync(out, JSON.stringify({ snapshot: new Date().toISOString().slice(0, 10), picks }));
console.log(`${picks.length} picks written; first: ${picks[0].owner} - ${picks[0].name}; last: ${picks.at(-1).owner} - ${picks.at(-1).name}`);
