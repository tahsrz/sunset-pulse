'use client';

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const GadraelRiskShield = ({ property }: { property: any }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    // Data influenced by property type and location
    const metrics = [
      { axis: "Zoning Rigidity", value: property?.type === 'Industrial' ? 0.95 : 0.7 },
      { axis: "Title Integrity", value: property?.beds > 0 ? 0.95 : 0.8 },
      { axis: "Flood Shield", value: property?.location?.city === 'Sunset' ? 0.5 : 0.8 },
      { axis: "Legal Buffer", value: 0.8 },
      { axis: "Market Immunity", value: property?.is_featured ? 0.9 : 0.6 },
      { axis: "Structural Armor", value: property?.square_feet > 2000 ? 0.85 : 0.5 }
    ];

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 600;
    const height = 400;
    const radius = Math.min(width, height) / 2 - 40;
    const centerX = width / 2;
    const centerY = height / 2;

    const angleSlice = (Math.PI * 2) / metrics.length;
    const rScale = d3.scaleLinear().range([0, radius]).domain([0, 1]);

    const g = svg.append('g').attr('transform', `translate(${centerX}, ${centerY})`);

    // Circular grid
    const levels = 5;
    for (let j = 0; j < levels; j++) {
      const levelRadius = (radius / levels) * (j + 1);
      g.append('circle')
        .attr('r', levelRadius)
        .attr('fill', 'none')
        .attr('stroke', '#fff')
        .attr('stroke-opacity', 0.05);
    }

    // Axis lines
    const axis = g.selectAll('.axis')
      .data(metrics)
      .enter()
      .append('g')
      .attr('class', 'axis');

    axis.append('line')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('x2', (_, i) => rScale(1) * Math.cos(angleSlice * i - Math.PI / 2))
      .attr('y2', (_, i) => rScale(1) * Math.sin(angleSlice * i - Math.PI / 2))
      .attr('stroke', '#fff')
      .attr('stroke-opacity', 0.1);

    axis.append('text')
      .attr('x', (_, i) => rScale(1.1) * Math.cos(angleSlice * i - Math.PI / 2))
      .attr('y', (_, i) => rScale(1.1) * Math.sin(angleSlice * i - Math.PI / 2))
      .attr('fill', '#64748b')
      .attr('font-size', '10px')
      .attr('font-weight', '900')
      .attr('text-anchor', 'middle')
      .attr('class', 'uppercase tracking-tighter')
      .text(d => d.axis);

    // Radar area
    const radarLine = d3.lineRadial<any>()
      .radius(d => rScale(d.value))
      .angle((_, i) => i * angleSlice)
      .curve(d3.curveLinearClosed);

    const blobWrapper = g.append('g').attr('class', 'radarWrapper');

    blobWrapper.append('path')
      .datum(metrics)
      .attr('d', radarLine)
      .attr('fill', '#94a3b8')
      .attr('fill-opacity', 0.2)
      .attr('stroke', '#94a3b8')
      .attr('stroke-width', 3)
      .style('filter', 'drop-shadow(0 0 10px rgba(148, 163, 184, 0.5))')
      .attr('transform', `rotate(0)`);

    // Data points
    g.selectAll('.radarCircle')
      .data(metrics)
      .enter()
      .append('circle')
      .attr('class', 'radarCircle')
      .attr('r', 4)
      .attr('cx', (d, i) => rScale(d.value) * Math.cos(angleSlice * i - Math.PI / 2))
      .attr('cy', (d, i) => rScale(d.value) * Math.sin(angleSlice * i - Math.PI / 2))
      .attr('fill', '#94a3b8')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

  }, [property]);

  return (
    <div className="w-full h-full flex flex-col items-center">
      <svg ref={svgRef} viewBox="0 0 600 400" className="w-full h-auto" />
      <div className="mt-6 p-4 bg-slate-600/10 border border-slate-500/20 rounded-xl w-full">
        <p className="text-[10px] text-slate-400 font-mono leading-relaxed uppercase">
          GADRAEL DEFENSE [{property?.name || 'TARGET'}]: Structural and legal buffers are within safe tolerances. Current rating: {(property?.square_feet > 0 ? 84.2 : 62.5).toFixed(1)}%.
        </p>
      </div>
    </div>
  );
};

export default GadraelRiskShield;
