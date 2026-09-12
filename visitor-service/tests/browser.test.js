import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";

const source = readFileSync(new URL("../../assets/js/visitors.js", import.meta.url), "utf8");
const template = readFileSync(new URL("../../_includes/visitors.html", import.meta.url), "utf8")
  .replace(/data-api="[^"]*"/, 'data-api="https://stats.example"')
  .replace(/data-track="[^"]*"/, 'data-track="true"');
const data = { visits: 3, started_at: "2026-09-12T00:00:00Z", country_count: 1,
  countries: [{ country: "CN", visits: 3 }], locations: [{ country: "CN", latitude: 32.5, longitude: 102.5, visits: 3 }] };

async function page(t, fetch, configure = () => {}) {
  const dom = new JSDOM(template, { url: "https://zijianzhou.xyz/", runScripts: "outside-only" });
  t.after(() => dom.window.close());
  dom.window.fetch = fetch;
  configure(dom.window);
  dom.window.eval(source);
  // Wait for the visible result rather than assuming a specific number of microtasks.
  for (let i = 0; i < 100; i++) {
    if (!dom.window.document.querySelector('[data-visitor-status]').textContent.startsWith("Loading")) return dom.window;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error("Statistics UI did not settle");
}

test("records once, renders map numbers and country names, and only reads on refresh", async (t) => {
  const calls = [];
  const window = await page(t, async (url, options) => {
    calls.push({ url, options });
    return Response.json(data);
  });
  const doc = window.document;
  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.method, "POST");
  assert.equal(calls[0].options.credentials, "omit");
  assert.deepEqual(Object.keys(JSON.parse(calls[0].options.body)), ["session"]);
  assert.equal(doc.querySelector("[data-visits]").textContent, "3");
  assert.equal(doc.querySelector("[data-visitor-points] text").textContent, "3");
  assert.equal(doc.querySelector("[data-country-rows] th").textContent, "China");
  window.eval(source);
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(calls[1].url, "https://stats.example/stats");
  assert.equal(calls.length, 2);
});

test("does not record when privacy preference is set or session storage is unavailable", async (t) => {
  for (const configure of [
    (w) => Object.defineProperty(w.navigator, "globalPrivacyControl", { value: true }),
    (w) => Object.defineProperty(w, "sessionStorage", { get() { throw new Error("blocked"); } }),
    (w) => w.document.querySelector("[data-visitor-stats]").dataset.track = "false",
  ]) {
    const calls = [];
    await page(t, async (url) => { calls.push(url); return Response.json(data); }, configure);
    assert.deepEqual(calls, ["https://stats.example/stats"]);
  }
});

test("write failures still show real existing statistics and remain retryable", async (t) => {
  const calls = [];
  const window = await page(t, async (url) => {
    calls.push(url);
    return url.endsWith("/visit") ? new Response(null, { status: 503 }) : Response.json(data);
  });
  assert.equal(calls.length, 2);
  assert.equal(window.document.querySelector("[data-visits]").textContent, "3");
  assert.ok(!Object.keys(window.sessionStorage).some((key) => key.startsWith("homepage-visitor-recorded")));
});

test("empty data and unavailable service never show invented visitor markers", async (t) => {
  const empty = await page(t, async () => Response.json({ visits: 0, country_count: 0, started_at: null, countries: [], locations: [] }));
  assert.equal(empty.document.querySelector("[data-visits]").textContent, "0");
  assert.equal(empty.document.querySelectorAll("[data-visitor-points] circle").length, 0);
  assert.equal(empty.document.querySelector("[data-country-table]").hidden, true);
  const failed = await page(t, async () => { throw new Error("offline"); });
  assert.equal(failed.document.querySelector("[data-visits]").textContent, "—");
  assert.match(failed.document.querySelector("[data-visitor-status]").textContent, /temporarily unavailable/);
});
