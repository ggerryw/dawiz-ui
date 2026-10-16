// Shared by every page: tab bar, theme toggle, NHL photo / logo markup.
const $ = (s) => document.querySelector(s);

// Light/dark theme. Follows the device until the visitor picks one with the toggle; the choice is saved in
// localStorage and applied early by the one-line script in each page's <head> (so the page doesn't flash).
const isDark = () => (document.documentElement.dataset.theme ?? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")) === "dark";

// Tab bar shared by every page; add new pages here.
const TABS = [["/", "Standings"], ["/overnight.html", "Overnight"], ["/draft.html", "Draft"]];
$("#nav").innerHTML = TABS.map(([href, label]) =>
  `<a href="${href}"${location.pathname === href || (href === "/" && location.pathname === "/index.html") ? ' aria-current="page"' : ""}>${label}</a>`
).join("");

// Theme toggle, at the right end of the page header. Its icon shows the theme it switches to.
$("header").insertAdjacentHTML("beforeend", `<button class="theme" id="theme"></button>`);
const themeLabel = () => {
  const b = $("#theme");
  b.textContent = isDark() ? "☀︎" : "☾";
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
