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
  'Russia (Soviet Union)': 'RU',
  Russia: 'RU',
  'Belarus (Byelorussia)': 'BY',
  Belarus: 'BY',
  'Turkey (Ottoman Empire)': 'TR',
  Turkey: 'TR',
  Azerbaijan: 'AZ',
  Georgia: 'GE',
  Kazakhstan: 'KZ',
  Andorra: 'AD',
  Liechtenstein: 'LI',
  Monaco: 'MC',
  'San Marino': 'SM',
  Tunisia: 'TN',
  Yugoslavia: 'YU',
};

let _svg = null;
let _path = null;
let _geoData = null;
let _elections = null;
let _container = null;
// Track focus by stable country Id only. The data-binding key uses the
// Id_From composite (see line ~220) so enter/update/exit handles boundary
// changes correctly, but focus must survive year scrolls where the same
// country appears with a different "From" — comparing the composite would
// silently lose focus mid-interaction.
let _focusedCountryId = null;

// Le CShapes GeoJSON s'arrête en 2023 ; au-delà, on clampe pour garder les dernières frontières.
const GEO_MAX_YEAR = 2023;

function getFeaturesForYear(year) {
  const y = Math.min(year, GEO_MAX_YEAR);
  return _geoData.geoEurope.features.filter(
    (f) => f.properties.From <= y && f.properties.To >= y,
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
    if (
      election &&
      election.vote_pct !== null &&
      election.vote_pct !== undefined
    ) {
      total += election.vote_pct;
      hasValid = true;
    }
  }
  return hasValid ? total : null;
}

function _getNoDataColor() {
  return (
    getComputedStyle(document.documentElement)
      .getPropertyValue('--bg-elevated')
      .trim() || '#e8e8e8'
  );
}

function _isDarkMode() {
  return document.documentElement.classList.contains('dark');
}

function _getStrokeColor() {
  // In dark mode, use a dark stroke for visibility; in light mode use a light stroke
  if (_isDarkMode()) {
    return '#2a2a2a'; // dark gray for dark backgrounds
  }
  return (
    getComputedStyle(document.documentElement)
      .getPropertyValue('--border-strong')
      .trim() || '#1a1a1a'
  );
}

function _getFocusStrokeColor() {
  // In dark mode, use a lighter stroke for focus; in light mode use darker stroke
  if (_isDarkMode()) {
    return '#ffffff'; // white focus stroke on dark mode
  }
  return (
    getComputedStyle(document.documentElement)
      .getPropertyValue('--text-secondary')
      .trim() || '#4a4a4a'
  );
}

function _stylePathForFocus(pathSelection) {
  pathSelection
    .attr('stroke', (d) =>
      _focusedCountryId !== null && d.properties.Id === _focusedCountryId
        ? _getFocusStrokeColor()
        : _getStrokeColor(),
    )
    .attr('stroke-width', (d) =>
      _focusedCountryId !== null && d.properties.Id === _focusedCountryId
        ? 2
        : 0.78,
    )
    .attr('opacity', (d) => {
      if (_focusedCountryId === null) return 1;
      return d.properties.Id === _focusedCountryId ? 1 : 0.15;
    });
}

function getFillColor(feature) {
  const iso2 = NAME_TO_ISO2[feature.properties.Name];
  if (!iso2) return _getNoDataColor();
  const share = computeFarRightShare(iso2, _currentYear);
  return share !== null ? colorScale(share) : _getNoDataColor();
}

let _currentYear = 1900;

function _handleClick(_event, feature) {
  if (!_onCountryClick) return;
  const iso2 = NAME_TO_ISO2[feature.properties.Name] || null;
  _onCountryClick(iso2, feature);
}

const MAP_WIDTH = 900;
const MAP_HEIGHT = 560;

let _onCountryClick = null;

export function initEuropeMap(container, geoData, elections, onCountryClick) {
  _container = container;
  _geoData = geoData;
  _elections = elections;
  _onCountryClick = onCountryClick;

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

  const projection = d3
    .geoEqualEarth()
    .fitSize([MAP_WIDTH, MAP_HEIGHT], geojson);
  _path = d3.geoPath().projection(projection);

  g.selectAll('path')
    .data(features, (d) => `${d.properties.Id}_${d.properties.From}`)
    .join('path')
    .attr('d', _path)
    .attr('fill', _getNoDataColor())
    .attr('stroke', _getStrokeColor())
    .attr('stroke-width', 0.78)
    .attr('data-iso2', (d) => NAME_TO_ISO2[d.properties.Name] || '')
    .style('cursor', 'pointer')
    .on('click', _handleClick);

  _addLegend(container);

  // Pre-warm every hot path the first zoom will hit. In dev mode, Vite
  // compiles d3 submodules lazily on first use; without this, the first
  // click pays a 300-500ms cold-start cost (transform tween, opacity tween,
  // ease function, path.bounds). We run the same code paths now, with
  // duration=1 + ease=linear so nothing is visually perceptible.
  for (const f of features) _path.bounds(f);
  g.attr('transform', 'translate(0,0) scale(1)');
  g.transition()
    .duration(1)
    .ease(d3.easeCubicInOut)
    .attrTween('transform', function () {
      return d3.interpolateTransformSvg(
        'translate(0,0) scale(1)',
        'translate(0,0) scale(1)',
      );
    })
    .on('end', function () {
      d3.select(this).attr('transform', null);
    });
  g.selectAll('path')
    .transition()
    .duration(1)
    .ease(d3.easeCubicInOut)
    .attr('opacity', 1);
}

export function updateEuropeMap(year) {
  _currentYear = year;
  if (!_svg) return;

  const features = getFeaturesForYear(year);
  const geojson = { type: 'FeatureCollection', features };

  const projection = d3
    .geoEqualEarth()
    .fitSize([MAP_WIDTH, MAP_HEIGHT], geojson);
  _path = d3.geoPath().projection(projection);

  const g = _svg.select('.map-group');
  const t = d3.transition().duration(80);

  g.selectAll('path')
    .data(features, (d) => `${d.properties.Id}_${d.properties.From}`)
    .join(
      (enter) =>
        enter
          .append('path')
          .attr('d', _path)
          .attr('fill', getFillColor)
          .attr('stroke', _getStrokeColor())
          .attr('stroke-width', 0.78)
          .attr('data-iso2', (d) => NAME_TO_ISO2[d.properties.Name] || '')
          .style('cursor', 'pointer')
          .on('click', _handleClick),
      (update) =>
        update
          .transition(t)
          .attr('d', _path)
          .attr('fill', getFillColor)
          .attr('stroke', _getStrokeColor())
          .attr('stroke-width', 0.78),
      (exit) => exit.remove(),
    );

  _stylePathForFocus(g.selectAll('path'));
}

export function zoomToFeature(feature, { duration = 650 } = {}) {
  if (!_svg || !_path) return Promise.resolve();
  const [[x0, y0], [x1, y1]] = _path.bounds(feature);
  const dx = Math.max(1, x1 - x0);
  const dy = Math.max(1, y1 - y0);
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  // Reserve ~40% of width for the side panel, so center country in the remaining area.
  const PANEL_RATIO = 0.4;
  const availW = MAP_WIDTH * (1 - PANEL_RATIO);
  const availH = MAP_HEIGHT * 0.75;
  const scale = Math.min(3.5, 0.85 / Math.max(dx / availW, dy / availH));
  // Target center: shift right of the panel
  const targetX = MAP_WIDTH * PANEL_RATIO + availW / 2;
  const targetY = MAP_HEIGHT / 2;
  const tx = targetX - scale * cx;
  const ty = targetY - scale * cy;

  const g = _svg.select('.map-group');
  _focusedCountryId = feature.properties.Id;

  const paths = g.selectAll('path')
    .transition()
    .duration(duration)
    .ease(d3.easeCubicInOut);
  _stylePathForFocus(paths);

  return new Promise((resolve) => {
    g.transition()
      .duration(duration)
      .ease(d3.easeCubicInOut)
      .attr('transform', `translate(${tx},${ty}) scale(${scale})`)
      .on('end', () => resolve());
  });
}

export function resetZoom({ duration = 650 } = {}) {
  if (!_svg) return;
  _focusedCountryId = null;
  const g = _svg.select('.map-group');
  const paths = g.selectAll('path')
    .transition()
    .duration(duration)
    .ease(d3.easeCubicInOut);
  _stylePathForFocus(paths);
  g.transition()
    .duration(duration)
    .ease(d3.easeCubicInOut)
    .attrTween('transform', function () {
      const from = this.getAttribute('transform') || 'translate(0,0) scale(1)';
      return d3.interpolateTransformSvg(from, 'translate(0,0) scale(1)');
    })
    .on('end', function () {
      d3.select(this).attr('transform', null);
    });
}

export function refreshEuropeMapTheme() {
  if (!_svg) return;
  const g = _svg.select('.map-group');
  const paths = g.selectAll('path');
  paths.attr('fill', getFillColor);
  _stylePathForFocus(paths);

  if (_container) {
    const legend = _container.querySelector('.legend-svg');
    if (legend) legend.remove();
    _addLegend(_container);
  }
}

function _addLegend(container) {
  const legendWidth = 160;
  const legendHeight = 12;
  const margin = { left: 16, bottom: 48 };
  const innerLeft = 8;
  const labelsY = 46;

  const svg = d3
    .select(container)
    .append('svg')
    .attr('class', 'legend-svg')
    .style('position', 'absolute')
    .style('bottom', `${margin.bottom}px`)
    .style('left', `${margin.left}px`)
    .style('pointer-events', 'none')
    .attr('width', legendWidth + 60)
    .attr('height', legendHeight + 36);

  const textColor = () =>
    getComputedStyle(document.documentElement)
      .getPropertyValue('--text-secondary')
      .trim() || '#4A4A4A';

  svg
    .append('text')
    .attr('x', innerLeft)
    .attr('y', 12)
    .attr('font-size', '11px')
    .attr('fill', textColor())
    .text('% d\'extrême droite des votes');

  const defs = svg.append('defs');
  const linearGradient = defs.append('linearGradient')
    .attr('id', 'europe-legend-gradient')
    .attr('x1', '0%')
    .attr('y1', '0%')
    .attr('x2', '100%')
    .attr('y2', '0%');
    
  d3.range(0, 1.01, 0.1).forEach(t => {
    linearGradient.append('stop')
      .attr('offset', `${t * 100}%`)
      .attr('stop-color', d3.interpolateReds(t));
  });

  svg
    .append('rect')
    .attr('x', innerLeft)
    .attr('y', 18)
    .attr('width', legendWidth)
    .attr('height', legendHeight)
    .attr('fill', 'url(#europe-legend-gradient)')
    .attr('rx', 2);

  const labelPositions = [0, 20, 40, 60, 80, 100];
  labelPositions.forEach((val, i) => {
    svg
      .append('text')
      .attr('x', innerLeft + (val / 100) * legendWidth)
      .attr('y', labelsY)
      .attr(
        'text-anchor',
        i === 0 ? 'start' : i === labelPositions.length - 1 ? 'end' : 'middle',
      )
      .attr('font-size', '9px')
      .attr('fill', textColor())
      .text(val);
  });
}

