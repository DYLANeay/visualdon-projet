import * as d3 from 'd3';

// Far-right vote in cantonal capitals vs in their canton (rural average).
// One column per canton on the X axis, Y axis = vote share %.
// Two dots per canton (city = blue, rural/canton = red) connected by a vertical
// line. The label in the middle shows the ratio (e.g. "1.5x").
// Source: BFS Nationalratswahlen 2023 (asset 28845352).

const COLOR_CITY = '#1c7ed6';
const COLOR_RURAL = '#c8102e';
const COLOR_NEUTRAL = '#4a4a4a';

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

  // Sort by rural far-right share (descending) — most far-right cantons on the left.
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

  const margin = { top: 60, right: 30, bottom: 70, left: 55 };
  const width = container.clientWidth - margin.left - margin.right;
  const height = 480; // compact height, wide layout

  const svg = d3
    .select(container)
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  const yMax =
    Math.ceil(d3.max(rows, (r) => Math.max(r.city, r.rural)) / 5) * 5 + 5;

  const x = d3
    .scaleBand()
    .domain(rows.map((r) => r.canton))
    .range([0, width])
    .padding(0.4);
  const y = d3.scaleLinear().domain([0, yMax]).range([height, 0]);

  // Y grid + axis.
  const yAxis = d3
    .axisLeft(y)
    .ticks(8)
    .tickFormat((d) => `${d}%`)
    .tickSize(-width);
  svg
    .append('g')
    .call(yAxis)
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

  // X axis (canton abbreviations).
  const xAxis = d3.axisBottom(x).tickSize(0);
  svg
    .append('g')
    .attr('transform', `translate(0,${height})`)
    .call(xAxis)
    .call((g) => g.select('.domain').remove())
    .call((g) =>
      g
        .selectAll('.tick text')
        .attr('fill', 'var(--text-secondary)')
        .style('font-family', 'var(--font-ui)')
        .style('font-size', '14px')
        .style('font-weight', '600'),
    );

  // Connector line (vertical) between city and rural dots.
  svg
    .append('g')
    .selectAll('line')
    .data(rows)
    .join('line')
    .attr('x1', (d) => x(d.canton) + x.bandwidth() / 2)
    .attr('x2', (d) => x(d.canton) + x.bandwidth() / 2)
    .attr('y1', (d) => y(d.city))
    .attr('y2', (d) => y(d.rural))
    .attr('stroke', 'var(--border-strong)')
    .attr('stroke-width', 1.5)
    .attr('opacity', 0.35);

  // City dot (chef-lieu) — smaller, on top.
  svg
    .append('g')
    .selectAll('circle.city')
    .data(rows)
    .join('circle')
    .attr('class', 'city')
    .attr('cx', (d) => x(d.canton) + x.bandwidth() / 2)
    .attr('cy', (d) => y(d.city))
    .attr('r', 7)
    .attr('fill', COLOR_CITY)
    .append('title')
    .text(
      (d) => `${d.cheflieu} (chef-lieu) : ${d.city.toFixed(1)}% extrême droite`,
    );

  // Rural / canton dot — larger, on top.
  svg
    .append('g')
    .selectAll('circle.rural')
    .data(rows)
    .join('circle')
    .attr('class', 'rural')
    .attr('cx', (d) => x(d.canton) + x.bandwidth() / 2)
    .attr('cy', (d) => y(d.rural))
    .attr('r', 9)
    .attr('fill', COLOR_RURAL)
    .append('title')
    .text((d) => `Canton de ${d.name} : ${d.rural.toFixed(1)}% extrême droite`);

  // Ratio label in the middle of the connector line.
  svg
    .append('g')
    .selectAll('text.ratio-label')
    .data(rows)
    .join('text')
    .attr('class', 'ratio-label')
    .attr('x', (d) => x(d.canton) + x.bandwidth() / 2 + 12)
    .attr('y', (d) => y((d.city + d.rural) / 2))
    .attr('dy', '0.35em')
    .attr('fill', (d) => {
      if (d.rural > d.city) return COLOR_RURAL;
      if (d.city > d.rural) return COLOR_CITY;
      return COLOR_NEUTRAL;
    })
    .style('font-family', 'var(--font-mono)')
    .style('font-size', '13px')
    .style('font-weight', '600')
    .text((d) => {
      if (d.city === 0) return '';
      const ratio = d.rural / d.city;
      if (Math.abs(ratio - 1) < 0.05) return '';
      return `${ratio.toFixed(1)}x`;
    });

  // Inline legend (top right of plot area).
  const legend = svg
    .append('g')
    .attr('transform', `translate(${width - 280}, ${-margin.top + 18})`);

  legend
    .append('circle')
    .attr('cx', 7)
    .attr('cy', 7)
    .attr('r', 7)
    .attr('fill', COLOR_CITY);
  legend
    .append('text')
    .attr('x', 22)
    .attr('y', 7)
    .attr('dy', '0.35em')
    .attr('fill', 'var(--text-secondary)')
    .style('font-family', 'var(--font-ui)')
    .style('font-size', '14px')
    .text('Chef-lieu (ville)');

  legend
    .append('circle')
    .attr('cx', 175)
    .attr('cy', 7)
    .attr('r', 9)
    .attr('fill', COLOR_RURAL);
  legend
    .append('text')
    .attr('x', 190)
    .attr('y', 7)
    .attr('dy', '0.35em')
    .attr('fill', 'var(--text-secondary)')
    .style('font-family', 'var(--font-ui)')
    .style('font-size', '14px')
    .text('Canton entier (incl. campagne)');
}
