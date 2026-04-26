import * as d3 from 'd3';

export async function loadAllData() {
  const [geoEurope, geoEurope1900, geoSwissCantons, electionsRaw, nopasaran, cantonsElections] =
    await Promise.all([
      d3.json('/data/geo-map/europe/CShapes-Europe.geojson'),
      d3.json('/data/geo-map/europe/CShapes-Europe-1900.geojson'),
      d3.json('/data/geo-map/switzerland/cantons.geojson'),
      d3.json('/data/elections/elections.json'),
      d3.json('/data/nopasaran/data.json'),
      d3.json('/data/cantons-elections/cantons-elections.json'),
    ]);

  const elections = electionsRaw.elections;

  return { geoEurope, geoEurope1900, geoSwissCantons, elections, nopasaran, cantonsElections };
}
