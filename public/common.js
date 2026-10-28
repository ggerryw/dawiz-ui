// Shared by every page: tab bar, theme toggle, NHL photo / logo markup.
const $ = (s) => document.querySelector(s);

// Light/dark theme. Follows the device until the visitor picks one with the toggle; the choice is saved in
// localStorage and applied early by the one-line script in each page's <head> (so the page doesn't flash).
const isDark = () => (document.documentElement.dataset.theme ?? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")) === "dark";

// Tab bar shared by every page; add new pages here. Only the daily pages are tabs on phones; the rest sit in the
// More menu, under a group heading. Where a page shows:
//   tab       a tab everywhere
//   wide      a tab on wide screens, not on phones at all (Teams: phones expand a team in place on Standings)
//   wide-tab  a tab on wide screens, in More on phones
//   more      in More everywhere
const TABS = [
  ["/", "Standings", "tab"],
  ["/team.html", "Teams", "wide"],
  ["/overnight.html", "Overnight", "tab"],
  ["/draft.html", "Draft", "wide-tab", "Draft"],
  ["/undrafted.html", "Undrafted", "more", "Draft"],
  ["/benches.html", "Benches", "more", "Draft"],
  ["/chase.html", "The Chase", "more", "Charts"],
  ["/hot.html", "Who's Hot", "more", "Charts"],
];
{
  const here = (href) => location.pathname === href || (href === "/" && location.pathname === "/index.html");
  const cur = (href) => (here(href) ? ' aria-current="page"' : "");
  const tabs = TABS.filter(([, , w]) => w !== "more").map(([href, label, w]) =>
    `<a href="${href}"${w === "tab" ? "" : ' class="wide-only"'}${cur(href)}>${label}</a>`);
  const inMore = TABS.filter(([, , w]) => w === "more" || w === "wide-tab");
  const groups = [...new Set(inMore.map((t) => t[3]))].map((g) => `<div class="mgroup${inMore.every((t) => t[3] !== g || t[2] === "wide-tab") ? " narrow-only" : ""}">${g}</div>` +
    inMore.filter((t) => t[3] === g).map(([href, label, w]) => `<a href="${href}"${w === "wide-tab" ? ' class="narrow-only"' : ""}${cur(href)}>${label}</a>`).join(""));
  // The More button is highlighted when the current page is inside it (on phones only, for a page that is a tab on wide screens).
  const curIn = inMore.find(([href]) => here(href));
  const moreCls = curIn ? (curIn[2] === "more" ? " cur" : " cur-narrow") : "";
  $("#nav").innerHTML = tabs.join("") +
    `<details class="more${moreCls}"><summary>More <span aria-hidden="true">▾</span></summary><div class="menu">${groups.join("")}</div></details>`;
  // Close the menu on a click outside it or on Escape.
  const more = $("#nav .more");
  document.addEventListener("click", (e) => { if (!more.contains(e.target)) more.open = false; });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") more.open = false; });
}

// Theme toggle, at the right end of the page header. Its icon shows the theme it switches to.
$("header").insertAdjacentHTML("beforeend", `<button class="theme" id="theme"></button>`);
// Inline SVGs on the same 24px grid, so both icons come out the same size (the ☀︎ and ☾ characters don't).
const ICON = {
  sun: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.5" fill="currentColor"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg>`,
  moon: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 14.2A8.6 8.6 0 0 1 9.8 3.5a8.6 8.6 0 1 0 10.7 10.7z" fill="currentColor"/></svg>`,
};
const themeLabel = () => {
  const b = $("#theme");
  b.innerHTML = isDark() ? ICON.sun : ICON.moon;
  b.title = isDark() ? "Light theme" : "Dark theme";
  b.setAttribute("aria-label", `Switch to ${b.title.toLowerCase()}`);
};
themeLabel();
$("#theme").addEventListener("click", () => {
  const theme = isDark() ? "light" : "dark";
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem("theme", theme); } catch {}
  // NHL logos come in light and dark versions; swap the ones already on the page.
  for (const img of document.querySelectorAll("img.logo")) img.src = logoSrc(img.alt);
  themeLabel();
});
// Footer on every page: a gap-toothed cartoon player and a straight-faced credit. The helmet is modelled on Butch
// Goring's old Swedish SPAPS: a padded headband and padded ribs over the crown, with hair showing between them.
$("main").insertAdjacentHTML("beforeend", `<footer class="credits">
  <svg viewBox="0 0 64 64" aria-hidden="true">
    <ellipse cx="13" cy="59" rx="6" ry="2.2" style="fill:var(--text)"/>
    <path d="M20 42q12-9 24 0v17H20z" style="fill:var(--accent)"/>
    <path d="M27 47h10M27 52h10" stroke="#fff" stroke-width="2" opacity=".7"/>
    <path d="M47 18 33 58H19" fill="none" stroke="#b07a43" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="32" cy="27" r="13" fill="#f3c7a0"/>
    <path d="M19 26a13 13 0 0 1 26 0z" fill="#6b4a2e"/>
    <g fill="none" stroke-linecap="round" style="stroke:var(--text)" stroke-width="4.6">
      <path d="M21.5 23Q22 15.5 30 14.5M42.5 23Q42 15.5 34 14.5M32 14.5V23M19.5 24.5h25"/>
    </g>
    <g fill="none" stroke-linecap="round" stroke="#f4f1ea" stroke-width="3">
      <path d="M21.5 23Q22 15.5 30 14.5M42.5 23Q42 15.5 34 14.5M32 14.5V23M19.5 24.5h25"/>
    </g>
    <circle cx="27" cy="29" r="1.7" style="fill:var(--text)"/>
    <path d="M35 29h4" style="stroke:var(--text)" stroke-width="1.7" stroke-linecap="round"/>
    <path d="M26 33q6 6.5 12 0z" fill="#fff" style="stroke:var(--text)" stroke-width="1.2" stroke-linejoin="round"/>
    <rect x="30.6" y="33" width="2.6" height="2.6" style="fill:var(--text)"/>
  </svg>
  <div>Brought to you by the tireless efforts of the DaWiz IT professionals.
    <small>No teeth were harmed in the making of these standings. Most of them, anyway.</small></div>
</footer>`);

const price = (c) => (c == null ? "" : ` · $${c.toFixed(2)}`);
const initials = (n) => n.split(" ").map((w) => w[0]).slice(0, 2).join("");
const photo = (p) => `<span class="photo"><img loading="lazy" alt="" src="https://assets.nhle.com/mugs/nhl/latest/${p.id}.png" onerror="this.parentNode.textContent='${initials(p.name)}'"></span>`;
const logoSrc = (t) => `https://assets.nhle.com/logos/nhl/svg/${t}_${isDark() ? "dark" : "light"}.svg`;
// big: a larger logo that stands alone (no abbreviation next to it), so if it fails to load it's
// replaced by the abbreviation instead of just disappearing.
const logo = (t, big = false) => t
  ? `<img class="logo${big ? " big" : ""}" loading="lazy" alt="${t}" title="${t}" src="${logoSrc(t)}" onerror="${big ? "this.replaceWith(this.alt)" : "this.remove()"}">`
  : "";

// "7:00 PM vs OTT" / "7:30 PM @ MIN" pill for a player's game today. The start time is shown
// in the viewer's own time zone.
const gamePill = (g) => {
  if (!g) return "";
  const t = new Date(g.start);
  // Locales differ ("7 p.m." in en-CA, "7 PM" in en-US), so normalize to "7:00 PM".
  const fmt = (o) => t.toLocaleTimeString([], o).replace(/\s*([ap])\.?\s?m\.?/i, (_, x) => " " + x.toUpperCase() + "M");
  const time = fmt({ hour: "numeric", minute: "2-digit" }); // always with minutes: "1:00 PM", "7:30 PM"
  return `<span class="gm">${time} ${g.home ? "vs" : "@"} ${g.opp}</span>`;
};

const money = (v) => `$${v.toFixed(2)}`;

// Screens wide enough for the full tables (matches the min-width: 1000px block in style.css).
const WIDE = matchMedia("(min-width: 1000px)");
const teamUrl = (owner) => `/team.html?owner=${encodeURIComponent(owner)}`;

// Last-night cell: green +N pill when points were scored; a muted 0 when the player(s) played but didn't score
// (never green: green is for points); blank when nobody played.
const lastNight = (pts, gp) => (pts ? `<span class="plus">+${pts}</span>` : gp ? `<span class="nopts">0</span>` : "");

// One owner's roster table (active players, Total row, bench), used by the Standings page (expanded in
// place on phones and tablets) and the Teams page. Expects a .detail container for its styling.
function rosterTable(o) {
  // Wide screens (.wd cells) split round, position, team and price into their own columns;
  // narrower screens show them in the line under the name instead.
  const prow = (p, cls = "") => {
    const onBench = cls === "bench";
    return `<tr class="${cls}"><td class="wd">${p.round ?? ""}</td><td class="pname"><a class="player" href="https://www.nhl.com/player/${p.id}" target="_blank" rel="noopener">${photo(p)}<div class="pinfo"><div class="nameline"><b>${p.name}</b>${gamePill(p.game)}</div><span class="pmeta">${p.team ? logo(p.team, true) : "— ·"} ${p.pos}${p.round ? ` · Rd ${p.round}` : ""}${onBench ? ` · Times Picked: <span class="times">${p.timesPicked}</span>` : price(p.cost)}</span></div></a></td>
    <td class="wd">${p.pos}</td><td class="wd tm">${p.team ? logo(p.team, true) : "—"}</td>
    <td data-l="GP">${p.gp}</td><td data-l="G">${p.g}</td><td data-l="A">${p.a}</td><td data-l="TP"><b>${p.tp}</b></td><td data-l="PPG">${p.gp ? (p.tp / p.gp).toFixed(2) : "0.00"}</td>
    <td class="rm"${p.rm ? ' data-l="RM"' : ""}>${p.rm ? money(p.rm) : ""}</td><td class="wd">${onBench ? p.timesPicked : p.cost == null ? "" : money(p.cost)}</td><td class="ln"${p.otp || (!onBench && p.ogp) ? ' data-l="Last Night:"' : ""}>${lastNight(p.otp, !onBench && p.ogp)}</td></tr>`;
  };
  const cost = o.players.reduce((n, p) => n + (p.cost ?? 0), 0);
  const total = `<tr class="total"><td class="wd"></td><td class="pname"><b>Total</b></td><td class="wd"></td><td class="wd"></td>
    <td data-l="GP">${o.gp}</td><td data-l="G">${o.g}</td><td data-l="A">${o.a}</td><td data-l="TP">${o.tp}</td><td data-l="PPG">${o.ppg.toFixed(2)}</td>
    <td class="rm" data-l="RM">${money(o.rm)}</td><td class="wd">${money(cost)}</td><td class="ln"${o.otp || o.ogp ? ' data-l="Last Night:"' : ""}>${lastNight(o.otp, o.ogp)}</td></tr>`;
  // CSS can't change colspan, so the bench label row has a narrow version (8 columns) and a wide one (12).
  const bench = o.bench?.length
    ? `<tr class="benchhead nw"><td colspan="8">Bench</td></tr><tr class="benchhead wd"><td colspan="10">Bench</td><td>Times Picked</td><td></td></tr>${o.bench.map((p) => prow(p, "bench")).join("")}`
    : "";
  return `<table><thead><tr><th class="wd">Rd</th><th style="text-align:left">Player</th><th class="wd">Pos</th><th class="wd">Team</th><th>GP</th><th>G</th><th>A</th><th>TP</th><th>PPG</th><th title="Round money">RM</th><th class="wd">Cost</th><th class="ln">Last night</th></tr></thead><tbody>${o.players.map((p) => prow(p)).join("")}${total}${bench}</tbody></table>`;
}
