import * as d3 from 'd3';

export const colorScale = d3
  .scaleSequential(d3.interpolateReds)
  .domain([0, 100]);
