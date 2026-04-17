import * as d3 from 'd3';

export const colorScale = d3
  .scaleThreshold()
  .domain([5, 10, 15, 20, 30])
  .range(['#fee5d9', '#fcbba1', '#fc9272', '#fb6a4a', '#de2d26', '#a50f15']);
