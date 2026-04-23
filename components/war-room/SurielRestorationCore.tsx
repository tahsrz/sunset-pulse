'use client';

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const SurielRestorationCore = () => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 400;
    const height = 400;
    const centerX = width / 2;
    const centerY = height / 2;

    const g = svg.append('g').attr('transform', `translate(${centerX}, ${centerY})`);

    // Pulsing core circles
    const circles = [
      { r: 40, opacity: 0.8, duration: 2000 },
      { r: 80, opacity: 0.4, duration: 3000 },
      { r: 120, opacity: 0.1, duration: 4000 }
    ];

    g.selectAll('.core-circle')
      .data(circles)
      .enter()
      .append('circle')
      .attr('class', 'core-circle')
      .attr('r', d => d.r)
      .attr('fill', 'none')
      .attr('stroke', '#22c55e')
      .attr('stroke-width', 2)
      .attr('opacity', d => d.opacity)
      .style('filter', 'drop-shadow(0 0 10px rgba(34, 197, 94, 0.5))');

    // Rotating arcs
    const arcData = [
      { innerRadius: 140, outerRadius: 142, startAngle: 0, endAngle: Math.PI * 0.5, speed: 0.02 },
      { innerRadius: 150, outerRadius: 152, startAngle: Math.PI, endAngle: Math.PI * 1.5, speed: -0.015 },
      { innerRadius: 160, outerRadius: 162, startAngle: 0.5, endAngle: 2, speed: 0.01 }
    ];

    const arcs = g.selectAll('.restoration-arc')
      .data(arcData)
      .enter()
      .append('path')
      .attr('class', 'restoration-arc')
      .attr('fill', '#22c55e')
      .attr('opacity', 0.5);

    const arcGenerator = d3.arc();

    d3.timer((elapsed) => {
      g.selectAll('.core-circle')
        .attr('r', (d: any) => d.r + Math.sin(elapsed / d.duration) * 5);

      arcs.attr('d', (d: any) => {
        const rotation = elapsed * d.speed;
        return arcGenerator({
          innerRadius: d.innerRadius,
          outerRadius: d.outerRadius,
          startAngle: d.startAngle + rotation,
          endAngle: d.endAngle + rotation
        });
      });
    });

    // Central Text
    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('fill', '#fff')
      .attr('font-size', '24px')
      .attr('font-weight', '900')
      .attr('class', 'italic tracking-tighter')
      .text('94.8%');

    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '2em')
      .attr('fill', '#22c55e')
      .attr('font-size', '10px')
      .attr('class', 'font-mono uppercase font-black tracking-widest')
      .text('Synthesis Complete');

  }, []);

  return (
    <div className="w-full h-full flex flex-col items-center">
      <svg ref={svgRef} viewBox="0 0 400 400" className="w-full max-w-[350px] h-auto" />
      <div className="mt-6 p-4 bg-emerald-600/10 border border-emerald-500/20 rounded-xl w-full">
        <p className="text-[10px] text-emerald-400 font-mono leading-relaxed text-center uppercase tracking-widest">
          SURIEL SYSTEM: Data gap reconciliation complete. High-fidelity asset profile synthesized.
        </p>
      </div>
    </div>
  );
};

export default SurielRestorationCore;
