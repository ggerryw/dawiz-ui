import rosters from "./rosters.json" with { type: "json" };
import { etDate, gameLines, onlyIds, seasonId, skaterStats } from "../lib/nhl.mjs";
import bible from "../lib/bible.json" with { type: "json" };

// playerId -> owner names, for active roster spots only (bench is ignored here).
const active = new Map();
for (const r of rosters) for (const p of r.players) active.set(p.id, [...(active.get(p.id) ?? []), r.owner]);

export default async () => {
  const date = etDate(-1);
  // Only the players this page lists: everyone with a point, plus active roster players who played. Then season
  // totals for just those players (two small queries in a row beat paging through the whole league twice).
  const { data } = await gameLines(date, ` and (points>=1${onlyIds([...active.keys()]).replace(" and", " or")})`);
  const totals = await skaterStats(
    `cayenneExp=${encodeURIComponent(`seasonId=${seasonId(date)} and gameTypeId=2${onlyIds(data.map((p) => p.playerId))}`)}`
  );
  const byId = new Map(totals.data.map((p) => [p.playerId, p]));
  const season = (id) => {
    const s = byId.get(id);
    return { gp: s?.gamesPlayed ?? 0, g: s?.goals ?? 0, a: s?.assists ?? 0, tp: s?.points ?? 0 };
  };

  // Everyone with a point, plus rostered (active) players who played without scoring.
  const scorers = data
    .filter((p) => p.points > 0 || active.has(p.playerId))
    .map((p) => ({
      id: p.playerId,
      name: p.skaterFullName,
      pos: bible[p.playerId]?.pos ?? p.positionCode, // bible is the source of truth
      team: p.teamAbbrev,
      opp: p.opponentTeamAbbrev,
      home: p.homeRoad === "H",
      g: p.goals,
      a: p.assists,
      tp: p.points,
      owners: [...(active.get(p.playerId) ?? [])].sort((x, y) => x.localeCompare(y)),
      season: season(p.playerId),
    }))
    // Last-night points desc, then owner (unowned last), then NHL team, then name.
    .sort(
      (x, y) =>
        y.tp - x.tp ||
        !x.owners.length - !y.owners.length ||
        (x.owners[0] ?? "").localeCompare(y.owners[0] ?? "") ||
        x.team.localeCompare(y.team) ||
        x.name.localeCompare(y.name)
    );

  return new Response(JSON.stringify({ date, scorers }), {
    headers: {
      "content-type": "application/json",
      "cache-control": "public, max-age=60, s-maxage=120",
    },
  });
};

export const config = { path: "/api/overnight" };
