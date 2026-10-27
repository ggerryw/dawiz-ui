import rosters from "./rosters.json" with { type: "json" };
import { STATS, etDate, getJson, seasonId } from "../lib/nhl.mjs";
import bible from "../lib/bible.json" with { type: "json" };

// Drop/pick: a player priced above this in the bible can't be picked.
const MAX_COST = 2.5;
const TOP = 200;

// Drafted = on an owner's active roster. Bench spots don't count: those players stay on this list, with the owners
// who have them on their bench shown next to them.
const taken = new Set(rosters.flatMap((r) => r.players.map((p) => p.id)));
const benched = new Map();
for (const r of rosters) for (const p of r.bench ?? []) benched.set(p.id, [...(benched.get(p.id) ?? []), r.owner]);

export default async () => {
  const totals = await getJson(`${STATS}?limit=-1&cayenneExp=${encodeURIComponent(`seasonId=${seasonId()} and gameTypeId=2`)}`);

  const players = totals.data
    .filter((p) => !taken.has(p.playerId) && p.points > 0)
    .sort((x, y) => y.points - x.points || y.goals - x.goals || x.skaterFullName.localeCompare(y.skaterFullName))
    .slice(0, TOP)
    .map((p) => {
      const cost = bible[p.playerId]?.cost ?? null;
      return {
        id: p.playerId,
        name: p.skaterFullName,
        pos: bible[p.playerId]?.pos ?? p.positionCode, // bible is the source of truth
        team: p.teamAbbrevs.split(",").pop().trim(),
        gp: p.gamesPlayed,
        g: p.goals,
        a: p.assists,
        tp: p.points,
        cost,
        eligible: cost == null || cost <= MAX_COST,
        bench: (benched.get(p.playerId) ?? []).sort((x, y) => x.localeCompare(y)),
      };
    });

  return new Response(JSON.stringify({ asOf: etDate(), maxCost: MAX_COST, players }), {
    headers: {
      "content-type": "application/json",
      "cache-control": "public, max-age=60, s-maxage=120",
    },
  });
};

export const config = { path: "/api/undrafted" };
