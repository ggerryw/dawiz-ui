// Converts data/dataFeed.csv -> netlify/functions/rosters.json
// Feed layout: row 2 = owner names; numeric rows = active picks; B1..Bn rows = bench.
// Sheet IDs drop the leading "84" (sheet 78402 -> NHL API 8478402).
// Names/positions aren't in the feed, so they're looked up from the NHL API.
import { readFileSync, writeFileSync } from "node:fs";

// Positions and prices come from the bible (run build-bible.mjs first), not from the NHL API.
const bible = JSON.parse(readFileSync(new URL("../netlify/lib/bible.json", import.meta.url), "utf8"));

const rows = readFileSync(new URL("../data/dataFeed.csv", import.meta.url), "utf8")
  .split(/\r?\n/)
  .filter((l) => l.trim())
  .map((l) => l.split(",").map((c) => c.trim()));

const ownerNames = rows[1].slice(1).filter(Boolean);
const active = Object.fromEntries(ownerNames.map((o) => [o, []]));
const bench = Object.fromEntries(ownerNames.map((o) => [o, []]));

for (const r of rows.slice(2)) {
  const isRound = /^\d+$/.test(r[0]);
  const target = isRound ? active : /^B\d+$/i.test(r[0]) ? bench : null;
  if (!target) continue;
  // Active rows are labelled with their draft round (1, 2, ...); bench rows are B1..Bn.
  ownerNames.forEach((o, i) => r[i + 1] && target[o].push({ id: Number("84" + r[i + 1]), round: isRound ? Number(r[0]) : undefined }));
}

const ids = [...new Set([...Object.values(active), ...Object.values(bench)].flat().map((e) => e.id))];
const info = new Map();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url) {
  for (let attempt = 1; attempt <= 5; attempt++) {
    const r = await fetch(url);
    if (r.ok) return r.json();
    if (r.status === 404) return null;
    await sleep(500 * attempt); // rate-limited or transient: back off and retry
  }
  return null;
}

// 1. One bulk call covers everyone who has played this season.
const [y, m] = new Date().toISOString().slice(0, 7).split("-").map(Number);
const season = `${m >= 9 ? y : y - 1}${(m >= 9 ? y : y - 1) + 1}`;
const bulk = await getJson(
  `https://api.nhle.com/stats/rest/en/skater/summary?limit=-1&cayenneExp=${encodeURIComponent(`seasonId=${season} and gameTypeId=2`)}`
);
for (const p of bulk?.data ?? []) info.set(p.playerId, { name: p.skaterFullName, pos: p.positionCode });

// 2. Anyone missing (no games yet this season) is looked up individually.
for (const id of ids.filter((id) => !info.has(id))) {
  const p = await getJson(`https://api-web.nhle.com/v1/player/${id}/landing`);
  if (p) info.set(id, { name: `${p.firstName.default} ${p.lastName.default}`, pos: p.position });
  else console.warn(`! no NHL record for ${id}`);
  await sleep(150);
}

// Draft position (snake: column order in odd rounds, reversed in even rounds).
const nOwners = ownerNames.length;
const nRounds = Math.max(...Object.values(active).map((l) => l.length));
const pickNumber = (round, col) => (round - 1) * nOwners + (round % 2 ? col + 1 : nOwners - col);

// A bible price of $0.00 marks a "freebie": its price depends on how deep in the draft it
// was taken, (owners x rounds + 1 - pick) / 100. Only drafted players have a pick number.
const price = (id, pick) => {
  const cost = bible[id]?.cost;
  if (cost === 0 && pick) return Math.round(nOwners * nRounds + 1 - pick) / 100;
  return cost;
};

const player = ({ id, round }, col) => {
  const pick = round ? pickNumber(round, col) : undefined;
  if (!bible[id]) console.warn(`! ${info.get(id)?.name ?? id} is not in the bible; using NHL position`);
  return { id, name: info.get(id)?.name ?? `Unknown (${id})`, pos: bible[id]?.pos ?? info.get(id)?.pos ?? "?", cost: price(id, pick), ...(round && { round, pick }) };
};
const out = ownerNames.map((owner) => ({
  owner,
  players: active[owner].map((e) => player(e, ownerNames.indexOf(owner))),
  bench: bench[owner].map((e) => player(e, ownerNames.indexOf(owner))),
}));

writeFileSync(new URL("../netlify/functions/rosters.json", import.meta.url), JSON.stringify(out, null, 1));
console.log(`${out.length} owners, ${ids.length} unique players`);
