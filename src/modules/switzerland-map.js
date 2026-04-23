import * as d3 from 'd3';

let _svg = null;
let _path = null;
let _geo = null;
let _onCantonClick = null;

const MAP_WIDTH = 900;
const MAP_HEIGHT = 560;

export function initSwitzerlandMap(container, geoCantons, onCantonClick) {
  _geo = geoCantons;
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
    .attr('fill', '#d9d9d9')
    .attr('stroke', '#6b7280')
    .attr('stroke-width', 0.6)
    .attr('data-canton', (d) => d.properties.name)
    .style('cursor', 'pointer')
    .on('mouseenter', function () {
      d3.select(this).attr('fill', '#bfbfbf');
    })
    .on('mouseleave', function () {
      d3.select(this).attr('fill', '#d9d9d9');
    })
    .on('click', _handleClick);
}

function _handleClick(_event, feature) {
  if (!_onCantonClick) return;
  _onCantonClick(feature);
}

export function updateSwitzerlandMap(_year) {
  // Placeholder: canton-level election data is not wired yet. Keep the
  // signature in place so the main app can call this on year changes.
  if (!_svg) return;
}
