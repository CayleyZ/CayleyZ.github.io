import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Liquid } from "liquidjs";
import * as sass from "sass";

const root = new URL("../../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const sample = process.argv.includes("--sample");
const engine = new Liquid();
engine.registerFilter("relative_url", (path) => path);
const component = await engine.parseAndRender(read("_includes/visitors.html"), {
  site: { visitor_stats_url: "http://127.0.0.1:8765" }, jekyll: { environment: "development" },
});
const css = sass.compileString(read("assets/css/main.scss").replace(/^---\r?\n---\r?\n/, ""), {
  loadPaths: [fileURLToPath(new URL("_sass/", root))],
  style: "compressed", logger: sass.Logger.silent,
}).css;
const escape = (s) => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const teaching = read("_pages/about.md").split("# 📚 Teaching")[1].split("{% include")[0]
  .split(/\r?\n/).filter((line) => line.startsWith("- ")).map((line) => `<li>${escape(line.slice(2))}</li>`).join("");
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Visitor map preview</title><link rel="stylesheet" href="/assets/css/main.css"><body><main class="page__content" style="max-width:960px;margin:2em auto;padding:0 1em"><p style="padding:.7em;background:#fff5d6">Local preview — ${sample ? "sample data only; these are not real visitors" : "local test database"}. No production visits are recorded.</p><h1 id="teaching">📚 Teaching</h1><ul>${teaching}</ul>${component}</main></body></html>`;
// This fixture is only served by the explicitly invoked local preview command.
const fixture = {
  visits: 15, country_count: 4, started_at: "2026-09-12T00:00:00Z",
  countries: [{ country: "CN", visits: 9 }, { country: "US", visits: 3 }, { country: "DE", visits: 2 }, { country: "AU", visits: 1 }],
  locations: [{ country: "CN", latitude: 32.5, longitude: 102.5, visits: 9 }, { country: "US", latitude: 37.5, longitude: -122.5, visits: 3 }, { country: "DE", latitude: 52.5, longitude: 12.5, visits: 2 }, { country: "AU", latitude: -32.5, longitude: 152.5, visits: 1 }],
};
createServer(async (req, res) => {
  const path = new URL(req.url, "http://127.0.0.1:8765").pathname;
  const files = { "/": ["text/html", html], "/assets/css/main.css": ["text/css", css],
    "/assets/geo/world-land.svg": ["image/svg+xml", read("assets/geo/world-land.svg")],
    "/assets/js/visitors.js": ["text/javascript", read("assets/js/visitors.js")] };
  if (path === "/stats") {
    try {
      const data = sample ? fixture : await (await fetch("http://127.0.0.1:8787/stats")).json();
      res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      res.end(JSON.stringify(data));
    } catch { res.writeHead(503); res.end("Local service unavailable"); }
  } else if (files[path]) {
    res.writeHead(200, { "Content-Type": files[path][0] + "; charset=utf-8" });
    res.end(files[path][1]);
  } else { res.writeHead(404); res.end("Not found"); }
}).listen(8765, "127.0.0.1", () => console.log(`Preview: http://127.0.0.1:8765/ (${sample ? "sample data" : "local database"})`));
