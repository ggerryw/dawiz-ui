import rosters from "./rosters.json" with { type: "json" };
import { STATS, getJson, seasonId } from "../lib/nhl.mjs";

// Injuries: every pool player (active roster or bench) on the current NHL injury list, with the owners who have him.
// The NHL's API has no injury list, so this reads ESPN's public NHL injuries feed (the one behind espn.com's injury
// page; unofficial, no key needed). ESPN has its own player ids, so players are matched by name and NHL team.
const ESPN = "https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/injuries";
// ESPN team codes that differ from the NHL's
const TEAM = { LA: "LAK", NJ: "NJD", SJ: "SJS", TB: "TBL", UTAH: "UTA" };
// Most serious first: long-term IR, IR, IR (non-roster), out, day-to-day
const ORDER = ["IR-LT", "IR", "IR-NR", "OUT", "Day-To-Day"];

// "Tim Stützle" and "Tim Stutzle", "J.T. Miller" and "JT Miller" compare equal
const key = (name) => name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[.']/g, "").replace(/-/g, " ").trim();

export default async () => {
  const [feed, totals] = await Promise.all([
    getJson(ESPN),
    getJson(`${STATS}?limit=-1&cayenneExp=${encodeURIComponent(`seasonId=${seasonId()} and gameTypeId=2`)}`),
  ]);
  const teamById = new Map(totals.data.map((p) => [p.playerId, p.teamAbbrevs.split(",").pop().trim()]));

  // name -> injury entries (a list, since two NHL players can share a name)
  const injured = new Map();
  for (const t of feed.injuries ?? []) {
    for (const i of t.injuries ?? []) {
      const k = key(i.athlete.displayName);
      if (!injured.has(k)) injured.set(k, []);
      injured.get(k).push(i);
    }
  }

  // every pool player once, with the owners who have him active and on their bench
  const pool = new Map();
  for (const { owner, players, bench = [] } of rosters) {
    for (const [list, spot] of [[players, "active"], [bench, "bench"]]) {
      for (const p of list) {
        if (!pool.has(p.id)) pool.set(p.id, { id: p.id, name: p.name, pos: p.pos, owner: null, owners: [] });
        const e = pool.get(p.id);
        if (spot === "active") e.owner = owner;
        else e.owners.push(owner);
      }
    }
  }

  const players = [];
  for (const p of pool.values()) {
    const team = teamById.get(p.id);
    const i = (injured.get(key(p.name)) ?? []).find((x) => {
      const t = x.athlete.team?.abbreviation;
      return !team || !t || (TEAM[t] ?? t) === team;
    });
    if (!i) continue;
    const t = i.athlete.team?.abbreviation;
    players.push({
      ...p,
      owners: p.owners.sort(),
      team: team ?? (t ? TEAM[t] ?? t : null),
      status: i.details?.fantasyStatus?.abbreviation ?? i.status, // IR, IR-LT, IR-NR, OUT, Day-To-Day
      type: i.details?.type ?? null, // "Lower Body"
      back: i.details?.returnDate ?? null, // ESPN's estimate, YYYY-MM-DD
      note: i.shortComment ?? null,
      date: i.date, // when ESPN last updated it
    });
  }
  const rank = (s) => (ORDER.includes(s) ? ORDER.indexOf(s) : ORDER.length);
  players.sort((x, y) => rank(x.status) - rank(y.status) || (x.back ?? "9").localeCompare(y.back ?? "9") || x.name.localeCompare(y.name));

  return new Response(JSON.stringify({ updated: feed.timestamp ?? null, owners: rosters.map((r) => r.owner).sort(), players }), {
    headers: {
      "content-type": "application/json",
      "cache-control": "public, max-age=60, s-maxage=600",
    },
  });
};

export const config = { path: "/api/injuries" };
