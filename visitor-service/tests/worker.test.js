import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import worker, { coarseLocation, recordVisit, readStats } from "../src/index.js";

// Exercise the real migration and SQLite triggers, rather than mock counter results.
function database(t) {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(readFileSync(new URL("../migrations/0001_visitors.sql", import.meta.url), "utf8"));
  t.after(() => sqlite.close());
  const db = {
    sqlite,
    prepare(sql) {
      const statement = sqlite.prepare(sql);
      let args = [];
      return {
        bind(...values) { args = values; return this; },
        async run() { return { meta: statement.run(...args) }; },
        async all() { return { results: statement.all(...args).map((r) => ({ ...r })) }; },
      };
    },
    async batch(statements) {
      sqlite.exec("BEGIN");
      try {
        const results = [];
        for (const statement of statements) results.push(await statement.all());
        sqlite.exec("COMMIT");
        return results;
      } catch (error) { sqlite.exec("ROLLBACK"); throw error; }
    },
  };
  return db;
}
const id = "cabd6167-7e6a-4b1f-89a9-a689081c0925";
const cf = { country: "CN", latitude: "30.66", longitude: "104.06" };
const origin = "https://zijianzhou.xyz";
function environment(t) {
  return { DB: database(t), ALLOWED_ORIGINS: origin, RATE_LIMITER: { async limit() { return { success: true }; } } };
}
function visit(options = {}) {
  const { body, headers, ...rest } = options;
  const request = new Request("https://stats.example/visit", {
    method: "POST", body: body ?? JSON.stringify({ session: id }),
    headers: { Origin: origin, "Content-Type": "application/json", "CF-Connecting-IP": "192.0.2.1", ...headers },
    ...rest,
  });
  Object.defineProperty(request, "cf", { value: cf });
  return request;
}

test("concurrent duplicate sessions count once; new days and new sessions count separately", async (t) => {
  const db = database(t);
  const now = new Date("2026-09-12T00:01:00Z");
  await Promise.all(Array.from({ length: 12 }, () => recordVisit(db, id, cf, now)));
  let stats = await readStats(db);
  assert.equal(stats.visits, 1);
  assert.deepEqual(stats.countries, [{ country: "CN", visits: 1 }]);
  assert.deepEqual(stats.locations, [{ country: "CN", latitude: 32.5, longitude: 102.5, visits: 1 }]);
  await recordVisit(db, id, cf, new Date("2026-09-13T00:01:00Z"));
  await recordVisit(db, "4d96d621-293e-4dba-b56c-d2a794f30773", { country: "US" }, now);
  stats = await readStats(db);
  assert.equal(stats.visits, 3);
  assert.equal(stats.country_count, 2);
  assert.equal(stats.locations.length, 1);
  assert.equal(stats.locations[0].visits, 2);
  assert.ok(stats.started_at);
});

test("missing or invalid coordinates never create a fabricated marker", () => {
  assert.deepEqual(coarseLocation(), { country: "ZZ", latitude: null, longitude: null });
  assert.deepEqual(coarseLocation({ country: "US", latitude: "", longitude: "" }), { country: "US", latitude: null, longitude: null });
  assert.equal(coarseLocation({ ...cf, latitude: "100" }).latitude, null);
  assert.equal(coarseLocation({ ...cf, country: "<script>" }).country, "ZZ");
  assert.deepEqual(coarseLocation({ country: "NZ", latitude: "-90", longitude: "180" }), { country: "NZ", latitude: -87.5, longitude: 177.5 });
});

test("retention cleanup deletes identifiers without changing permanent totals", async (t) => {
  const env = environment(t);
  await recordVisit(env.DB, id, cf, new Date("2020-01-01T00:00:00Z"));
  const session = env.DB.sqlite.prepare("SELECT * FROM sessions").get();
  assert.equal(session.token.length, 64);
  assert.ok(!JSON.stringify(session).includes(id));
  await worker.scheduled({}, env);
  assert.equal(env.DB.sqlite.prepare("SELECT count(*) AS n FROM sessions").get().n, 0);
  assert.equal((await readStats(env.DB)).visits, 1);
});

test("public stats are initially empty and unknown origins cannot record visits", async (t) => {
  const env = environment(t);
  const empty = await worker.fetch(new Request("https://stats.example/stats"), env);
  assert.equal(empty.status, 200);
  assert.equal((await empty.json()).visits, 0);
  assert.equal((await worker.fetch(visit({ headers: { Origin: "https://other.example" } }), env)).status, 403);
  const absent = visit(); absent.headers.delete("Origin");
  assert.equal((await worker.fetch(absent, env)).status, 403);
  assert.equal((await readStats(env.DB)).visits, 0);
});

test("CORS preflight, successful write and subsequent duplicate response", async (t) => {
  const env = environment(t);
  const preflight = await worker.fetch(new Request("https://stats.example/visit", { method: "OPTIONS", headers: { Origin: origin } }), env);
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get("Access-Control-Allow-Origin"), origin);
  for (let i = 0; i < 2; i++) {
    const result = await worker.fetch(visit(), env);
    assert.equal(result.status, 200);
    assert.equal(result.headers.get("Cache-Control"), "no-store");
    const data = await result.json();
    assert.equal(data.visits, 1);
    assert.ok(!JSON.stringify(data).includes("token"));
  }
});

test("malformed, oversized and client-supplied location payloads are rejected", async (t) => {
  const env = environment(t);
  for (const body of ["{", "null", JSON.stringify({ session: "not-a-session" }), JSON.stringify({ session: [id] }), " ".repeat(257), JSON.stringify({ session: id, country: "US" })]) {
    assert.equal((await worker.fetch(visit({ body }), env)).status, 400);
  }
  assert.equal((await worker.fetch(visit({ headers: { "Content-Type": "text/plain" } }), env)).status, 400);
  assert.equal((await worker.fetch(visit({ headers: { "Content-Type": "application/jsonx" } }), env)).status, 400);
  assert.equal((await readStats(env.DB)).visits, 0);
});

test("common bots and rate-limited requests cannot increment counts", async (t) => {
  const env = environment(t);
  const bot = await worker.fetch(visit({ headers: { "User-Agent": "Googlebot" } }), env);
  assert.equal((await bot.json()).visits, 0);
  env.RATE_LIMITER.limit = async () => ({ success: false });
  const limited = await worker.fetch(visit(), env);
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get("Retry-After"), "60");
  assert.equal((await readStats(env.DB)).visits, 0);
});

test("storage errors fail visibly without leaking internal details", async (t) => {
  const env = environment(t);
  env.DB.batch = async () => { throw new Error("private database detail"); };
  const result = await worker.fetch(new Request("https://stats.example/stats"), env);
  assert.equal(result.status, 503);
  assert.ok(!(await result.text()).includes("private database detail"));
});
