import * as d3 from 'd3';
import { colorScale } from './scales.js';

let _svg = null;
let _path = null;
let _geo = null;
let _cantonsElections = null;
let _onCantonClick = null;
let _currentYear = 1999;
let _isCantonZoomed = false;

const MAP_WIDTH = 900;
const MAP_HEIGHT = 560;

// Semi-transparent so the big year watermark is visible through the cantons.
const FILL_OPACITY = 0.82;

export function initSwitzerlandMap(container, geoCantons, cantonsElections, onCantonClick) {
  _geo = geoCantons;
  _cantonsElections = cantonsElections;
  _onCantonClick = onCantonClick;

  _svg = d3
    .select(container)
    .append('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', `0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`)
    .attr('preserveAspectRatio', 'xMidYMid meet');

  const g = _svg.append('g').attr('class', 'cantons-group');

  const projection = d3.geoMercator().fitSize([MAP_WIDTH, MAP_HEIGHT], geoCantons);
  _path = d3.geoPath().projection(projection);

  g.selectAll('path')
    .data(geoCantons.features, (d) => d.properties.kantonsnummer)
    .join('path')
    .attr('d', _path)
    .attr('fill', (d) => _getCantonFill(d, _currentYear))
    .attr('fill-opacity', FILL_OPACITY)
    .attr('stroke', '#374151')
    .attr('stroke-width', 0.7)
    .attr('data-canton', (d) => d.properties.name)
    .style('cursor', 'pointer')
    .on('mouseenter', function (event, d) {
      const base = _getCantonFill(d, _currentYear);
      d3.select(this).attr('data-fill', base).attr('fill', d3.color(base).darker(0.4));
    })
    .on('mouseleave', function () {
      const saved = d3.select(this).attr('data-fill');
      if (saved) d3.select(this).attr('fill', saved);
    })
    .on('click', _handleClick);
}

function _handleClick(_event, feature) {
  if (!_onCantonClick) return;
  _onCantonClick(feature);
}

// Returns the far-right seat share (%) for a canton at or before `year`.
// Uses the most recent election <= year (same pattern as europe-map.js computeFarRightShare).
function _computeFarRightShare(kantonsnummer, year) {
  if (!_cantonsElections) return null;
  const canton = _cantonsElections.cantons[String(kantonsnummer)];
  if (!canton) return null;

  const elections = canton.elections.filter((e) => e.year <= year);
  if (elections.length === 0) return null;

  const nearest = elections[elections.length - 1];
  return nearest.far_right_pct;
}

function _getCantonFill(feature, year) {
  const share = _computeFarRightShare(feature.properties.kantonsnummer, year);
  return share !== null ? colorScale(share) : '#e8e8e8';
}

export function updateSwitzerlandMap(year) {
  _currentYear = year;
  if (!_svg) return;

  // Named transition 't-fill' so it never cancels the zoom transition 't-zoom'.
  _svg
    .select('.cantons-group')
    .selectAll('path')
    .transition('t-fill')
    .duration(80)
    .attr('fill', (d) => _getCantonFill(d, year));
}

export function zoomToCanton(feature, { duration = 650 } = {}) {
  if (!_svg || !_path) return;
  _isCantonZoomed = true;
  const [[x0, y0], [x1, y1]] = _path.bounds(feature);
  const dx = Math.max(1, x1 - x0);
  const dy = Math.max(1, y1 - y0);
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const PANEL_RATIO = 0.35;
  const availW = MAP_WIDTH * (1 - PANEL_RATIO);
  const availH = MAP_HEIGHT * 0.75;
  const scale = Math.min(5, 0.85 / Math.max(dx / availW, dy / availH));
  const targetX = MAP_WIDTH * PANEL_RATIO + availW / 2;
  const targetY = MAP_HEIGHT / 2;
  const tx = targetX - scale * cx;
  const ty = targetY - scale * cy;

  const g = _svg.select('.cantons-group');

  // Named transition 't-zoom' so fill updates don't cancel it.
  g.selectAll('path')
    .transition('t-zoom')
    .duration(duration)
    .ease(d3.easeCubicInOut)
    .attr('opacity', (d) =>
      d.properties.kantonsnummer === feature.properties.kantonsnummer ? 1 : 0.15,
    );

  g.transition('t-zoom-group')
    .duration(duration)
    .ease(d3.easeCubicInOut)
    .attr('transform', `translate(${tx},${ty}) scale(${scale})`);
}

export function resetCantonZoom({ duration = 650 } = {}) {
  if (!_svg || !_isCantonZoomed) return;
  _isCantonZoomed = false;
  const g = _svg.select('.cantons-group');

  g.selectAll('path')
    .transition('t-zoom')
    .duration(duration)
    .ease(d3.easeCubicInOut)
    .attr('opacity', 1);

  g.transition('t-zoom-group')
    .duration(duration)
    .ease(d3.easeCubicInOut)
    .attrTween('transform', function () {
      const from = this.getAttribute('transform') || 'translate(0,0) scale(1)';
      return d3.interpolateTransformSvg(from, 'translate(0,0) scale(1)');
    })
    .on('end', function () {
      this.removeAttribute('transform');
    });
}

