(() => {
  "use strict";
  const root = document.querySelector("[data-visitor-stats]");
  if (!root) return;
  const label = root.querySelector("[data-visitor-label]");
  function unavailable() {
    label.textContent = "visitor statistics unavailable";
    root.dataset.state = "error";
  }
  const number = new Intl.NumberFormat("en");
  const names = typeof Intl.DisplayNames === "function" ? new Intl.DisplayNames(["en"], { type: "region" }) : null;
  const countryName = (code) => code === "ZZ" ? "Unknown" : (names?.of(code) || code);
  const ns = "http://www.w3.org/2000/svg";
  let api;
  try {
    api = new URL(root.dataset.api);
    if (api.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(api.hostname)) throw new Error();
    api = api.href.replace(/\/$/, "");
  } catch {
    unavailable();
    return;
  }

  function session() {
    if (root.dataset.track !== "true" || ["localhost", "127.0.0.1"].includes(location.hostname)
        || navigator.globalPrivacyControl === true || navigator.doNotTrack === "1") return null;
    try {
      const key = "homepage-visitor-session";
      let id = sessionStorage.getItem(key);
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id || "")) {
        id = crypto.randomUUID();
        sessionStorage.setItem(key, id);
      }
      const marker = `homepage-visitor-recorded:${api}:${new Date().toISOString().slice(0, 10)}`;
      return sessionStorage.getItem(marker) ? null : { id, marker };
    } catch { return null; }
  }

  async function request(path, options) {
    const result = await fetch(api + path, { ...options, credentials: "omit", signal: AbortSignal.timeout(10000) });
    if (!result.ok) throw new Error("Statistics request failed");
    const data = await result.json();
    if (!Number.isSafeInteger(data.visits) || data.visits < 0
        || !Number.isSafeInteger(data.country_count) || data.country_count < 0
        || !Array.isArray(data.countries) || !Array.isArray(data.locations)
        || !data.countries.every((r) => /^[A-Z]{2}$/.test(r.country) && Number.isSafeInteger(r.visits) && r.visits > 0)
        || !data.locations.every((r) => /^[A-Z]{2}$/.test(r.country) && Number.isSafeInteger(r.visits) && r.visits > 0
          && Number.isFinite(r.latitude) && Math.abs(r.latitude) <= 90
          && Number.isFinite(r.longitude) && Math.abs(r.longitude) <= 180)) throw new Error("Invalid statistics");
    return data;
  }

  function render(data) {
    root.querySelector("[data-visits]").textContent = String(data.visits).padStart(6, "0");
    const points = root.querySelector("[data-visitor-points]");
    points.replaceChildren();
    // The tip of each pin sits at the approximate location.
    data.locations.slice().sort((a, b) => b.visits - a.visits).forEach((location) => {
      const point = document.createElementNS(ns, "g");
      point.setAttribute("transform", `translate(${(location.longitude + 180) * 2},${(90 - location.latitude) * 2})`);
      const title = document.createElementNS(ns, "title");
      title.textContent = `${countryName(location.country)}: ${number.format(location.visits)} visits (approximate location)`;
      const pin = document.createElementNS(ns, "path");
      pin.setAttribute("d", "M0 0C-2.5-3.5-7-8-7-12a7 7 0 1 1 14 0C7-8 2.5-3.5 0 0Z");
      const center = document.createElementNS(ns, "circle");
      center.setAttribute("cy", "-12");
      center.setAttribute("r", "2.4");
      point.append(title, pin, center);
      points.append(point);
    });
    const since = data.started_at ? new Date(data.started_at) : null;
    if (since && Number.isFinite(since.getTime())) {
      const month = since.toLocaleDateString("en", { month: "short", timeZone: "UTC" });
      label.textContent = `visitors since ${month}. ${since.getUTCFullYear()}`;
    } else {
      label.textContent = "visitors";
    }
    root.dataset.state = "ready";
  }

  async function load() {
    const visitor = session();
    let data;
    if (visitor) {
      try {
        data = await request("/visit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ session: visitor.id }) });
        try { sessionStorage.setItem(visitor.marker, "1"); } catch { /* Server also deduplicates. */ }
      } catch { /* Still display existing statistics if recording is unavailable. */ }
    }
    try {
      if (!data) data = await request("/stats");
      render(data);
    } catch {
      unavailable();
    }
  }
  load();
})();
