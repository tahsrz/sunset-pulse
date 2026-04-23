'use client';

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const MakielFateChart = ({ property }: { property: any }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    // Data generation influenced by property
    const baseValue = (property?.rates?.monthly || property?.rates?.nightly * 30 || 1500) * 150;
    const data = Array.from({ length: 20 }, (_, i) => ({
      year: 2024 + i * 0.5,
      predicted: baseValue * Math.pow(1.08, i * 0.5) + (Math.random() - 0.5) * 10000,
      realized: i < 5 ? baseValue * Math.pow(1.07, i * 0.5) + (Math.random() - 0.5) * 5000 : null
    }));

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 800;
    const height = 400;
    const margin = { top: 20, right: 30, bottom: 40, left: 60 };

    const x = d3.scaleLinear()
      .domain(d3.extent(data, d => d.year) as [number, number])
      .range([margin.left, width - margin.right]);

    const y = d3.scaleLinear()
      .domain([baseValue * 0.8, baseValue * 2.5])
      .range([height - margin.bottom, margin.top]);

    // Grid lines
    svg.append('g')
      .attr('class', 'grid')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).ticks(5).tickSize(-height + margin.top + margin.bottom).tickFormat(() => ''))
      .attr('stroke-opacity', 0.1)
      .attr('stroke', '#fff');

    svg.append('g')
      .attr('class', 'grid')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(5).tickSize(-width + margin.left + margin.right).tickFormat(() => ''))
      .attr('stroke-opacity', 0.1)
      .attr('stroke', '#fff');

    // Gradient for the predicted line
    const gradient = svg.append('defs')
      .append('linearGradient')
      .attr('id', 'fate-gradient')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '100%').attr('y2', '0%');

    gradient.append('stop').attr('offset', '0%').attr('stop-color', '#3b82f6').attr('stop-opacity', 1);
    gradient.append('stop').attr('offset', '100%').attr('stop-color', '#60a5fa').attr('stop-opacity', 0.5);

    // Predicted Line
    const line = d3.line<any>()
      .x(d => x(d.year))
      .y(d => y(d.predicted))
      .curve(d3.curveMonotoneX);

    svg.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', 'url(#fate-gradient)')
      .attr('stroke-width', 4)
      .attr('d', line)
      .attr('stroke-dasharray', '2000')
      .attr('stroke-dashoffset', '2000')
      .transition()
      .duration(2000)
      .attr('stroke-dashoffset', 0);

    // Realized points
    svg.selectAll('.dot')
      .data(data.filter(d => d.realized !== null))
      .enter()
      .append('circle')
      .attr('cx', d => x(d.year))
      .attr('cy', d => y(d.realized!))
      .attr('r', 5)
      .attr('fill', '#ef4444')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('opacity', 0)
      .transition()
      .delay((_, i) => i * 200)
      .style('opacity', 1);

    // Axes labels
    svg.append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).ticks(5).tickFormat(d3.format('d')))
      .attr('color', '#64748b');

    svg.append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(5).tickFormat(d => `$${(d as number) / 1000}k`))
      .attr('color', '#64748b');

  }, [property]);

  return (
    <div className="w-full h-full flex flex-col items-center">
      <div className="w-full flex justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full" />
          <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Predicted Fate</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full" />
          <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Realized Velocity</span>
        </div>
      </div>
      <svg ref={svgRef} viewBox="0 0 800 400" className="w-full h-auto drop-shadow-2xl" />
      <div className="mt-6 p-4 bg-blue-600/10 border border-blue-500/20 rounded-xl w-full">
        <p className="text-[10px] text-blue-400 font-mono leading-relaxed uppercase">
          MAKIEL ANALYSIS [{property?.name || 'TARGET'}]: Asset trajectory remains bullish with a 12.4% alpha above regional baseline. Growth manifest expected in next 24 months.
        </p>
      </div>
    </div>
  );
};

export default MakielFateChart;
