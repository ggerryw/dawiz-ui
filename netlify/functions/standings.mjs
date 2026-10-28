import rosters from "./rosters.json" with { type: "json" };
import { STATS, WEB, etDate, getJson, gameLines, seasonId } from "../lib/nhl.mjs";

const SEASON_GAMES = 82;
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

// Round money: in each draft round, the active players with at least 1 point are ranked by TP and the
// top four places pay these amounts. Tied players share the pool of the places they cover, rounded to
// the cent (e.g. two tied for 2nd each get (2.26 + 1.50) / 2 = 1.88). Returns playerId -> payout.
const ROUND_PAY = [3.0, 2.26, 1.5, 0.74];
const cents = (x) => Math.round(x * 100) / 100;

function roundMoney(owners) {
  const pay = new Map();
  const rounds = new Set(owners.flatMap((o) => o.players.map((p) => p.round)));
  for (const r of rounds) {
    const ranked = owners
      .map((o) => o.players.find((p) => p.round === r))
      .filter((p) => p && p.tp > 0)
      .sort((x, y) => y.tp - x.tp);
    for (let i = 0, place = 0; i < ranked.length && place < ROUND_PAY.length; ) {
      let j = i;
      while (j < ranked.length && ranked[j].tp === ranked[i].tp) j++;
      const each = cents(ROUND_PAY.slice(place, place + j - i).reduce((n, v) => n + v, 0) / (j - i));
      for (let k = i; k < j; k++) pay.set(ranked[k].id, cents((pay.get(ranked[k].id) ?? 0) + each));
      place += j - i;
      i = j;
    }
  }
  return pay;
}

export default async () => {
  const today = etDate();
  const yesterday = etDate(-1);
  const season = seasonId();

  const [totals, overnight, schedule, nhlStandings] = await Promise.all([
    getJson(`${STATS}?limit=-1&cayenneExp=${encodeURIComponent(`seasonId=${season} and gameTypeId=2`)}`),
    gameLines(yesterday),
    getJson(`${WEB}/schedule/${today}`),
    getJson(`${WEB}/standings/${today}`).catch(() => null), // only for games left (The Chase); not worth failing over
  ]);
  // team -> regular-season games left (82-game season)
  const teamLeft = new Map((nhlStandings?.standings ?? []).map((t) => [t.teamAbbrev.default, SEASON_GAMES - t.gamesPlayed]));

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
          left: teamLeft.get(team) ?? 0, // team's games left: an upper bound for the player (injuries, scratches)
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
        left: sum("left"),
        tonight: detailed.filter((p) => p.tonight).length,
        players: detailed, // feed order (draft round 1..n)
        bench: benchDetailed.map((p) => ({ ...p, timesPicked: benchCounts.get(p.id) })), // feed order (B1..Bn)
      };
    })
  );

  const rm = roundMoney(owners);
  for (const o of owners) {
    for (const p of o.players) p.rm = rm.get(p.id) ?? 0;
    o.rm = cents(o.players.reduce((n, p) => n + p.rm, 0));
  }

  owners.sort((x, y) => y.tp - x.tp || y.ppg - x.ppg || x.owner.localeCompare(y.owner));

  return new Response(JSON.stringify({ asOf: today, overnightDate: yesterday, season, owners }), {
    headers: {
      "content-type": "application/json",
      "cache-control": "public, max-age=60, s-maxage=120",
    },
  });
};

export const config = { path: "/api/standings" };
