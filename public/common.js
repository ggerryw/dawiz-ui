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
