import { readFileSync, writeFileSync } from "node:fs";

// Input: world-atlas@2.0.2/land-110m.json (Natural Earth, public domain).
const topology = JSON.parse(readFileSync(process.argv[2], "utf8"));
const { scale, translate } = topology.transform;
const arcs = topology.arcs.map((arc) => {
  let x = 0, y = 0;
  return arc.map(([dx, dy]) => {
    x += dx; y += dy;
    return [x * scale[0] + translate[0], y * scale[1] + translate[1]];
  });
});
function ring(indices) {
  return indices.flatMap((index, i) => {
    const points = index < 0 ? arcs[~index].slice().reverse() : arcs[index];
    return i ? points.slice(1) : points;
  }).map(([longitude, latitude], i) => `${i ? "L" : "M"}${((longitude + 180) * 2).toFixed(2)},${((90 - latitude) * 2).toFixed(2)}`).join("") + "Z";
}
const land = topology.objects.land;
const geometries = land.type === "GeometryCollection" ? land.geometries : [land];
const path = geometries.flatMap((geometry) => {
  if (geometry.type === "Polygon") return geometry.arcs.map(ring);
  if (geometry.type === "MultiPolygon") return geometry.arcs.flatMap((polygon) => polygon.map(ring));
  throw new Error("Expected polygon land topology");
}).join("");
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 360"><title>World land outline</title><path fill="#d5dfe7" stroke="#b5c5d1" stroke-width="0.35" fill-rule="evenodd" d="${path}"/></svg>\n`;
writeFileSync(new URL("../../assets/geo/world-land.svg", import.meta.url), svg);
console.log(`Built world-land.svg (${Buffer.byteLength(svg)} bytes)`);
