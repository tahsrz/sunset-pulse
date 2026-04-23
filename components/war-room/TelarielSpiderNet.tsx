'use client';

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const TelarielSpiderNet = () => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    // Data for "Network of Influence"
    const nodes = [
      { id: "Property", group: 1, radius: 15 },
      { id: "Seller", group: 2, radius: 10 },
      { id: "Local News", group: 3, radius: 8 },
      { id: "Reddit /r/RealEstate", group: 3, radius: 8 },
      { id: "Zoning Board", group: 2, radius: 10 },
      { id: "Nextdoor", group: 3, radius: 8 },
      { id: "Tax Records", group: 2, radius: 10 },
      { id: "Competitor 1", group: 4, radius: 6 },
      { id: "Competitor 2", group: 4, radius: 6 },
    ];

    const links = [
      { source: "Property", target: "Seller" },
      { source: "Property", target: "Local News" },
      { source: "Property", target: "Zoning Board" },
      { source: "Property", target: "Tax Records" },
      { source: "Seller", target: "Nextdoor" },
      { source: "Local News", target: "Reddit /r/RealEstate" },
      { source: "Zoning Board", target: "Competitor 1" },
      { source: "Tax Records", target: "Competitor 2" },
      { source: "Reddit /r/RealEstate", target: "Property" },
    ];

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 800;
    const height = 400;

    const simulation = d3.forceSimulation(nodes as any)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2));

    const link = svg.append("g")
      .attr("stroke", "#a855f7")
      .attr("stroke-opacity", 0.3)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", 1);

    const node = svg.append("g")
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("r", d => d.radius)
      .attr("fill", d => {
        if (d.group === 1) return "#a855f7";
        if (d.group === 2) return "#3b82f6";
        if (d.group === 3) return "#22c55e";
        return "#64748b";
      })
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .style("filter", "drop-shadow(0 0 5px rgba(168, 85, 247, 0.5))");

    const label = svg.append("g")
      .selectAll("text")
      .data(nodes)
      .join("text")
      .text(d => d.id)
      .attr("font-size", "10px")
      .attr("fill", "#94a3b8")
      .attr("dx", 15)
      .attr("dy", 4)
      .attr("class", "font-mono uppercase font-black tracking-tighter");

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node
        .attr("cx", (d: any) => d.x)
        .attr("cy", (d: any) => d.y);

      label
        .attr("x", (d: any) => d.x)
        .attr("y", (d: any) => d.y);
    });

  }, []);

  return (
    <div className="w-full h-full flex flex-col items-center">
      <svg ref={svgRef} viewBox="0 0 800 400" className="w-full h-auto" />
      <div className="mt-6 p-4 bg-purple-600/10 border border-purple-500/20 rounded-xl w-full">
        <p className="text-[10px] text-purple-400 font-mono leading-relaxed">
          TELARIEL INTEL: Sentiment nodes pulsing green in the /r/Dallas subreddit. Seller urgency detected via metadata decay in secondary tax records. Grid is live.
        </p>
      </div>
    </div>
  );
};

export default TelarielSpiderNet;
