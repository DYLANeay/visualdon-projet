import * as d3 from 'd3';
import { computeFamilyShares } from './swiss-families.js';

let _svg = null;
let _path = null;
let _geo = null;
let _cantonsElections = null;
let _onCantonClick = null;
let _currentYear = 1999;
let _isCantonZoomed = false;
let _focusedKantonsnummer = null;
let _barsG = null;
let _cantonRows = [];

const MAP_WIDTH = 900;
const MAP_HEIGHT = 560;

const FILL_OPACITY = 0.82;
const BAR_WIDTH = 56;
const BAR_HEIGHT = 12;
const BAR_BORDER = 0.6;
const BASE_STROKE_WIDTH = 0.95;
const FOCUS_STROKE_WIDTH = 2.1;

// Manual centroid offsets for cantons whose computed centroid overlaps badly.
// kantonsnummer -> { dx, dy } in SVG units
const CENTROID_OVERRIDES = {
  16: { dx: 6, dy: 6 }, // Appenzell Innerrhoden - shift away from AR
};

export function initSwitzerlandMap(
  container,
  geoCantons,
  cantonsElections,
  onCantonClick,
) {
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

  const projection = d3
    .geoMercator()
    .fitSize([MAP_WIDTH, MAP_HEIGHT], geoCantons);
  _path = d3.geoPath().projection(projection);

  g.selectAll('path')
    .data(geoCantons.features, (d) => d.properties.kantonsnummer)
    .join('path')
    .attr('d', _path)
    .style('fill', 'var(--bg-elevated)')
    .style('fill-opacity', FILL_OPACITY)
    .attr('stroke', _getStrokeColor())
    .attr('stroke-width', BASE_STROKE_WIDTH)
    .attr('data-canton', (d) => d.properties.name)
    .attr('data-canton-id', (d) => d.properties.kantonsnummer)
    .style('cursor', 'pointer')
    .on('mouseenter', function () {
      d3.select(this).style('fill', 'var(--bg-surface)');
    })
    .on('mouseleave', function () {
      d3.select(this).style('fill', 'var(--bg-elevated)');
    })
    .on('click', _handleClick);

  // Compute centroid rows once
  _cantonRows = geoCantons.features
    .map((f) => {
      const [cx, cy] = _path.centroid(f);
      if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null;
      const kn = f.properties.kantonsnummer;
      const override = CENTROID_OVERRIDES[kn] || { dx: 0, dy: 0 };
      return {
        feature: f,
        cx: cx + override.dx,
        cy: cy + override.dy,
        kantonsnummer: kn,
      };
    })
    .filter(Boolean);

  // Bars sit above the canton paths in DOM order. They are decorative —
  // clicks should fall through to the canton beneath, especially when
  // zoomed in (the focused canton's bar grows ~5× and would otherwise
  // block clicks on neighbouring cantons).
  _barsG = _svg
    .append('g')
    .attr('class', 'cantons-bars-group')
    .style('pointer-events', 'none');

  const bars = _barsG
    .selectAll('g.canton-bar')
    .data(_cantonRows, (d) => d.kantonsnummer)
    .join('g')
    .attr('class', 'canton-bar')
    .attr('data-canton-id', (d) => d.kantonsnummer)
    .attr(
      'transform',
      (d) => `translate(${d.cx - BAR_WIDTH / 2}, ${d.cy - BAR_HEIGHT / 2})`,
    );

  bars
    .append('rect')
    .attr('class', 'canton-bar-bg')
    .attr('width', BAR_WIDTH)
    .attr('height', BAR_HEIGHT)
    .style('fill', 'var(--bg-surface)')
    .style('stroke', 'var(--border-strong)')
    .attr('stroke-width', BAR_BORDER);

  bars.append('g').attr('class', 'canton-bar-segments');

  _renderBars(_currentYear);
}

function _handleClick(_event, feature) {
  if (!_onCantonClick) return;
  _onCantonClick(feature);
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
      .getPropertyValue('--text-primary')
      .trim() || '#0a0a0a'
  );
}

// Stroke color and width must be applied INSTANTLY, not tweened. SVG stroke
// color is CPU-rendered (no GPU acceleration), so animating it across all 26
// canton paths over 650ms forced a per-frame repaint chain that made the
// canton-click feel laggy. Opacity is the only thing that tweens — and it
// composites on the GPU.
function _applyStaticPathStyle(pathSelection) {
  pathSelection
    .attr('stroke', (d) =>
      _focusedKantonsnummer !== null &&
      d.properties.kantonsnummer === _focusedKantonsnummer
        ? _getFocusStrokeColor()
        : _getStrokeColor(),
    )
    .attr('stroke-width', (d) =>
      _focusedKantonsnummer !== null &&
      d.properties.kantonsnummer === _focusedKantonsnummer
        ? FOCUS_STROKE_WIDTH
        : BASE_STROKE_WIDTH,
    );
}

function _pathOpacity(d) {
  if (_focusedKantonsnummer === null) return 1;
  return d.properties.kantonsnummer === _focusedKantonsnummer ? 1 : 0.15;
}

function _renderBars(year) {
  if (!_barsG || !_cantonsElections) return;

  _barsG.selectAll('g.canton-bar').each(function (d) {
    const canton = _cantonsElections.cantons[String(d.kantonsnummer)];
    const shares = computeFamilyShares(canton, year);

    // Pre-compute x offsets before binding to d3
    let xOffset = 0;
    const segments = shares.map((f) => {
      const w = (f.share / 100) * BAR_WIDTH;
      const seg = { ...f, x: xOffset, w };
      xOffset += w;
      return seg;
    });

    d3.select(this)
      .select('.canton-bar-segments')
      .selectAll('rect.fam-seg')
      .data(segments, (f) => f.id)
      .join('rect')
      .attr('class', (f) => `fam-seg fam-${f.id}`)
      .attr('y', 0)
      .attr('height', BAR_HEIGHT)
      .attr('fill', (f) => f.color)
      .transition('t-rect')
      .duration(450)
      .ease(d3.easeCubicInOut)
      .attr('x', (f) => f.x)
      .attr('width', (f) => f.w);
  });
}

export function updateSwitzerlandMap(year) {
  _currentYear = year;
  if (!_svg) return;
  _renderBars(year);

  const g = _svg.select('.cantons-group');
  const paths = g.selectAll('path');
  _applyStaticPathStyle(paths);
  paths.attr('opacity', _pathOpacity);
}

export function zoomToCanton(feature, { duration = 650 } = {}) {
  if (!_svg || !_path) return;
  _isCantonZoomed = true;
  _focusedKantonsnummer = feature.properties.kantonsnummer;

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
  g.interrupt('t-zoom-group');
  g.selectAll('path').interrupt('t-zoom');

  // Snap stroke + width immediately; only tween opacity (GPU-cheap).
  _applyStaticPathStyle(g.selectAll('path'));
  g.selectAll('path')
    .transition('t-zoom')
    .duration(duration)
    .ease(d3.easeCubicInOut)
    .attr('opacity', _pathOpacity);

  if (_barsG) {
    _barsG.interrupt('t-zoom-bars-group');
    _barsG.selectAll('g.canton-bar').interrupt('t-zoom-bars');
    _barsG
      .selectAll('g.canton-bar')
      .transition('t-zoom-bars')
      .duration(duration)
      .ease(d3.easeCubicInOut)
      .attr('opacity', (d) =>
        d.kantonsnummer === feature.properties.kantonsnummer ? 1 : 0.15,
      );

    _barsG
      .transition('t-zoom-bars-group')
      .duration(duration)
      .ease(d3.easeCubicInOut)
      .attr('transform', `translate(${tx},${ty}) scale(${scale})`);
  }

  g.transition('t-zoom-group')
    .duration(duration)
    .ease(d3.easeCubicInOut)
    .attr('transform', `translate(${tx},${ty}) scale(${scale})`);
}

export function resetCantonZoom({ duration = 650 } = {}) {
  if (!_svg) return;
  _isCantonZoomed = false;
  _focusedKantonsnummer = null;

  const g = _svg.select('.cantons-group');
  g.interrupt('t-zoom-group');
  g.selectAll('path').interrupt('t-zoom');

  // Snap stroke + width immediately; only tween opacity back to 1.
  _applyStaticPathStyle(g.selectAll('path'));
  g.selectAll('path')
    .transition('t-zoom')
    .duration(duration)
    .ease(d3.easeCubicInOut)
    .attr('opacity', _pathOpacity);

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

  if (_barsG) {
    _barsG.interrupt('t-zoom-bars-group');
    _barsG.selectAll('g.canton-bar').interrupt('t-zoom-bars');

    _barsG
      .selectAll('g.canton-bar')
      .transition('t-zoom-bars')
      .duration(duration)
      .ease(d3.easeCubicInOut)
      .attr('opacity', 1);

    _barsG
      .transition('t-zoom-bars-group')
      .duration(duration)
      .ease(d3.easeCubicInOut)
      .attrTween('transform', function () {
        const from =
          this.getAttribute('transform') || 'translate(0,0) scale(1)';
        return d3.interpolateTransformSvg(from, 'translate(0,0) scale(1)');
      })
      .on('end', function () {
        this.removeAttribute('transform');
      });
  }
}

export function refreshSwitzerlandMapTheme() {
  if (!_svg) return;
  const g = _svg.select('.cantons-group');
  const paths = g.selectAll('path');
  _applyStaticPathStyle(paths);
  paths.attr('opacity', _pathOpacity);
}
