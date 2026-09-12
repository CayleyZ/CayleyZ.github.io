(() => {
  "use strict";
  const root = document.querySelector("[data-visitor-stats]");
  if (!root) return;
  const status = root.querySelector("[data-visitor-status]");
  const number = new Intl.NumberFormat("en");
  const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
  const names = typeof Intl.DisplayNames === "function" ? new Intl.DisplayNames(["en"], { type: "region" }) : null;
  const countryName = (code) => code === "ZZ" ? "Unknown" : (names?.of(code) || code);
  const ns = "http://www.w3.org/2000/svg";
  let api;
  try {
    api = new URL(root.dataset.api);
    if (api.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(api.hostname)) throw new Error();
    api = api.href.replace(/\/$/, "");
  } catch {
    status.textContent = "Visitor statistics are temporarily unavailable.";
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
    root.querySelector("[data-visits]").textContent = number.format(data.visits);
    root.querySelector("[data-countries]").textContent = number.format(data.country_count);
    const points = root.querySelector("[data-visitor-points]");
    points.replaceChildren();
    // Smaller markers are painted last so they remain visible near busy locations.
    data.locations.slice().sort((a, b) => b.visits - a.visits).forEach((location) => {
      const point = document.createElementNS(ns, "g");
      point.setAttribute("transform", `translate(${(location.longitude + 180) * 2},${(90 - location.latitude) * 2})`);
      const title = document.createElementNS(ns, "title");
      title.textContent = `${countryName(location.country)}: ${number.format(location.visits)} visits (approximate location)`;
      const circle = document.createElementNS(ns, "circle");
      circle.setAttribute("r", Math.min(18, 9 + Math.log10(location.visits + 1) * 3));
      const text = document.createElementNS(ns, "text");
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("dy", ".35em");
      text.textContent = compact.format(location.visits);
      point.append(title, circle, text);
      points.append(point);
    });
    const rows = root.querySelector("[data-country-rows]");
    rows.replaceChildren();
    data.countries.forEach((country) => {
      const row = document.createElement("tr");
      const label = document.createElement("th");
      label.scope = "row";
      label.textContent = countryName(country.country);
      const count = document.createElement("td");
      count.textContent = number.format(country.visits);
      row.append(label, count);
      rows.append(row);
    });
    root.querySelector("[data-country-table]").hidden = data.countries.length === 0;
    const since = data.started_at ? new Date(data.started_at) : null;
    status.textContent = data.visits === 0 ? "No visits recorded yet."
      : since && Number.isFinite(since.getTime())
        ? `Visitors since ${since.toLocaleDateString("en", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" })}. Updates may take a minute.`
        : "Updates may take a minute.";
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
      status.textContent = "Visitor statistics are temporarily unavailable. Please try again later.";
    }
  }
  load();
})();
