// data/bibleFeed.csv -> netlify/lib/bible.json
// The bible is the source of truth for player positions and draft prices.
// Sheet IDs drop the leading "84"; the JSON is keyed by the full NHL id.
import { readFileSync, writeFileSync } from "node:fs";

const lines = readFileSync(new URL("../data/bibleFeed.csv", import.meta.url), "utf8")
  .split(/\r?\n/)
  .filter((l) => l.trim())
  .slice(1); // header: NHL ID,Full Name,Cost,Pos

const bible = {};
for (const l of lines) {
  const [id, , cost, pos] = l.split(",").map((c) => c.trim());
  const price = Number(cost.replace("$", ""));
  if (!/^\d+$/.test(id) || !pos || Number.isNaN(price)) {
    console.warn(`! skipping bad row: ${l}`);
    continue;
  }
  bible["84" + id] = { pos, cost: price };
}

writeFileSync(new URL("../netlify/lib/bible.json", import.meta.url), JSON.stringify(bible));
console.log(`${Object.keys(bible).length} players`);
