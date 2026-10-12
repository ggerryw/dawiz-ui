// Shared by both pages: NHL photo / logo markup.
const $ = (s) => document.querySelector(s);
const initials = (n) => n.split(" ").map((w) => w[0]).slice(0, 2).join("");
const photo = (p) => `<span class="photo"><img loading="lazy" alt="" src="https://assets.nhle.com/mugs/nhl/latest/${p.id}.png" onerror="this.parentNode.textContent='${initials(p.name)}'"></span>`;
const logo = (t) => t ? `<picture><source media="(prefers-color-scheme: dark)" srcset="https://assets.nhle.com/logos/nhl/svg/${t}_dark.svg"><img class="logo" loading="lazy" alt="${t}" src="https://assets.nhle.com/logos/nhl/svg/${t}_light.svg" onerror="this.remove()"></picture>` : "";
