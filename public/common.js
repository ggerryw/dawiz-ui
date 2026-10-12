// Shared by both pages: NHL photo / logo markup.
const $ = (s) => document.querySelector(s);

// Tab bar shared by every page; add new pages here.
const TABS = [["/", "Standings"], ["/overnight.html", "Overnight"], ["/draft.html", "Draft"]];
$("#nav").innerHTML = TABS.map(([href, label]) =>
  `<a href="${href}"${location.pathname === href || (href === "/" && location.pathname === "/index.html") ? ' aria-current="page"' : ""}>${label}</a>`
).join("");
const price = (c) => (c == null ? "" : ` · $${c.toFixed(2)}`);
const initials = (n) => n.split(" ").map((w) => w[0]).slice(0, 2).join("");
const photo = (p) => `<span class="photo"><img loading="lazy" alt="" src="https://assets.nhle.com/mugs/nhl/latest/${p.id}.png" onerror="this.parentNode.textContent='${initials(p.name)}'"></span>`;
const logo = (t) => t ? `<picture><source media="(prefers-color-scheme: dark)" srcset="https://assets.nhle.com/logos/nhl/svg/${t}_dark.svg"><img class="logo" loading="lazy" alt="${t}" src="https://assets.nhle.com/logos/nhl/svg/${t}_light.svg" onerror="this.remove()"></picture>` : "";

// "7 PM vs OTT" / "7:30 PM @ MIN" pill for a player's game today. The start time is shown
// in the viewer's own time zone; ":00" is dropped to keep the pill short.
const gamePill = (g) => {
  if (!g) return "";
  const t = new Date(g.start);
  const time = t.toLocaleTimeString([], t.getMinutes() ? { hour: "numeric", minute: "2-digit" } : { hour: "numeric" });
  return `<span class="gm">${time} ${g.home ? "vs" : "@"} ${g.opp}</span>`;
};
