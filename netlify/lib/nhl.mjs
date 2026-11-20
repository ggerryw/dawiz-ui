// Shared NHL API helpers for the Netlify functions.
export const STATS = "https://api.nhle.com/stats/rest/en/skater/summary";
export const WEB = "https://api-web.nhle.com/v1";

// Dates in NHL "hockey time" (Eastern).
export const etDate = (offsetDays = 0) => {
  const d = new Date(Date.now() + offsetDays * 864e5);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(d);
};

// NHL season ID for an ET date ("2026-10-16" -> "20262027"); seasons switch on September 1.
export const seasonId = (date = etDate()) => {
  const [y, m] = date.split("-").map(Number);
  const start = m >= 9 ? y : y - 1;
  return `${start}${start + 1}`;
};

// Retries a few times on 429 (the API rate-limits bursts, and paged stats queries make several calls in a row).
export const getJson = async (url) => {
  for (let attempt = 1; ; attempt++) {
    const r = await fetch(url);
    if (r.ok) return r.json();
    if (r.status !== 429 || attempt === 4) throw new Error(`${r.status} ${url}`);
    await new Promise((done) => setTimeout(done, 400 * attempt));
  }
};

// Every row of a skater stats query. The stats API returns at most 100 rows per request (it used to honour
// limit=-1 but quietly stopped in Nov 2026), so page through with `start`, sorted by player id so pages don't
// overlap. One request at a time: the API rate-limits bursts. `query` is the rest of the URL, e.g.
// `cayenneExp=...` or `isAggregate=true&cayenneExp=...`. Returns { data, total } like a single call did.
const PAGE = 100;
const BY_ID = encodeURIComponent(JSON.stringify([{ property: "playerId", direction: "ASC" }]));
export const skaterStats = async (query) => {
  const data = [];
  for (let start = 0; ; start += PAGE) {
    const page = await getJson(`${STATS}?limit=${PAGE}&start=${start}&sort=${BY_ID}&${query}`);
    data.push(...page.data);
    if (page.data.length < PAGE || data.length >= page.total) return { data, total: page.total };
  }
};

// Narrows a stats query to these players: " and playerId in (...)". Asking only for the players a page needs is
// much faster than paging through the whole league (the pool's ~250 players are 3 pages instead of 8).
export const onlyIds = (ids) => ` and playerId in (${[...new Set(ids)].join(",") || 0})`;

// Every skater game line on one date (regular season), one row per player. `filter` narrows it, e.g. onlyIds(...).
export const gameLines = (date, filter = "") =>
  skaterStats(`isGame=true&cayenneExp=${encodeURIComponent(`gameDate>="${date}" and gameDate<="${date}" and gameTypeId=2${filter}`)}`);
