'use client';
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { pulseRNG } from '@/lib/core/pulseRNG';

const RandomChart = ({ type = 'heatmap' }) => {
  const chartRef = useRef(null);

  useEffect(() => {
    if (!chartRef.current) return;

    // Clear previous
    d3.select(chartRef.current).selectAll('*').remove();

    const margin = { top: 30, right: 30, bottom: 70, left: 60 };
    const width = 600 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const svg = d3.select(chartRef.current)
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    if (type === 'heatmap') {
      //  Big-data generator for heatmap
      const regions = ['North', 'South', 'East', 'West', 'Central'];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const data = [];
      regions.forEach(r => {
        months.forEach(m => {
          data.push({ region: r, month: m, value: pulseRNG.int(500, 1500) });
        });
      });

      const x = d3.scaleBand()
        .range([0, width])
        .domain(months)
        .padding(0.01);
      
      svg.append('g')
        .attr('transform', `translate(0, ${height})`)
        .call(d3.axisBottom(x));

      const y = d3.scaleBand()
        .range([height, 0])
        .domain(regions)
        .padding(0.01);
      
      svg.append('g')
        .call(d3.axisLeft(y));

      const myColor = d3.scaleLinear()
        .range(['#fff5f0', '#67000d'])
        .domain([500, 1500]);

      svg.selectAll()
        .data(data, d => d.month + ':' + d.region)
        .enter()
        .append('rect')
        .attr('x', d => x(d.month))
        .attr('y', d => y(d.region))
        .attr('width', x.bandwidth())
        .attr('height', y.bandwidth())
        .style('fill', d => myColor(d.value));

      svg.append('text')
        .attr('x', 0)
        .attr('y', -10)
        .attr('text-anchor', 'left')
        .style('font-size', '18px')
        .style('fill', '#333')
        .text('Price Heatmap by Region');

    } else if (type === 'bar') {
      const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego'];
      const data = cities.map(city => ({
        city,
        yield: (pulseRNG.range(3, 8)).toFixed(2) // 3% to 8%
      }));

      const x = d3.scaleBand()
        .range([0, width])
        .domain(data.map(d => d.city))
        .padding(0.2);
      
      svg.append('g')
        .attr('transform', `translate(0, ${height})`)
        .call(d3.axisBottom(x))
        .selectAll('text')
        .attr('transform', 'translate(-10,0)rotate(-45)')
        .style('text-anchor', 'end');

      const y = d3.scaleLinear()
        .domain([0, 10])
        .range([height, 0]);
      
      svg.append('g')
        .call(d3.axisLeft(y));

      svg.selectAll('mybar')
        .data(data)
        .enter()
        .append('rect')
        .attr('x', d => x(d.city))
        .attr('y', d => y(d.yield))
        .attr('width', x.bandwidth())
        .attr('height', d => height - y(d.yield))
        .attr('fill', '#3b82f6');

      svg.append('text')
        .attr('x', 0)
        .attr('y', -10)
        .attr('text-anchor', 'left')
        .style('font-size', '18px')
        .style('fill', '#333')
        .text('Rental Yield Bar Chart (%)');
    }

  }, [type]);

  return (
    <div className='bg-white p-4 rounded-lg shadow-md overflow-x-auto'>
      <div ref={chartRef}></div>
    </div>
  );
};

export default RandomChart;
