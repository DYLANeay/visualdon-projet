import * as d3 from 'd3';

// Horizontal dot plot: average far-right vote share per Swiss linguistic region.
// Three rows (DE / FR / IT). Each canton = a small muted circle.
// Region mean = a large red tick circle, labeled with XX.X%.
// Two modes: simple (unweighted average per canton) or weighted (by population).
// Source: OFS, Nationalratswahlen 2023 (same dataset as city-rural-chart).

const COLOR_MEAN = '#c8102e'; // same red as COLOR_RURAL in city-rural-chart
const COLOR_DOT = '#9b9b9b'; // muted neutral for individual canton points

// Population per canton (residents, OFS data via cantons.geojson).
const CANTON_POPULATION = {
  ZH: 1553423, BE: 1043081, LU: 416347, UR: 36819, SZ: 162157,
  OW: 38108, NW: 43520, GL: 40851, ZG: 128794, FR: 325547,
  SO: 277462, BS: 196735, BL: 290969, SH: 83107, AR: 55309,
  AI: 16293, SG: 514504, GR: 200096, AG: 694072, TG: 282909,
  TI: 350986, VD: 814762, VS: 348503, NE: 175894, GE: 506343,
  JU: 73709,
};

// Bilingual cantons (BE, FR, VS, GR) are assigned to their official majority language.
const CANTON_LANGUAGE = {
  // German-speaking (19 cantons)
  ZH: 'de',
  BE: 'de',
  LU: 'de',
  UR: 'de',
  SZ: 'de',
  OW: 'de',
  NW: 'de',
  GL: 'de',
  ZG: 'de',
  SO: 'de',
  BS: 'de',
  BL: 'de',
  SH: 'de',
  AR: 'de',
  AI: 'de',
  SG: 'de',
  GR: 'de',
  AG: 'de',
  TG: 'de',
  // French-speaking (6 cantons)
  GE: 'fr',
  VD: 'fr',
  NE: 'fr',
  JU: 'fr',
  FR: 'fr',
  VS: 'fr',
  // Italian-speaking (1 canton)
  TI: 'it',
};

const REGION_LABELS = {
  de: { label: 'Suisse alémanique', count: 19 },
  fr: { label: 'Suisse romande', count: 6 },
  it: { label: 'Suisse italienne', count: 1 },
};

const REGION_ORDER = ['de', 'fr', 'it'];

export async function initLanguageRegionsChart(container, options = {}) {
  if (!container) return;
  const { weighted = false } = options;
  const data = await d3.json('/data/communes/cheflieux-2023.json');

  // Group cantons by linguistic region.
  const byRegion = { de: [], fr: [], it: [] };
  for (const c of Object.values(data.cantons)) {
    const lang = CANTON_LANGUAGE[c.canton];
    if (!lang) continue;
    byRegion[lang].push({
      canton: c.canton,
      name: c.canton_name,
      value: c.canton_level.wings.ext_droite,
      population: CANTON_POPULATION[c.canton] ?? 0,
    });
  }

  // Compute region means (simple or population-weighted).
  const regionMeans = {};
  for (const lang of REGION_ORDER) {
    const vals = byRegion[lang];
    if (weighted) {
      const totalPop = vals.reduce((s, d) => s + d.population, 0);
      regionMeans[lang] =
        vals.reduce((s, d) => s + d.value * d.population, 0) / totalPop;
    } else {
      regionMeans[lang] = vals.reduce((s, d) => s + d.value, 0) / vals.length;
    }
  }

  render(container, byRegion, regionMeans, weighted);

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(
      () => render(container, byRegion, regionMeans, weighted),
      150,
    );
  });
}

function render(container, byRegion, regionMeans, weighted = false) {
  container.innerHTML = '';

  const margin = { top: 50, right: 40, bottom: 40, left: 260 };
  const width = container.clientWidth - margin.left - margin.right;
  const height =
    Math.max(280, Math.min(420, container.clientHeight - margin.top - margin.bottom)) || 320;

  // In weighted mode, scale dot size by population so big cantons "weigh visually" more.
  const allPops = Object.values(byRegion)
    .flat()
    .map((d) => d.population);
  const dotRadius = weighted
    ? d3.scaleSqrt().domain([0, d3.max(allPops)]).range([3, 14])
    : () => 6;

  // Row band scale — one band per linguistic region.
  const rowHeight = height / REGION_ORDER.length;

  const svg = d3
    .select(container)
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // All canton values across all regions, for a shared X domain.
  const allValues = REGION_ORDER.flatMap((lang) =>
    byRegion[lang].map((d) => d.value),
  );
  const xMax = Math.ceil(d3.max(allValues) / 5) * 5 + 5;

  const x = d3.scaleLinear().domain([0, xMax]).range([0, width]);

  // X axis (bottom).
  const xAxis = d3
    .axisBottom(x)
    .ticks(8)
    .tickFormat((d) => `${d}%`)
    .tickSize(-height);
  svg
    .append('g')
    .attr('transform', `translate(0,${height})`)
    .call(xAxis)
    .call((g) => g.select('.domain').remove())
    .call((g) =>
      g
        .selectAll('.tick line')
        .attr('stroke', 'var(--border-subtle)')
        .attr('stroke-dasharray', '2 3'),
    )
    .call((g) =>
      g
        .selectAll('.tick text')
        .attr('fill', 'var(--text-muted)')
        .style('font-family', 'var(--font-mono)')
        .style('font-size', '12px'),
    );

  // Shared hover label — shown below the hovered canton dot.
  const hoverLabel = svg
    .append('text')
    .attr('class', 'canton-hover-label')
    .attr('text-anchor', 'middle')
    .attr('fill', 'var(--text-primary)')
    .style('font-family', 'var(--font-ui)')
    .style('font-size', '12px')
    .style('font-weight', '600')
    .style('pointer-events', 'none')
    .attr('opacity', 0);

  // Draw each linguistic region row.
  REGION_ORDER.forEach((lang, i) => {
    const cantons = byRegion[lang];
    const mean = regionMeans[lang];
    const cy = i * rowHeight + rowHeight / 2;
    const { label, count } = REGION_LABELS[lang];

    // Row label on the left.
    svg
      .append('text')
      .attr('x', -24)
      .attr('y', cy)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'end')
      .attr('fill', 'var(--text-secondary)')
      .style('font-family', 'var(--font-ui)')
      .style('font-size', '14px')
      .style('font-weight', '600')
      .text(`${label} (${count} canton${count > 1 ? 's' : ''})`);

    // Subtle horizontal guide line for the row.
    svg
      .append('line')
      .attr('x1', 0)
      .attr('x2', width)
      .attr('y1', cy)
      .attr('y2', cy)
      .attr('stroke', 'var(--border-subtle)')
      .attr('stroke-dasharray', '2 3')
      .attr('opacity', 0.5);

    // Canton dots.
    svg
      .append('g')
      .selectAll('circle.canton-dot')
      .data(cantons)
      .join('circle')
      .attr('class', 'canton-dot')
      .attr('cx', (d) => x(d.value))
      .attr('cy', cy)
      .attr('r', (d) => dotRadius(d.population))
      .attr('fill', COLOR_DOT)
      .attr('opacity', 0.75)
      .style('cursor', 'pointer')
      .on('mouseenter', function (event, d) {
        const baseR = dotRadius(d.population);
        d3.select(this)
          .attr('r', baseR + 2)
          .attr('opacity', 1);
        const popText = weighted
          ? ` · ${(d.population / 1000).toFixed(0)}k hab.`
          : '';
        hoverLabel
          .attr('x', x(d.value))
          .attr('y', cy + 32)
          .text(`${d.name} (${d.canton}) — ${d.value.toFixed(1)}%${popText}`)
          .attr('opacity', 1);
      })
      .on('mouseleave', function (event, d) {
        d3.select(this)
          .attr('r', dotRadius(d.population))
          .attr('opacity', 0.75);
        hoverLabel.attr('opacity', 0);
      });

    // Region mean marker — larger, red, with a vertical thick line style.
    svg
      .append('line')
      .attr('x1', x(mean))
      .attr('x2', x(mean))
      .attr('y1', cy - 16)
      .attr('y2', cy + 16)
      .attr('stroke', COLOR_MEAN)
      .attr('stroke-width', 4)
      .attr('stroke-linecap', 'round');

    svg
      .append('circle')
      .attr('cx', x(mean))
      .attr('cy', cy)
      .attr('r', 10)
      .attr('fill', COLOR_MEAN)
      .attr('opacity', 0.95)
      .append('title')
      .text(
        `Moyenne ${weighted ? 'pondérée' : 'simple'} ${label} : ${mean.toFixed(1)}% extrême droite`,
      );

    // Mean value label, above the marker.
    svg
      .append('text')
      .attr('x', x(mean))
      .attr('y', cy - 24)
      .attr('text-anchor', 'middle')
      .attr('fill', COLOR_MEAN)
      .style('font-family', 'var(--font-mono)')
      .style('font-size', '14px')
      .style('font-weight', '700')
      .text(`${mean.toFixed(1)}%`);
  });

  // Inline legend (top-right of plot area).
  const legend = svg
    .append('g')
    .attr('transform', `translate(${width - 240}, ${-margin.top + 8})`);

  legend
    .append('circle')
    .attr('cx', 7)
    .attr('cy', 7)
    .attr('r', 6)
    .attr('fill', COLOR_DOT)
    .attr('opacity', 0.75);
  legend
    .append('text')
    .attr('x', 20)
    .attr('y', 7)
    .attr('dy', '0.35em')
    .attr('fill', 'var(--text-secondary)')
    .style('font-family', 'var(--font-ui)')
    .style('font-size', '12px')
    .text(weighted ? 'Canton (taille = population)' : 'Valeur par canton');

  legend
    .append('circle')
    .attr('cx', 7)
    .attr('cy', 26)
    .attr('r', 10)
    .attr('fill', COLOR_MEAN)
    .attr('opacity', 0.95);
  legend
    .append('text')
    .attr('x', 20)
    .attr('y', 26)
    .attr('dy', '0.35em')
    .attr('fill', 'var(--text-secondary)')
    .style('font-family', 'var(--font-ui)')
    .style('font-size', '12px')
    .text(
      weighted
        ? 'Moyenne pondérée par population'
        : 'Moyenne simple de la région',
    );
}
