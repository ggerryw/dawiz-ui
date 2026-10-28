import rosters from "./rosters.json" with { type: "json" };
import { STATS, etDate, getJson, seasonId } from "../lib/nhl.mjs";

// Who's Hot: points each owner's active players scored over the last 14 complete ET days, and what the same games
// would have produced at the owner's season pace. Bench players don't count, same as the standings.
const DAYS = 14;

const totals = (exp) => getJson(`${STATS}?isAggregate=true&limit=-1&cayenneExp=${encodeURIComponent(exp)}`);

export default async () => {
  const from = etDate(-DAYS);
  const to = etDate(-1);
  const [season, recent] = await Promise.all([
    totals(`seasonId=${seasonId()} and gameTypeId=2`),
    totals(`gameDate>="${from}" and gameDate<="${to}" and gameTypeId=2`),
  ]);
  const seasonById = new Map(season.data.map((p) => [p.playerId, p]));
  const recentById = new Map(recent.data.map((p) => [p.playerId, p]));
  const sum = (byId, players, k) => players.reduce((n, p) => n + (byId.get(p.id)?.[k] ?? 0), 0);

  const owners = rosters.map(({ owner, players }) => {
    const gp = sum(recentById, players, "gamesPlayed");
    const seasonGp = sum(seasonById, players, "gamesPlayed");
    const seasonPpg = seasonGp ? sum(seasonById, players, "points") / seasonGp : 0;
    return { owner, gp, tp: sum(recentById, players, "points"), usual: Math.round(seasonPpg * gp) };
  });
  owners.sort((x, y) => y.tp - x.tp || y.tp - y.usual - (x.tp - x.usual) || x.owner.localeCompare(y.owner));

  return new Response(JSON.stringify({ from, to, days: DAYS, owners }), {
    headers: {
      "content-type": "application/json",
      "cache-control": "public, max-age=60, s-maxage=600",
    },
  });
};

export const config = { path: "/api/hot" };
