'use client';
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { pulseRNG } from '@/lib/core/pulseRNG';
import { useProperties } from '@/hooks/useProperties';

const RandomChart = ({ type = 'heatmap' }) => {
  const chartRef = useRef(null);
  const { properties } = useProperties();

  useEffect(() => {
    if (!chartRef.current) return;

    // Clear previous
    d3.select(chartRef.current).selectAll('*').remove();

    // Create Tooltip
    const tooltip = d3.select(chartRef.current)
      .append('div')
      .style('opacity', 0)
      .attr('class', 'tooltip')
      .style('background-color', 'rgba(15, 23, 42, 0.9)')
      .style('color', 'white')
      .style('border', '1px solid rgba(59, 130, 246, 0.5)')
      .style('border-radius', '8px')
      .style('padding', '10px')
      .style('position', 'absolute')
      .style('pointer-events', 'none')
      .style('font-size', '10px')
      .style('font-family', 'monospace')
      .style('z-index', '100')
      .style('backdrop-filter', 'blur(4px)')
      .style('box-shadow', '0 10px 15px -3px rgba(0, 0, 0, 0.1)');

    const margin = { top: 30, right: 30, bottom: 70, left: 80 };
    const width = 600 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const svg = d3.select(chartRef.current)
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    if (type === 'heatmap') {
      const regions = properties.length > 0 
        ? [...new Set(properties.map(p => p.location?.city || 'Other'))].slice(0, 5)
        : ['North', 'South', 'East', 'West', 'Central'];
      
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
      
      const data = [];
      regions.forEach(r => {
        months.forEach(m => {
          const regionProps = properties.filter(p => p.location?.city === r);
          const baseVal = regionProps.length > 0 
            ? d3.mean(regionProps, p => p.rates?.monthly || (p.rates?.nightly * 30)) || 1000
            : 1000;
          
          data.push({ region: r, month: m, value: pulseRNG.range(baseVal * 0.8, baseVal * 1.2) });
        });
      });

      const x = d3.scaleBand()
        .range([0, width])
        .domain(months)
        .padding(0.05);
      
      svg.append('g')
        .attr('transform', `translate(0, ${height})`)
        .call(d3.axisBottom(x))
        .attr('font-size', '10px');

      const y = d3.scaleBand()
        .range([height, 0])
        .domain(regions)
        .padding(0.05);
      
      svg.append('g')
        .call(d3.axisLeft(y))
        .attr('font-size', '10px');

      const myColor = d3.scaleLinear()
        .range(['#1e293b', '#3b82f6']) 
        .domain([d3.min(data, d => d.value), d3.max(data, d => d.value)]);

      svg.selectAll()
        .data(data, d => d.month + ':' + d.region)
        .enter()
        .append('rect')
        .attr('x', d => x(d.month))
        .attr('y', d => y(d.region))
        .attr('width', x.bandwidth())
        .attr('height', y.bandwidth())
        .style('fill', d => myColor(d.value))
        .style('stroke-width', 2)
        .style('stroke', 'none')
        .style('opacity', 0.8)
        .on('mouseover', function(event, d) {
          tooltip.style('opacity', 1);
          d3.select(this)
            .style('stroke', '#60a5fa')
            .style('opacity', 1);
        })
        .on('mousemove', function(event, d) {
          tooltip
            .html(`
              <div style="color: #60a5fa; font-weight: 800; margin-bottom: 4px;">MARKET HUB: ${d.region.toUpperCase()}</div>
              <div style="opacity: 0.6;">Period: ${d.month}</div>
              <div style="font-size: 12px; margin-top: 4px;">Intensity: <span style="color: #34d399;">$${d.value.toFixed(0)}</span></div>
            `)
            .style('left', (event.pageX - chartRef.current.getBoundingClientRect().left + 20) + 'px')
            .style('top', (event.pageY - chartRef.current.getBoundingClientRect().top - 40) + 'px');
        })
        .on('mouseleave', function(event, d) {
          tooltip.style('opacity', 0);
          d3.select(this)
            .style('stroke', 'none')
            .style('opacity', 0.8);
        });

      svg.append('text')
        .attr('x', 0)
        .attr('y', -10)
        .attr('text-anchor', 'left')
        .style('font-size', '12px')
        .style('font-weight', '900')
        .style('fill', '#94a3b8')
        .style('text-transform', 'uppercase')
        .style('letter-spacing', '0.1em')
        .text('Price Intensity by Market Hub');

    } else if (type === 'bar') {
      const cityGroups = d3.group(properties, p => p.location?.city || 'Unknown');
      
      const data = Array.from(cityGroups, ([city, props]) => {
        const avgYield = 6.0 + (pulseRNG.next() * 2); 
        return { city, yield: avgYield };
      }).slice(0, 8);

      if (data.length === 0) {
        ['Decatur', 'Dallas', 'Austin', 'Fort Worth'].forEach(c => {
          data.push({ city: c, yield: 5.42 + pulseRNG.range(-1, 1) });
        });
      }

      const x = d3.scaleBand()
        .range([0, width])
        .domain(data.map(d => d.city))
        .padding(0.2);
      
      svg.append('g')
        .attr('transform', `translate(0, ${height})`)
        .call(d3.axisBottom(x))
        .selectAll('text')
        .attr('transform', 'translate(-10,0)rotate(-45)')
        .style('text-anchor', 'end')
        .attr('font-size', '10px');

      const y = d3.scaleLinear()
        .domain([0, 10])
        .range([height, 0]);
      
      svg.append('g')
        .call(d3.axisLeft(y))
        .attr('font-size', '10px');

      svg.selectAll('mybar')
        .data(data)
        .enter()
        .append('rect')
        .attr('x', d => x(d.city))
        .attr('y', d => y(d.yield))
        .attr('width', x.bandwidth())
        .attr('height', d => height - y(d.yield))
        .attr('fill', '#3b82f6')
        .attr('rx', 4)
        .style('opacity', 0.8)
        .on('mouseover', function(event, d) {
          tooltip.style('opacity', 1);
          d3.select(this).style('opacity', 1).attr('fill', '#60a5fa');
        })
        .on('mousemove', function(event, d) {
          tooltip
            .html(`
              <div style="color: #60a5fa; font-weight: 800; margin-bottom: 4px;">CITY: ${d.city.toUpperCase()}</div>
              <div style="font-size: 12px;">Projected Yield: <span style="color: #34d399;">${d.yield.toFixed(2)}%</span></div>
            `)
            .style('left', (event.pageX - chartRef.current.getBoundingClientRect().left + 20) + 'px')
            .style('top', (event.pageY - chartRef.current.getBoundingClientRect().top - 40) + 'px');
        })
        .on('mouseleave', function(event, d) {
          tooltip.style('opacity', 0);
          d3.select(this).style('opacity', 0.8).attr('fill', '#3b82f6');
        });

      svg.append('text')
        .attr('x', 0)
        .attr('y', -10)
        .attr('text-anchor', 'left')
        .style('font-size', '12px')
        .style('font-weight', '900')
        .style('fill', '#94a3b8')
        .style('text-transform', 'uppercase')
        .style('letter-spacing', '0.1em')
        .text('Regional Rental Yield (%)');
    }

  }, [type, properties]);

  return (
    <div className='bg-slate-950/50 p-4 rounded-3xl border border-white/5 shadow-2xl relative overflow-visible'>
      <div ref={chartRef} className="relative"></div>
    </div>
  );
};

export default RandomChart;
