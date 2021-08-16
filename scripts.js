import 'regenerator-runtime/runtime';

import { select, selectAll } from 'd3-selection';
import { csv, json } from 'd3-fetch';
import { sankey, sankeyLinkHorizontal } from 'd3-sankey';
import { format } from 'd3-format';
import { scaleOrdinal } from 'd3-scale';
import { schemeCategory10 } from 'd3-scale-chromatic';
import { rgb } from 'd3-color';

let issuesToEngagement = require(`./data/Copy of Data for Visualizations - Issue areas by Engagement Type.csv`);
let engagementToOutput = require(`./data/Copy of Data for Visualizations - Output Types by Engagement Type.csv`);

const d3 = Object.assign(
  {},
  {
    csv,
    select,
    selectAll,
    json,
    sankey,
    sankeyLinkHorizontal,
    format,
    scaleOrdinal,
    schemeCategory10,
    rgb
  }
);

// const jsonUrl = `https://gist.githubusercontent.com/tekd/e9d8aee9e059f773aaf52f1130f98c65/raw/4a2af7014f0a8eed1a384f9d3f478fef6f67b218/sankey-test.json`;

/*
  SET UP GRAPH DIMENSIONS
*/

const margin = {
  top: 10,
  bottom: 10,
  left: 10,
  right: 10
};

const width = 1200;
const height = 600;

/*
  FORMATTING HELPERS
*/

const formatSetting = d3.format('.0f');
const formatNumber = (d) => d;
const color = d3.scaleOrdinal(schemeCategory10);

/*
  APPEND SVG TO PAGE
*/

let svg = d3
  .select('body')
  .append('svg')
  .attr('width', width)
  .attr('height', height)
  .append('g')
  .attr('transform', `translate(${margin.left},${margin.top})`);

/*
  SETUP SANKEY PROPERTIES
*/

let sankeyGraph = d3
  .sankey()
  .nodeWidth(20)
  .nodePadding(10)
  .size([width, height]);

let path = sankeyGraph.links();

/**
 *  ADD TOOLTIPS
 */
let tooltip = d3
  .select('body')
  .append('div')
  .attr('class', 'tooltip')
  .style('opacity', 0)


/* 
  FORMAT DATA
*/

Promise.all([d3.csv(issuesToEngagement), d3.csv(engagementToOutput)]) // begin
  .then((data) => {
    let graph = { nodes: [], links: [] };

    data[0].forEach((d) => {
      let sourceCol = 'Issue Area Tags\r\n(pick ONE) ';
      let targetCol = 'Engagement Type';
      let valueCol = 'COUNTA of Issue Area Tags\r\n(pick ONE) ';

      graph.nodes.push({ name: d[sourceCol] });
      graph.nodes.push({ name: d[targetCol] });
      graph.links.push({
        source: d[sourceCol],
        target: d[targetCol],
        value: d[valueCol]
      });
    });
/*
*/
    data[1].forEach((d) => {
      let sourceCol = 'Engagement Type';
      let targetCol = 'Primary Output\n(pick ONE)';
      let valueCol = 'COUNTA of Primary Output\n(pick ONE)';
      graph.nodes.push({ name: d[sourceCol] });
      graph.nodes.push({ name: d[targetCol] });
      graph.links.push({
        source: d[sourceCol],
        target: d[targetCol],
        value: d[valueCol]
      });
    });
    let uniqueNodesStr = new Set(
      graph.nodes.map((node) => JSON.stringify(node))
    );
    // return unique nodes
    graph.nodes = Array.from(uniqueNodesStr).map((node, idx) => {
      return Object.assign({ node: idx }, JSON.parse(node));
    });

    //replace link names
    graph.links.forEach((d, i) => {
      const graphMap = graph.nodes.map((node) => node.name);
      graph.links[i].source = graphMap.indexOf(graph.links[i].source);
      graph.links[i].target = graphMap.indexOf(graph.links[i].target);
    });

    return graph;
  })
  .then((data) => {
    /* LOAD DATA */

    let chart = sankeyGraph(data);

    /* ADD LINKs */
    let link = svg
      .append('g')
      .selectAll('.link')
      .data(() => {
        return chart.links;
      })
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('d', d3.sankeyLinkHorizontal())
      .attr('stroke-width', (d) => d.width);

    /* ADD LINK TITLES: currently only showing on hover tooltip*/
    link.append('title').text((d) => {
      return `${d.source.name} → ${d.target.name}`;
    });

    /**
     *  ADD TOOLTIPS
     */
    link
      .on('mouseover', function (d, i) {
        console.log(d.target)
        tooltip
          .html(`<p>${d.target.textContent}</p>`)
          .style('left', d.clientX + 'px')
          .style('top', d.clientY + 'px')
          .style('opacity', 1)
      })
      .on('mouseout', function (d) {
        tooltip.style('opacity', 0)
      });

    /* ADD NODES */
    let node = svg
      .append('g')
      .selectAll('.node')
      .data(chart.nodes)
      .enter()
      .append('g')
      .attr('class', 'node');

    /* ADD NODE RECTANGLES */
    node
      .append('rect')
      .attr('x', (d) => d.x0)
      .attr('y', (d) => d.y0)
      .attr('height', (d) => d.y1 - d.y0)
      .attr('width', sankeyGraph.nodeWidth())
      .style('fill', (d) => {
        return (d.color = color(d.name));
      })
      .style('stroke', (d) => d3.rgb(d.color).darker(2))
      .append('title')
      .text((d) => `${d.name} ${d.value}`);

    /* ADD NODE TITLES */
    node
      .append('text')
      .attr('x', (d) => d.x0 - 6)
      .attr('y', (d) => (d.y1 + d.y0) / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'end')
      .text((d) => d.name)
      .filter((d) => d.x0 < width / 2)
      .attr('x', (d) => d.x1 + 6)
      .attr('text-anchor', 'start');
  });
