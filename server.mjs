// Local dev server: node server.mjs  ->  http://localhost:8888
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import standings from "./netlify/functions/standings.mjs";
import overnight from "./netlify/functions/overnight.mjs";

const api = { "/api/standings": standings, "/api/overnight": overnight };
const types = { html: "text/html", css: "text/css", js: "text/javascript", json: "application/json" };

createServer(async (req, res) => {
  const path = req.url.split("?")[0];
  if (api[path]) {
    try {
      const r = await api[path]();
      res.writeHead(r.status, { "content-type": "application/json" });
      return res.end(await r.text());
    } catch (e) {
      res.writeHead(500).end(String(e));
      return;
    }
  }
  try {
    // Mirror Netlify: "/" -> index.html; "/overnight.html" etc. served as-is.
    const file = path === "/" ? "index.html" : path.slice(1);
    const body = await readFile(new URL(`./public/${file}`, import.meta.url));
    res.writeHead(200, { "content-type": types[file.split(".").pop()] ?? "text/plain" });
    res.end(body);
  } catch {
    res.writeHead(404).end("not found");
  }
}).listen(8888, () => console.log("http://localhost:8888"));
