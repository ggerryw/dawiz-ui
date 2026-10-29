import rosters from "./rosters.json" with { type: "json" };
import { STATS, WEB, etDate, getJson, seasonId } from "../lib/nhl.mjs";
import { SEASON_GAMES, cents, payPlaces, roundMoney } from "./standings.mjs";

// The Money: what each owner has won so far. Everyone puts in ENTRY; the pots are paid by place in the owner
// standings (active players' points, bench never counts):
//   Half-Way Point  $25 / $15 for 1st / 2nd on HALFWAY (the day league games played reach half the season's total)
//   Regular Season  $100 / $60 / $30 / $10 for 1st to 4th at the end of the regular season
//   Round Money     per draft round, $3.00 / $2.26 / $1.50 / $0.74 (see roundMoney in standings.mjs)
//   Playoff Money   $60 / $42 / $18, a separate playoff pool, not built yet (always blank here)
// Until a date is reached the amounts are provisional: what it would pay if it ended today.
const ENTRY = 40;
const HALF_PAY = [25, 15];
const SEASON_PAY = [100, 60, 30, 10];
// 2026-27: 1344 games, half (672) reached on Jan 3. Re-check every season (the schedule script is in the notes).
const HALFWAY = "2027-01-03";
// Halfway is computed from game dates with the CURRENT rosters, so it goes wrong once rosters.json changes at the
// midseason drop/pick. Before that, freeze the winners here, e.g. { Phil: 25, Matt: 15 }.
const HALFWAY_PAID = null;
// TODO (owner to confirm): tied owners currently split the places they cover, like Round Money. It may instead be
// decided by the higher points per game.

const totals = (exp) => getJson(`${STATS}?isAggregate=true&limit=-1&cayenneExp=${encodeURIComponent(exp)}`);

// Owners ranked by active players' points (best first), from one set of player totals.
const ownerPoints = (rows) => {
  const tp = new Map(rows.map((p) => [p.playerId, p.points]));
  return rosters
    .map(({ owner, players }) => ({ owner, tp: players.reduce((n, p) => n + (tp.get(p.id) ?? 0), 0) }))
    .filter((o) => o.tp > 0)
    .sort((x, y) => y.tp - x.tp);
};
const pay = (ranked, amounts) => payPlaces(ranked, amounts, (o) => o.tp, (o) => o.owner);

export default async () => {
  const today = etDate();
  const season = seasonId();
  const halfDone = today > HALFWAY;
  const [seasonRows, halfRows, nhlStandings] = await Promise.all([
    totals(`seasonId=${season} and gameTypeId=2`),
    halfDone && !HALFWAY_PAID ? totals(`seasonId=${season} and gameDate<="${HALFWAY}" and gameTypeId=2`) : null,
    getJson(`${WEB}/standings/${today}`).catch(() => null),
  ]);
  const teams = nhlStandings?.standings ?? [];
  const seasonDone = teams.length > 0 && teams.every((t) => t.gamesPlayed >= SEASON_GAMES);

  const ranked = ownerPoints(seasonRows.data);
  const half = HALFWAY_PAID ? new Map(Object.entries(HALFWAY_PAID)) : pay(halfRows ? ownerPoints(halfRows.data) : ranked, HALF_PAY);
  const reg = pay(ranked, SEASON_PAY);

  const tpById = new Map(seasonRows.data.map((p) => [p.playerId, p.points]));
  const rmOwners = rosters.map(({ owner, players }) => ({ owner, players: players.map((p) => ({ ...p, tp: tpById.get(p.id) ?? 0 })) }));
  const rm = roundMoney(rmOwners);

  const owners = rmOwners.map(({ owner, players }) => {
    const o = {
      owner,
      tp: players.reduce((n, p) => n + p.tp, 0),
      half: half.get(owner) ?? 0,
      reg: reg.get(owner) ?? 0,
      rm: cents(players.reduce((n, p) => n + (rm.get(p.id) ?? 0), 0)),
      playoff: 0,
    };
    o.total = cents(o.half + o.reg + o.rm + o.playoff);
    o.net = cents(o.total - ENTRY);
    return o;
  });
  owners.sort((x, y) => y.total - x.total || y.tp - x.tp || x.owner.localeCompare(y.owner));

  return new Response(
    JSON.stringify({ asOf: today, season, entry: ENTRY, halfway: { date: HALFWAY, final: halfDone }, seasonFinal: seasonDone, owners }),
    { headers: { "content-type": "application/json", "cache-control": "public, max-age=60, s-maxage=600" } }
  );
};

export const config = { path: "/api/money" };
