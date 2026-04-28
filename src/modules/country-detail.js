import * as d3 from 'd3';
import { TOP_N, FAR_RIGHT_CODE, FAMILY_META } from './family-meta.js';

const TREND_WIDTH = 280;
const TREND_HEIGHT = 130;
const TREND_MARGIN = { top: 12, right: 8, bottom: 20, left: 28 };
const MAX_TREND_EVENT_POINTS = 16;
const TREND_TILE_WINDOW = 5;

const TREND_TILE_BADGE = {
  'far-right': { text: 'Extrême Droite', tone: 'red' },
  'swiss-far-right': { text: 'Suisse · ED', tone: 'red' },
  'swiss-abroad': { text: 'Suisse', tone: 'blue' },
  general: { text: 'Général', tone: 'yellow' },
};

let _panel = null;
let _titleEl = null;
let _snapshotEl = null;
let _partiesEl = null;
let _trendCard = null;
let _trendSvg = null;
let _trendSnapshotEl = null;
let _trendHintEl = null;
let _trendTileEl = null;
let _elections = null;
let _countryEventsByIso = {};
let _currentIso2 = null;
let _currentYear = 1900;
let _onShow = null;
let _onClose = null;
let _onJumpToYear = null;
let _onOpenModal = null;

export function initCountryDetail({
  panel,
  elections,
  countryEventsByIso = {},
  onShow,
  onClose,
  onJumpToYear,
  onOpenModal,
}) {
  _panel = panel;
  _elections = elections;
  _countryEventsByIso = countryEventsByIso || {};
  _onShow = onShow;
  _onClose = onClose;
  _onJumpToYear = onJumpToYear;
  _onOpenModal = onOpenModal || null;

  _titleEl = panel.querySelector('[data-country-name]');
  _snapshotEl = panel.querySelector('[data-country-snapshot]');
  _partiesEl = panel.querySelector('[data-country-parties]');

  _ensureTrendCard();

  panel
    .querySelector('[data-country-close]')
    .addEventListener('click', hideCountryDetail);

  // Pre-warm the panel so the first reveal doesn't pay the cost of initial
  // paint (backdrop/transition compile). Flashes in/out before any click.
  requestAnimationFrame(() => {
    panel.classList.add('is-visible', 'is-priming');
    requestAnimationFrame(() => {
      panel.classList.remove('is-visible', 'is-priming');
    });
  });
}

export function showCountryDetail(iso2, feature, year) {
  _currentIso2 = iso2 && _elections[iso2] ? iso2 : null;
  _currentYear = year;

  _titleEl.textContent =
    (_currentIso2 && _elections[_currentIso2].name) ||
    feature?.properties?.Name ||
    'Pays inconnu';
  _renderParties();

  if (_onShow) _onShow(feature);
  _panel.classList.add('is-visible');
}

export function hideCountryDetail() {
  _currentIso2 = null;
  _panel.classList.remove('is-visible');
  if (_onClose) _onClose();
}

export function updateCountryDetail(year) {
  _currentYear = year;
  if (!_currentIso2) return;
  _renderParties();
}

function _ensureTrendCard() {
  if (_trendCard) return;

  const baseCard = _panel.querySelector('.country-detail-card');
  if (!baseCard) return;

  const stack = document.createElement('div');
  stack.className = 'country-detail-stack pointer-events-auto w-80';
  baseCard.parentNode.insertBefore(stack, baseCard);
  stack.appendChild(baseCard);

  const trendCard = document.createElement('div');
  trendCard.className = 'country-detail-card country-trend-card';
  trendCard.innerHTML = `
    <div class="flex items-baseline justify-between mb-3">
      <p class="card-label">Évolution extrême droite</p>
      <p data-country-trend-snapshot class="country-trend-snapshot">—</p>
    </div>
    <div class="country-trend-chart-wrap">
      <svg data-country-trend-svg aria-label="Courbe d'évolution"></svg>
    </div>
    <p data-country-trend-hint class="country-trend-hint">
      Cliquez sur un point pour aller à l'année.
    </p>
    <div data-country-trend-tile class="country-trend-tile"></div>
  `;
  stack.appendChild(trendCard);

  _trendCard = trendCard;
  _trendSvg = trendCard.querySelector('[data-country-trend-svg]');
  _trendSnapshotEl = trendCard.querySelector('[data-country-trend-snapshot]');
  _trendHintEl = trendCard.querySelector('[data-country-trend-hint]');
  _trendTileEl = trendCard.querySelector('[data-country-trend-tile]');
}

// Pick a coherent snapshot: find the single most recent national election year
// (max election.year <= year across ALL parties), then include only parties
// that have an entry for exactly that year. This ensures all bars represent
// the same election cycle and percentages are comparable.
function _pickSnapshot(country, year) {
  // Step 1: find the most recent election year across the country
  let lastElectionYear = null;
  for (const party of Object.values(country.parties)) {
    for (const e of party.elections) {
      if (e.year <= year && e.vote_pct != null) {
        if (lastElectionYear === null || e.year > lastElectionYear) {
          lastElectionYear = e.year;
        }
      }
    }
  }
  if (lastElectionYear === null) return new Map();

  // Step 2: collect parties that have data at lastElectionYear, deduplicate by abbrev
  const byKey = new Map();
  for (const party of Object.values(country.parties)) {
    const election = party.elections.find(
      (e) => e.year === lastElectionYear && e.vote_pct != null,
    );
    if (!election) continue;
    const key = (party.abbrev || party.name).toUpperCase();
    const existing = byKey.get(key);
    if (!existing || election.vote_pct > existing.election.vote_pct) {
      byKey.set(key, { party, election });
    }
  }
  return byKey;
}

function _computeFarRightSeries(country) {
  const byYear = new Map();
  for (const party of Object.values(country.parties)) {
    if (party.family_code !== FAR_RIGHT_CODE) continue;
    for (const election of party.elections) {
      if (election.vote_pct == null || election.year == null) continue;
      const prev = byYear.get(election.year) || 0;
      byYear.set(election.year, prev + election.vote_pct);
    }
  }

  return Array.from(byYear.entries())
    .map(([year, value]) => ({ year: Number(year), value: Number(value) }))
    .sort((a, b) => a.year - b.year);
}

function _normalizeCountryEvent(raw, index) {
  const year = Number(raw?.year ?? raw?.annee);
  if (!Number.isFinite(year)) return null;

  const type = raw?.type || raw?.categorie || 'general';
  if (type === 'general') return null;

  const title = raw?.title || raw?.titre;
  if (!title) return null;

  return {
    id: raw.id || `country-event-${year}-${index}`,
    year,
    title,
    type,
    score: Number(raw?.score) || 0,
    url: raw?.url || null,
    image: raw?.image || null,
    description: raw?.description || '',
  };
}

function _getCountryEventsForTrend(iso2) {
  const raw = _countryEventsByIso?.[iso2] || [];
  const events = raw
    .map((item, index) => _normalizeCountryEvent(item, index))
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || a.year - b.year);

  if (events.length <= MAX_TREND_EVENT_POINTS) {
    return events.sort((a, b) => a.year - b.year);
  }

  return events
    .slice(0, MAX_TREND_EVENT_POINTS)
    .sort((a, b) => a.year - b.year);
}

function _estimateShareAtYear(series, year) {
  if (!series || series.length === 0) return 0;
  if (year <= series[0].year) return series[0].value;
  if (year >= series[series.length - 1].year)
    return series[series.length - 1].value;

  for (let i = 1; i < series.length; i += 1) {
    const left = series[i - 1];
    const right = series[i];
    if (year < right.year) {
      const ratio = (year - left.year) / Math.max(1, right.year - left.year);
      return left.value + (right.value - left.value) * ratio;
    }
  }
  return series[series.length - 1].value;
}

function _seriesUntilYear(series, year) {
  if (!series || series.length === 0) return [];
  const out = [];

  for (const point of series) {
    if (point.year <= year) out.push(point);
  }

  if (out.length === 0) {
    out.push({ year, value: _estimateShareAtYear(series, year) });
    return out;
  }

  const last = out[out.length - 1];
  if (last.year !== year) {
    out.push({ year, value: _estimateShareAtYear(series, year) });
  }
  return out;
}

function _renderTrendTile(event) {
  if (!_trendTileEl) return;
  const badge = TREND_TILE_BADGE[event.type] || TREND_TILE_BADGE.general;
  // Bug 4 fix: title first, then badges — matches _createTile structure in event-tiles.js.
  // .event-tile-header is display:flex justify-content:space-between, so order matters.
  _trendTileEl.innerHTML = `
    <article class="event-tile" tabindex="0" role="button">
      <header class="event-tile-header">
        <h4 class="event-tile-title">${event.title} <span class="trend-tile-year">(${event.year})</span></h4>
        <div class="event-tile-badges">
          <span class="event-badge badge-${badge.tone}">${badge.text}</span>
        </div>
      </header>
    </article>
  `;
  const article = _trendTileEl.querySelector('.event-tile');
  if (article && _onOpenModal) {
    article.addEventListener('click', () => _onOpenModal(event));
  }
  _trendTileEl.classList.add('is-active');
}

function _clearTrendTile() {
  if (!_trendTileEl) return;
  _trendTileEl.classList.remove('is-active');
}

function _renderTrendChart(country) {
  if (!_trendSvg || !_trendCard) return;

  if (!country || !_currentIso2) {
    _trendCard.classList.add('is-empty');
    _trendSnapshotEl.textContent = '—';
    _trendHintEl.textContent = 'Aucune donnée pour ce pays.';
    _trendSvg.innerHTML = '';
    _clearTrendTile();
    return;
  }

  const series = _computeFarRightSeries(country);
  const events = _getCountryEventsForTrend(_currentIso2);

  if (series.length < 2) {
    _trendCard.classList.add('is-empty');
    _trendSnapshotEl.textContent = '—';
    _trendHintEl.textContent = 'Pas assez de points pour tracer une courbe.';
    _trendSvg.innerHTML = '';
    _clearTrendTile();
    return;
  }

  _trendCard.classList.remove('is-empty');
  _trendSnapshotEl.textContent = `curseur ${_currentYear}`;
  _trendHintEl.textContent =
    events.length > 0
      ? "Cliquez sur un point pour aller à l'année."
      : "Pas d'événement marqué pour ce pays.";

  const yearsDomain = [
    ...series.map((point) => point.year),
    ...events.map((event) => event.year),
    _currentYear,
  ];
  const x = d3
    .scaleLinear()
    .domain(d3.extent(yearsDomain))
    .range([TREND_MARGIN.left, TREND_WIDTH - TREND_MARGIN.right]);

  const yMax = Math.max(d3.max(series, (point) => point.value) || 0, 5);
  const y = d3
    .scaleLinear()
    .domain([0, yMax * 1.12])
    .nice()
    .range([TREND_HEIGHT - TREND_MARGIN.bottom, TREND_MARGIN.top]);

  const line = d3
    .line()
    .x((point) => x(point.year))
    .y((point) => y(point.value));

  const progressSeries = _seriesUntilYear(series, _currentYear);

  const svg = d3
    .select(_trendSvg)
    .attr('viewBox', `0 0 ${TREND_WIDTH} ${TREND_HEIGHT}`)
    .attr('preserveAspectRatio', 'xMidYMid meet');
  svg.selectAll('*').remove();

  svg
    .append('path')
    .datum(series)
    .attr('class', 'country-trend-line country-trend-line-base')
    .attr('d', line);

  svg
    .append('path')
    .datum(progressSeries)
    .attr('class', 'country-trend-line country-trend-line-progress')
    .attr('d', line);

  const eventsWithY = events.map((event) => ({
    ...event,
    yValue: _estimateShareAtYear(series, event.year),
  }));

  // Show a mini tile when the scroll cursor is within TREND_TILE_WINDOW years of an event point.
  const activeEvent =
    eventsWithY
      .filter(
        (e) =>
          e.year <= _currentYear && e.year > _currentYear - TREND_TILE_WINDOW,
      )
      .sort((a, b) => b.year - a.year)[0] || null;

  if (activeEvent) {
    _renderTrendTile(activeEvent);
  } else {
    _clearTrendTile();
  }

  svg
    .selectAll('.country-trend-event-point')
    .data(eventsWithY, (event) => event.id)
    .join('circle')
    .attr(
      'class',
      (event) =>
        `country-trend-event-point${event.year <= _currentYear ? ' is-past' : ''}`,
    )
    .attr('cx', (event) => x(event.year))
    .attr('cy', (event) => y(event.yValue))
    .attr('r', 3.8)
    .attr('tabindex', 0)
    .on('click', (_evt, event) => {
      if (_onJumpToYear) _onJumpToYear(event.year);
    })
    .append('title')
    .text((event) => `${event.year} · ${event.title}`);

  const progressPoint = progressSeries[progressSeries.length - 1];
  if (progressPoint) {
    svg
      .append('circle')
      .attr('class', 'country-trend-current-point')
      .attr('cx', x(progressPoint.year))
      .attr('cy', y(progressPoint.value))
      .attr('r', 4.2);
  }

  svg
    .append('text')
    .attr('class', 'country-trend-axis-label')
    .attr('x', TREND_MARGIN.left)
    .attr('y', TREND_HEIGHT - 4)
    .text(String(Math.floor(x.domain()[0])));

  svg
    .append('text')
    .attr('class', 'country-trend-axis-label')
    .attr('x', TREND_WIDTH - TREND_MARGIN.right)
    .attr('y', TREND_HEIGHT - 4)
    .attr('text-anchor', 'end')
    .text(String(Math.ceil(x.domain()[1])));
}

function _renderParties() {
  const country = _currentIso2 ? _elections[_currentIso2] : null;
  if (!country) {
    _partiesEl.innerHTML =
      '<li class="text-xs text-gray-500">Aucune donnée électorale disponible pour ce pays.</li>';
    _snapshotEl.textContent = '—';
    _renderTrendChart(null);
    return;
  }

  const snapshot = _pickSnapshot(country, _currentYear);
  const sorted = [...snapshot.values()].sort(
    (a, b) => b.election.vote_pct - a.election.vote_pct,
  );
  const rows = sorted.slice(0, TOP_N);
  // Always surface the top far-right party (core subject of the viz) even if
  // smaller parties or coalition entries bump it out of the top N.
  const hasFarRight = rows.some((r) => r.party.family_code === FAR_RIGHT_CODE);
  if (!hasFarRight) {
    const topFarRight = sorted.find(
      (r) => r.party.family_code === FAR_RIGHT_CODE,
    );
    if (topFarRight) {
      rows[rows.length - 1] = topFarRight;
      rows.sort((a, b) => b.election.vote_pct - a.election.vote_pct);
    }
  }

  if (rows.length === 0) {
    _partiesEl.innerHTML =
      '<li class="text-xs text-gray-500">Aucune donnée avant cette année.</li>';
    _snapshotEl.textContent = '—';
    _renderTrendChart(country);
    return;
  }

  const max = Math.max(...rows.map((r) => r.election.vote_pct));
  const scaleMax = Math.max(max * 1.15, 10);
  _snapshotEl.textContent = `scrutin ${rows[0].election.year}`;

  _partiesEl.innerHTML = '';
  for (const { party, election } of rows) {
    const meta = FAMILY_META[party.family_code] || {
      label: 'Divers',
      tone: 'gray',
    };
    const isFarRight = party.family_code === FAR_RIGHT_CODE;
    const pct = election.vote_pct;
    const widthPct = Math.min(100, (pct / scaleMax) * 100);

    const li = document.createElement('li');
    li.className = `party-row${isFarRight ? ' is-far-right' : ''}`;
    li.innerHTML = `
      <div class="party-top">
        <span class="party-label" title="${party.name}">${party.abbrev || party.name}</span>
        <span class="party-tag tone-${meta.tone}">${meta.label}</span>
        <span class="party-pct">${pct.toFixed(1)}%</span>
      </div>
      <div class="party-bar">
        <div class="party-bar-fill tone-${meta.tone}" style="width: ${widthPct}%"></div>
      </div>
    `;
    _partiesEl.appendChild(li);
  }

  _renderTrendChart(country);
}
