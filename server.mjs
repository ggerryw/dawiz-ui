// Local dev server: node server.mjs  ->  http://localhost:8888
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import handler from "./netlify/functions/standings.mjs";

createServer(async (req, res) => {
  if (req.url.startsWith("/api/standings")) {
    const r = await handler();
    res.writeHead(r.status, { "content-type": "application/json" });
    return res.end(await r.text());
  }
  try {
    const file = req.url === "/" ? "index.html" : req.url.slice(1).split("?")[0];
    const body = await readFile(new URL(`./public/${file}`, import.meta.url));
    res.writeHead(200, { "content-type": file.endsWith(".html") ? "text/html" : "text/plain" });
    res.end(body);
  } catch {
    res.writeHead(404).end("not found");
  }
}).listen(8888, () => console.log("http://localhost:8888"));
