import { readFileSync, writeFileSync } from "node:fs";
import { geoEquirectangular, geoPath } from "d3-geo";
import { feature } from "topojson-client";

// Input: world-atlas@2.0.2/land-110m.json (Natural Earth, public domain).
const topology = JSON.parse(readFileSync(process.argv[2], "utf8"));
// D3 clips polygons at the antimeridian so land edges do not span the whole map.
// This projection matches the visitor markers: x = 2 * (lon + 180), y = 2 * (90 - lat).
const projection = geoEquirectangular().translate([360, 180]).scale(360 / Math.PI);
const path = geoPath(projection)(feature(topology, topology.objects.land));
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 360"><title>World land outline</title><path fill="#d5dfe7" stroke="#b5c5d1" stroke-width="0.35" fill-rule="evenodd" d="${path}"/></svg>\n`;
writeFileSync(new URL("../../assets/geo/world-land.svg", import.meta.url), svg);
console.log(`Built world-land.svg (${Buffer.byteLength(svg)} bytes)`);
