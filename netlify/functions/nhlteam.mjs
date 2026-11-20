import bible from "../lib/bible.json" with { type: "json" };
import { WEB, etDate, gameLines, getJson, onlyIds, seasonId, skaterStats } from "../lib/nhl.mjs";

// One NHL team's current skaters (/api/nhlteam?team=EDM) with season totals, last night's line, bible position and
// price, and the team's game today. The NHL team page merges in owners from /api/standings. Goalies are left out
// (skaters only, like the pool).
export default async (req) => {
  const team = new URL(req.url).searchParams.get("team")?.toUpperCase() ?? "";
  if (!/^[A-Z]{3}$/.test(team)) return new Response("team must be a 3-letter code", { status: 400 });
  const today = etDate();

  // The roster first, so the stats queries ask only for this team's skaters (1 page each, not the whole league).
  const [roster, schedule] = await Promise.all([getJson(`${WEB}/roster/${team}/current`), getJson(`${WEB}/schedule/${today}`)]);
  const ids = onlyIds([...roster.forwards, ...roster.defensemen].map((p) => p.id));
  const [totals, overnight] = await Promise.all([
    skaterStats(`cayenneExp=${encodeURIComponent(`seasonId=${seasonId()} and gameTypeId=2${ids}`)}`),
    gameLines(etDate(-1), ids),
  ]);
  const byId = new Map(totals.data.map((p) => [p.playerId, p]));
  const lastNight = new Map(overnight.data.map((p) => [p.playerId, p]));
  const g = (schedule.gameWeek.find((w) => w.date === today)?.games ?? [])
    .find((x) => (!x.gameScheduleState || x.gameScheduleState === "OK") && (x.homeTeam.abbrev === team || x.awayTeam.abbrev === team));
  const game = g && { start: g.startTimeUTC, home: g.homeTeam.abbrev === team, opp: g.homeTeam.abbrev === team ? g.awayTeam.abbrev : g.homeTeam.abbrev };

  const players = [...roster.forwards, ...roster.defensemen].map((p) => {
    const s = byId.get(p.id);
    const o = lastNight.get(p.id);
    return {
      id: p.id,
      name: `${p.firstName.default} ${p.lastName.default}`,
      pos: bible[p.id]?.pos ?? p.positionCode, // bible is the source of truth
      cost: bible[p.id]?.cost ?? null,
      team,
      gp: s?.gamesPlayed ?? 0,
      g: s?.goals ?? 0,
      a: s?.assists ?? 0,
      tp: s?.points ?? 0,
      ogp: o?.gamesPlayed ?? 0,
      otp: o?.points ?? 0,
    };
  });

  return new Response(JSON.stringify({ team, asOf: today, game, players }), {
    headers: {
      "content-type": "application/json",
      "cache-control": "public, max-age=60, s-maxage=120",
    },
  });
};

export const config = { path: "/api/nhlteam" };
