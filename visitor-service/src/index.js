const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BOT = /bot\b|crawler|spider|headless|lighthouse|pagespeed|slurp|facebookexternalhit/i;

function response(data, status, origin, extra = {}) {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    Vary: "Origin",
    ...extra,
  });
  if (origin) headers.set("Access-Control-Allow-Origin", origin);
  return new Response(data === null ? null : JSON.stringify(data), { status, headers });
}

async function digest(value) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function coarseLocation(cf = {}) {
  cf ||= {};
  const country = /^[A-Z]{2}$/.test(cf.country || "") && !["XX", "T1"].includes(cf.country)
    ? cf.country : "ZZ";
  const lat = cf.latitude == null || cf.latitude === "" ? NaN : Number(cf.latitude);
  const lon = cf.longitude == null || cf.longitude === "" ? NaN : Number(cf.longitude);
  if (country === "ZZ" || !Number.isFinite(lat) || !Number.isFinite(lon)
      || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return { country, latitude: null, longitude: null };
  }
  return {
    country,
    latitude: Math.min(87.5, Math.floor((lat + 90) / 5) * 5 - 87.5),
    longitude: Math.min(177.5, Math.floor((lon + 180) / 5) * 5 - 177.5),
  };
}

async function smallJson(request) {
  if (request.headers.get("Content-Type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    throw new Error("invalid payload");
  }
  if (Number(request.headers.get("Content-Length")) > 256 || !request.body) {
    throw new Error("invalid payload");
  }
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 256) {
      await reader.cancel();
      throw new Error("invalid payload");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  const data = JSON.parse(new TextDecoder().decode(bytes));
  if (!data || typeof data !== "object" || typeof data.session !== "string" || !UUID.test(data.session)
      || Object.keys(data).length !== 1) throw new Error("invalid payload");
  return data;
}

export async function readStats(db) {
  const [summary, countries, locations] = await db.batch([
    db.prepare("SELECT visits, started_at FROM summary WHERE id = 1"),
    db.prepare("SELECT country, visits FROM countries ORDER BY visits DESC, country"),
    db.prepare("SELECT country, latitude, longitude, visits FROM locations ORDER BY visits DESC, country, latitude, longitude"),
  ]);
  return {
    visits: summary.results[0].visits,
    started_at: summary.results[0].started_at,
    country_count: countries.results.filter((row) => row.country !== "ZZ").length,
    countries: countries.results,
    locations: locations.results,
  };
}

export async function recordVisit(db, session, cf, now = new Date()) {
  const token = await digest(`${now.toISOString().slice(0, 10)}:${session.toLowerCase()}`);
  const location = coarseLocation(cf);
  await db.prepare(`INSERT INTO sessions (token, expires_at, country, latitude, longitude)
    VALUES (?, ?, ?, ?, ?) ON CONFLICT (token) DO NOTHING`)
    .bind(token, Math.floor(now.getTime() / 1000) + 172800,
      location.country, location.latitude, location.longitude).run();
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");
    const allowed = (env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim());
    if (origin && !allowed.includes(origin)) return response({ error: "Origin not allowed" }, 403, null);
    if (!["/stats", "/visit"].includes(url.pathname)) return response({ error: "Not found" }, 404, origin);
    if (request.method === "OPTIONS") {
      if (!origin) return response({ error: "Origin required" }, 403, null);
      return response(null, 204, origin, {
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400",
      });
    }
    const reading = request.method === "GET" && url.pathname === "/stats";
    const writing = request.method === "POST" && url.pathname === "/visit";
    if (!reading && !writing) return response({ error: "Method not allowed" }, 405, origin);
    if (writing && !origin) return response({ error: "Origin required" }, 403, null);
    try {
      const cache = globalThis.caches?.default;
      const cacheKey = new Request(`${url.origin}/stats`);
      if (reading && cache) {
        const hit = await cache.match(cacheKey);
        if (hit) return response(await hit.json(), 200, origin, { "Cache-Control": "public, max-age=60" });
      }
      const key = await digest(request.headers.get("CF-Connecting-IP") || "unknown");
      const { success } = await env.RATE_LIMITER.limit({ key: `${reading ? "read" : "write"}:${key}` });
      if (!success) return response({ error: "Too many requests" }, 429, origin, { "Retry-After": "60" });
      if (writing) {
        let data;
        try { data = await smallJson(request); }
        catch { return response({ error: "Invalid request" }, 400, origin); }
        if (!BOT.test(request.headers.get("User-Agent") || "")) {
          await recordVisit(env.DB, data.session, request.cf);
        }
      }
      const stats = await readStats(env.DB);
      if (cache && ctx) {
        const cached = response(stats, 200, null, { "Cache-Control": "public, max-age=60" });
        ctx.waitUntil(cache.put(cacheKey, cached));
      }
      return response(stats, 200, origin, reading ? { "Cache-Control": "public, max-age=60" } : {});
    } catch {
      return response({ error: "Statistics temporarily unavailable" }, 503, origin);
    }
  },
  async scheduled(_event, env) {
    await env.DB.prepare("DELETE FROM sessions WHERE expires_at <= ?")
      .bind(Math.floor(Date.now() / 1000)).run();
  },
};
