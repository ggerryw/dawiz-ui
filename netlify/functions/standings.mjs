import rosters from "./rosters.json" with { type: "json" };
import { STATS, WEB, etDate, getJson, gameLines } from "../lib/nhl.mjs";

const seasonId = () => {
  const [y, m] = etDate().split("-").map(Number);
  const start = m >= 9 ? y : y - 1;
  return `${start}${start + 1}`;
};

const teamCache = new Map(); // playerId -> current team, for players with no games yet

async function currentTeam(id) {
  if (!teamCache.has(id)) {
    try {
      teamCache.set(id, (await getJson(`${WEB}/player/${id}/landing`)).currentTeamAbbrev ?? null);
    } catch {
      return null;
    }
  }
  return teamCache.get(id);
}

// How many benches each player is on (the same player can sit on several owners' benches).
const benchCounts = new Map();
for (const r of rosters) for (const p of r.bench ?? []) benchCounts.set(p.id, (benchCounts.get(p.id) ?? 0) + 1);

export default async () => {
  const today = etDate();
  const yesterday = etDate(-1);
  const season = seasonId();

  const [totals, overnight, schedule] = await Promise.all([
    getJson(`${STATS}?limit=-1&cayenneExp=${encodeURIComponent(`seasonId=${season} and gameTypeId=2`)}`),
    gameLines(yesterday),
    getJson(`${WEB}/schedule/${today}`),
  ]);

  const byId = new Map(totals.data.map((p) => [p.playerId, p]));
  const lastNight = new Map(overnight.data.map((p) => [p.playerId, p]));
  // team -> that team's game today: opponent, home/away and UTC start time.
  // Postponed games are ignored. Finished games still count; we just show today's games.
  const todaysGames = new Map();
  for (const g of schedule.gameWeek.find((w) => w.date === today)?.games ?? []) {
    if (g.gameScheduleState && g.gameScheduleState !== "OK") continue;
    todaysGames.set(g.awayTeam.abbrev, { start: g.startTimeUTC, opp: g.homeTeam.abbrev, home: false });
    todaysGames.set(g.homeTeam.abbrev, { start: g.startTimeUTC, opp: g.awayTeam.abbrev, home: true });
  }

  const withStats = (list) =>
    Promise.all(
      list.map(async (pl) => {
        const s = byId.get(pl.id);
        const o = lastNight.get(pl.id);
        const team = s ? s.teamAbbrevs.split(",").pop().trim() : await currentTeam(pl.id);
        const game = team ? todaysGames.get(team) : undefined;
        return {
          ...pl,
          team,
          gp: s?.gamesPlayed ?? 0,
          g: s?.goals ?? 0,
          a: s?.assists ?? 0,
          tp: s?.points ?? 0,
          ogp: o?.gamesPlayed ?? 0,
          otp: o?.points ?? 0,
          tonight: !!game, // has a game today
          ...(game && { game }),
        };
      })
    );

  // Bench players are shown but never counted toward an owner's totals.
  const owners = await Promise.all(
    rosters.map(async ({ owner, players, bench = [] }) => {
      const [detailed, benchDetailed] = await Promise.all([withStats(players), withStats(bench)]);
      const sum = (k) => detailed.reduce((n, p) => n + p[k], 0);
      const gp = sum("gp");
      const tp = sum("tp");
      return {
        owner,
        gp,
        g: sum("g"),
        a: sum("a"),
        tp,
        ppg: gp ? Math.round((tp / gp) * 100) / 100 : 0,
        ogp: sum("ogp"),
        otp: sum("otp"),
        tonight: detailed.filter((p) => p.tonight).length,
        players: detailed, // feed order (draft round 1..n)
        bench: benchDetailed.map((p) => ({ ...p, timesPicked: benchCounts.get(p.id) })), // feed order (B1..Bn)
      };
    })
  );

  owners.sort((x, y) => y.tp - x.tp || y.ppg - x.ppg || x.owner.localeCompare(y.owner));

  return new Response(JSON.stringify({ asOf: today, overnightDate: yesterday, season, owners }), {
    headers: {
      "content-type": "application/json",
      "cache-control": "public, max-age=60, s-maxage=120",
    },
  });
};

export const config = { path: "/api/standings" };
