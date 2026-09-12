import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Liquid } from "liquidjs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const engine = new Liquid();
engine.registerFilter("relative_url", (path) => path);
const component = read("../../_includes/visitors.html");
const nav = read("../../_includes/masthead.html");
const links = [{ title: "Teaching", url: "/#teaching" }, { title: "Visitors", url: "/#visitors", requires_visitors: true }];

test("unconfigured section and navigation remain hidden together", async () => {
  for (const url of [undefined, "", "  "]) {
    const context = { site: { visitor_stats_url: url, data: { navigation: { main: links } } } };
    assert.equal((await engine.parseAndRender(component, context)).trim(), "");
    const html = await engine.parseAndRender(nav, context);
    assert.ok(!html.includes('/#visitors'));
    assert.ok(html.includes('/#teaching'));
  }
});

test("configured component is visible, safely escaped, and only production enables tracking", async () => {
  for (const environment of ["development", "production"]) {
    const context = { site: { visitor_stats_url: "https://stats.example/?a=1&b=2", data: { navigation: { main: links } } }, jekyll: { environment } };
    const html = await engine.parseAndRender(component, context);
    assert.ok(html.includes('id="visitors"'));
    assert.ok(html.includes('a=1&amp;b=2'));
    assert.ok(html.includes(`data-track="${environment === "production"}"`));
    assert.ok((await engine.parseAndRender(nav, context)).includes('/#visitors'));
  }
});
