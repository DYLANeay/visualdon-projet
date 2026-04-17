import * as d3 from 'd3';
import { colorScale } from './scales.js';

const NAME_TO_ISO2 = {
  Sweden: 'SE',
  Norway: 'NO',
  Denmark: 'DK',
  Finland: 'FI',
  Iceland: 'IS',
  Belgium: 'BE',
  Netherlands: 'NL',
  Luxembourg: 'LU',
  France: 'FR',
  Italy: 'IT',
  'Italy/Sardinia': 'IT',
  Spain: 'ES',
  Greece: 'GR',
  Portugal: 'PT',
  Germany: 'DE',
  Austria: 'AT',
  Switzerland: 'CH',
  Cyprus: 'CY',
  Malta: 'MT',
  'United Kingdom': 'GB',
  Ireland: 'IE',
  Poland: 'PL',
  'Czech Republic': 'CZ',
  Slovakia: 'SK',
  Hungary: 'HU',
  Romania: 'RO',
  Bulgaria: 'BG',
  Estonia: 'EE',
  Latvia: 'LV',
  Lithuania: 'LT',
  Croatia: 'HR',
  Slovenia: 'SI',
  Serbia: 'RS',
  Ukraine: 'UA',
  Albania: 'AL',
  Macedonia: 'MK',
  'North Macedonia': 'MK',
  'Macedonia (FYROM/North Macedonia)': 'MK',
  Rumania: 'RO',
  'German Federal Republic': 'DE',
  'Germany (Prussia)': 'DE',
  // German Democratic Republic (1945-1989) : non mappée — régime communiste,
  // pas couvert par Manifesto/ParlGov, reste gris pendant la Guerre froide.
  'Bosnia-Herzegovina': 'BA',
  Bosnia: 'BA',
  Montenegro: 'ME',
  Moldova: 'MD',
};

let _svg = null;
let _path = null;
let _geoData = null;
let _elections = null;
let _container = null;

function getFeaturesForYear(year) {
  return _geoData.geoEurope.features.filter(
    (f) => f.properties.From <= year && f.properties.To >= year,
  );
}

function computeFarRightShare(iso2, year) {
  const country = _elections[iso2];
  if (!country) return null;

  const farRightParties = Object.values(country.parties).filter(
    (p) => p.family_code === '70',
  );
  if (farRightParties.length === 0) return null;

  const allElectionYears = [
    ...new Set(farRightParties.flatMap((p) => p.elections.map((e) => e.year))),
  ]
    .filter((y) => y <= year)
    .sort((a, b) => b - a);

  if (allElectionYears.length === 0) return null;

  const nearestYear = allElectionYears[0];
  let total = 0;
  let hasValid = false;
  for (const party of farRightParties) {
    const election = party.elections.find((e) => e.year === nearestYear);
    if (election && election.vote_pct !== null && election.vote_pct !== undefined) {
      total += election.vote_pct;
      hasValid = true;
    }
  }
  return hasValid ? total : null;
}

function getFillColor(feature) {
  const iso2 = NAME_TO_ISO2[feature.properties.Name];
  if (!iso2) return '#e8e8e8';
  const share = computeFarRightShare(iso2, _currentYear);
  return share !== null ? colorScale(share) : '#e8e8e8';
}

let _currentYear = 1900;

const MAP_WIDTH = 900;
const MAP_HEIGHT = 560;

export function initEuropeMap(container, geoData, elections) {
  _container = container;
  _geoData = geoData;
  _elections = elections;

  _svg = d3
    .select(container)
    .append('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', `0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`)
    .attr('preserveAspectRatio', 'xMidYMid meet');

  const g = _svg.append('g').attr('class', 'map-group');

  const features = getFeaturesForYear(1900);
  const geojson = { type: 'FeatureCollection', features };

  const projection = d3.geoEqualEarth().fitSize([MAP_WIDTH, MAP_HEIGHT], geojson);
  _path = d3.geoPath().projection(projection);

  g.selectAll('path')
    .data(features, (d) => `${d.properties.Id}_${d.properties.From}`)
    .join('path')
    .attr('d', _path)
    .attr('fill', '#e8e8e8')
    .attr('stroke', '#999')
    .attr('stroke-width', 0.5);

  _addLegend(container);
}

export function updateEuropeMap(year) {
  _currentYear = year;
  if (!_svg) return;

  const features = getFeaturesForYear(year);
  const geojson = { type: 'FeatureCollection', features };

  const projection = d3.geoEqualEarth().fitSize([MAP_WIDTH, MAP_HEIGHT], geojson);
  _path = d3.geoPath().projection(projection);

  const g = _svg.select('.map-group');
  const t = d3.transition().duration(400);

  g.selectAll('path')
    .data(features, (d) => `${d.properties.Id}_${d.properties.From}`)
    .join(
      (enter) =>
        enter
          .append('path')
          .attr('d', _path)
          .attr('fill', getFillColor)
          .attr('stroke', '#999')
          .attr('stroke-width', 0.5),
      (update) =>
        update
          .transition(t)
          .attr('d', _path)
          .attr('fill', getFillColor),
      (exit) => exit.remove(),
    );
}

function _addLegend(container) {
  const legendWidth = 160;
  const legendHeight = 12;
  const margin = { left: 16, bottom: 48 };

  const svg = d3
    .select(container.closest('section') || container.parentElement)
    .append('svg')
    .attr('class', 'legend-svg')
    .style('position', 'absolute')
    .style('bottom', `${margin.bottom}px`)
    .style('left', `${margin.left}px`)
    .attr('width', legendWidth + 40)
    .attr('height', legendHeight + 36);

  svg
    .append('text')
    .attr('x', 0)
    .attr('y', 12)
    .attr('font-size', '12px')
    .attr('fill', '#333')
    .text('Échelle (%)');

  const thresholds = [0, 5, 10, 15, 20, 30];
  const colors = ['#e8e8e8', '#fee5d9', '#fcbba1', '#fc9272', '#fb6a4a', '#de2d26', '#a50f15'];
  const stepWidth = legendWidth / colors.length;

  colors.forEach((color, i) => {
    svg
      .append('rect')
      .attr('x', i * stepWidth)
      .attr('y', 18)
      .attr('width', stepWidth)
      .attr('height', legendHeight)
      .attr('fill', color);
  });

  const labelPositions = [0, 5, 10, 15, 20, 30];
  labelPositions.forEach((val, i) => {
    svg
      .append('text')
      .attr('x', (i / colors.length) * legendWidth + stepWidth)
      .attr('y', 44)
      .attr('text-anchor', 'middle')
      .attr('font-size', '9px')
      .attr('fill', '#666')
      .text(val);
  });
}
