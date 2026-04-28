import * as d3 from 'd3';

export async function loadEuropeData() {
  const [geoEurope, geoEurope1900, electionsRaw, wikipediaEvents] =
    await Promise.all([
      d3.json('/data/geo-map/europe/CShapes-Europe.geojson'),
      d3.json('/data/geo-map/europe/CShapes-Europe-1900.geojson'),
      d3.json('/data/elections/elections.json'),
      d3.json('/data/wikipedia/events.json').catch(() => null),
    ]);

  const elections = electionsRaw.elections;

  return {
    geoEurope,
    geoEurope1900,
    elections,
    wikipediaEvents,
  };
}

export async function loadSwitzerlandData() {
  const [geoSwissCantons, nopasaran, cantonsElections] = await Promise.all([
    d3.json('/data/geo-map/switzerland/cantons.geojson'),
    d3.json('/data/nopasaran/data.json'),
    d3.json('/data/cantons-elections/cantons-elections.json'),
  ]);

  return {
    geoSwissCantons,
    nopasaran,
    cantonsElections,
  };
}

export async function loadAllData() {
  const [europe, switzerland] = await Promise.all([
    loadEuropeData(),
    loadSwitzerlandData(),
  ]);

  return {
    ...europe,
    ...switzerland,
  };
}
