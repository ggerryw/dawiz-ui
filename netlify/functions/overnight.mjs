import rosters from "./rosters.json" with { type: "json" };
import { etDate, gameLines } from "../lib/nhl.mjs";
import bible from "../lib/bible.json" with { type: "json" };

// playerId -> owner names, for active roster spots only (bench is ignored here).
const active = new Map();
for (const r of rosters) for (const p of r.players) active.set(p.id, [...(active.get(p.id) ?? []), r.owner]);

export default async () => {
  const date = etDate(-1);
  const { data } = await gameLines(date);

  const scorers = data
    .filter((p) => p.points > 0)
    .map((p) => ({
      id: p.playerId,
      name: p.skaterFullName,
      pos: bible[p.playerId] ?? p.positionCode, // bible is the source of truth
      team: p.teamAbbrev,
      opp: p.opponentTeamAbbrev,
      home: p.homeRoad === "H",
      g: p.goals,
      a: p.assists,
      tp: p.points,
      owners: active.get(p.playerId) ?? [],
    }))
    .sort((x, y) => y.tp - x.tp || y.g - x.g || x.name.localeCompare(y.name));

  return new Response(JSON.stringify({ date, played: data.length, scorers }), {
    headers: {
      "content-type": "application/json",
      "cache-control": "public, max-age=60, s-maxage=120",
    },
  });
};

export const config = { path: "/api/overnight" };
