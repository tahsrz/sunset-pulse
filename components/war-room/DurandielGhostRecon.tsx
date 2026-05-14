'use client';

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface DurandielGhostReconProps {
  property?: any;
}

const DurandielGhostRecon: React.FC<DurandielGhostReconProps> = ({ property }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const data = [
      { label: "Privacy", value: 0.92, color: "#60a5fa" },
      { label: "Acoustic Silence", value: 0.75, color: "#3b82f6" },
      { label: "Spectral Flow", value: 0.88, color: "#2563eb" },
      { label: "Void Density", value: 0.15, color: "#1d4ed8" },
      { label: "Atmospheric Weight", value: 0.65, color: "#1e40af" }
    ];

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 800;
    const height = 400;
    const margin = { top: 40, right: 150, bottom: 40, left: 150 };

    const x = d3.scaleLinear().domain([0, 1]).range([margin.left, width - margin.right]);
    const y = d3.scaleBand().domain(data.map(d => d.label)).range([margin.top, height - margin.bottom]).padding(0.4);

    // Glow Filter
    const defs = svg.append('defs');
    const filter = defs.append('filter').attr('id', 'ghost-glow');
    filter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'blur');
    filter.append('feMerge').selectAll('feMergeNode').data(['blur', 'SourceGraphic']).enter().append('feMergeNode').attr('in', d => d);

    // Bars
    svg.selectAll('.bar')
      .data(data)
      .enter()
      .append('rect')
      .attr('x', margin.left)
      .attr('y', d => y(d.label)!)
      .attr('height', y.bandwidth())
      .attr('width', 0)
      .attr('fill', d => d.color)
      .attr('opacity', 0.6)
      .attr('rx', 4)
      .attr('filter', 'url(#ghost-glow)')
      .transition()
      .duration(1500)
      .delay((_, i) => i * 200)
      .attr('width', d => x(d.value) - margin.left);

    // Labels
    svg.selectAll('.label')
      .data(data)
      .enter()
      .append('text')
      .attr('x', margin.left - 15)
      .attr('y', d => y(d.label)! + y.bandwidth() / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'end')
      .attr('fill', '#94a3b8')
      .attr('font-size', '10px')
      .attr('class', 'font-mono uppercase font-black tracking-widest')
      .text(d => d.label);

    // Value Labels
    svg.selectAll('.value')
      .data(data)
      .enter()
      .append('text')
      .attr('x', d => x(d.value) + 15)
      .attr('y', d => y(d.label)! + y.bandwidth() / 2)
      .attr('dy', '0.35em')
      .attr('fill', '#fff')
      .attr('font-size', '12px')
      .attr('font-weight', '900')
      .attr('class', 'italic')
      .style('opacity', 0)
      .transition()
      .duration(1500)
      .delay((_, i) => i * 200)
      .style('opacity', 1)
      .text(d => `${(d.value * 100).toFixed(1)}%`);

  }, []);

  return (
    <div className="w-full h-full flex flex-col items-center">
      <svg ref={svgRef} viewBox="0 0 800 400" className="w-full h-auto" />
      <div className="mt-6 p-4 bg-white/5 border border-white/10 rounded-xl w-full">
        <p className="text-[10px] text-slate-400 font-mono leading-relaxed">
          DURANDIEL GHOST RECON: Sector silence achieved. Privacy index is peaking at 92%. No disturbing endpoints detected in the immediate spatial grid.
        </p>
      </div>
    </div>
  );
};

export default DurandielGhostRecon;
