// Shared NHL API helpers for the Netlify functions.
export const STATS = "https://api.nhle.com/stats/rest/en/skater/summary";
export const WEB = "https://api-web.nhle.com/v1";

// Dates in NHL "hockey time" (Eastern).
export const etDate = (offsetDays = 0) => {
  const d = new Date(Date.now() + offsetDays * 864e5);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(d);
};

export const getJson = async (url) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
};

// Every skater game line on one date (regular season), one row per player.
export const gameLines = (date) =>
  getJson(
    `${STATS}?limit=-1&isGame=true&cayenneExp=${encodeURIComponent(
      `gameDate>="${date}" and gameDate<="${date}" and gameTypeId=2`
    )}`
  );
