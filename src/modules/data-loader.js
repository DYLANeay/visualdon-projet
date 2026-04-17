import * as d3 from 'd3';

export async function loadAllData() {
  const [geoEurope, geoEurope1900, electionsRaw, nopasaran] = await Promise.all([
    d3.json('/data/geo-map/europe/CShapes-Europe.geojson'),
    d3.json('/data/geo-map/europe/CShapes-Europe-1900.geojson'),
    d3.json('/data/elections/elections.json'),
    d3.json('/data/nopasaran/data.json'),
  ]);

  const elections = electionsRaw.elections;

  return { geoEurope, geoEurope1900, elections, nopasaran };
}
