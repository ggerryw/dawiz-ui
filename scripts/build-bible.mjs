// bibleFeed.csv -> netlify/lib/bible.json
// The bible is the source of truth for player positions (and, later, draft prices).
// Sheet IDs drop the leading "84"; the JSON is keyed by the full NHL id.
import { readFileSync, writeFileSync } from "node:fs";

const lines = readFileSync(new URL("../bibleFeed.csv", import.meta.url), "utf8")
  .split(/\r?\n/)
  .filter((l) => l.trim())
  .slice(1); // header: NHL ID,Full Name,Cost,Pos

const pos = {};
for (const l of lines) {
  const [id, , , p] = l.split(",").map((c) => c.trim());
  if (!/^\d+$/.test(id) || !p) {
    console.warn(`! skipping bad row: ${l}`);
    continue;
  }
  pos["84" + id] = p;
}

writeFileSync(new URL("../netlify/lib/bible.json", import.meta.url), JSON.stringify(pos));
console.log(`${Object.keys(pos).length} players`);
