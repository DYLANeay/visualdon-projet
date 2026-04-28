import * as d3 from 'd3';

// Far-right vote in cantonal capitals vs in their canton (rural average).
// One row per canton, two dots connected by a line. The eye instantly sees
// whether rural areas vote more far-right than the chef-lieu.
// Source: BFS Nationalratswahlen 2023 (asset 28845352).

const COLOR_CITY = '#1c7ed6';
const COLOR_RURAL = '#c8102e';

export async function initCityRuralChart(container) {
  if (!container) return;
  const data = await d3.json('/data/communes/cheflieux-2023.json');

  // Build one row per canton: { canton, name, city, rural }
  const rows = Object.values(data.cantons).map((c) => ({
    canton: c.canton,
    name: c.canton_name,
    cheflieu: c.cheflieu.name,
    city: c.cheflieu.wings.ext_droite,
    rural: c.canton_level.wings.ext_droite,
  }));

  // Sort by rural far-right share (descending) — most far-right cantons on top.
  rows.sort((a, b) => b.rural - a.rural);

  render(container, rows);

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => render(container, rows), 150);
  });
}

function render(container, rows) {
  container.innerHTML = '';

  const margin = { top: 50, right: 110, bottom: 30, left: 130 };
  const rowHeight = 22;
  const width = container.clientWidth - margin.left - margin.right;
  const height = rows.length * rowHeight;

  const svg = d3
    .select(container)
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  const xMax = Math.ceil(d3.max(rows, (r) => Math.max(r.city, r.rural)) / 5) * 5;
  const x = d3.scaleLinear().domain([0, xMax]).range([0, width]);
  const y = d3
    .scaleBand()
    .domain(rows.map((r) => r.canton))
    .range([0, height])
    .padding(0.35);

  // X grid + axis at top.
  const xAxis = d3
    .axisTop(x)
    .ticks(6)
    .tickFormat((d) => `${d}%`)
    .tickSize(-height);
  svg
    .append('g')
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
        .style('font-size', '11px'),
    );

  // Canton labels (left).
  svg
    .append('g')
    .selectAll('text')
    .data(rows)
    .join('text')
    .attr('x', -12)
    .attr('y', (d) => y(d.canton) + y.bandwidth() / 2)
    .attr('dy', '0.35em')
    .attr('text-anchor', 'end')
    .attr('fill', 'var(--text-secondary)')
    .style('font-family', 'var(--font-ui)')
    .style('font-size', '12px')
    .text((d) => `${d.canton} · ${d.name}`);

  // Dumbbell: connecting line.
  svg
    .append('g')
    .selectAll('line')
    .data(rows)
    .join('line')
    .attr('x1', (d) => x(Math.min(d.city, d.rural)))
    .attr('x2', (d) => x(Math.max(d.city, d.rural)))
    .attr('y1', (d) => y(d.canton) + y.bandwidth() / 2)
    .attr('y2', (d) => y(d.canton) + y.bandwidth() / 2)
    .attr('stroke', 'var(--border-strong)')
    .attr('stroke-width', 1.5)
    .attr('opacity', 0.4);

  // City dot (chef-lieu).
  svg
    .append('g')
    .selectAll('circle')
    .data(rows)
    .join('circle')
    .attr('cx', (d) => x(d.city))
    .attr('cy', (d) => y(d.canton) + y.bandwidth() / 2)
    .attr('r', 5)
    .attr('fill', COLOR_CITY)
    .append('title')
    .text(
      (d) =>
        `${d.cheflieu} (chef-lieu) : ${d.city.toFixed(1)}% extrême droite`,
    );

  // Rural / canton dot.
  svg
    .append('g')
    .selectAll('circle')
    .data(rows)
    .join('circle')
    .attr('cx', (d) => x(d.rural))
    .attr('cy', (d) => y(d.canton) + y.bandwidth() / 2)
    .attr('r', 5)
    .attr('fill', COLOR_RURAL)
    .append('title')
    .text((d) => `Canton de ${d.name} : ${d.rural.toFixed(1)}% extrême droite`);

  // Value labels at the right of each row.
  svg
    .append('g')
    .selectAll('text')
    .data(rows)
    .join('text')
    .attr('x', (d) => x(Math.max(d.city, d.rural)) + 10)
    .attr('y', (d) => y(d.canton) + y.bandwidth() / 2)
    .attr('dy', '0.35em')
    .attr('fill', 'var(--text-muted)')
    .style('font-family', 'var(--font-mono)')
    .style('font-size', '11px')
    .text((d) => {
      const gap = d.rural - d.city;
      const sign = gap > 0 ? '+' : '';
      return `${sign}${gap.toFixed(1)} pt`;
    });

  // Inline legend (top right of plot area).
  const legend = svg
    .append('g')
    .attr('transform', `translate(0, ${-margin.top + 10})`);

  legend
    .append('circle')
    .attr('cx', 6)
    .attr('cy', 6)
    .attr('r', 5)
    .attr('fill', COLOR_CITY);
  legend
    .append('text')
    .attr('x', 18)
    .attr('y', 6)
    .attr('dy', '0.35em')
    .attr('fill', 'var(--text-secondary)')
    .style('font-family', 'var(--font-ui)')
    .style('font-size', '12px')
    .text('Chef-lieu (ville)');

  legend
    .append('circle')
    .attr('cx', 160)
    .attr('cy', 6)
    .attr('r', 5)
    .attr('fill', COLOR_RURAL);
  legend
    .append('text')
    .attr('x', 172)
    .attr('y', 6)
    .attr('dy', '0.35em')
    .attr('fill', 'var(--text-secondary)')
    .style('font-family', 'var(--font-ui)')
    .style('font-size', '12px')
    .text('Canton entier (incl. campagne)');
}
