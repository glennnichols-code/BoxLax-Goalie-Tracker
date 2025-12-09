import React, { useRef, useState, useEffect } from 'react';
import { Point, Shot, ShotResult } from '../types';
import * as d3 from 'd3';

interface GoalMapProps {
  onSelectPlacement?: (point: Point) => void;
  shots?: Shot[];
  heatmapMode?: boolean;
  activePlacement?: Point | null;
}

const GoalMap: React.FC<GoalMapProps> = ({ onSelectPlacement, shots = [], heatmapMode = false, activePlacement }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [indicator, setIndicator] = useState<Point | null>(null);

  // Sync internal indicator with external activePlacement if provided
  useEffect(() => {
    if (activePlacement) {
        setIndicator(activePlacement);
    }
  }, [activePlacement]);

  // D3 Heatmap Logic
  useEffect(() => {
    if (!heatmapMode || !svgRef.current || shots.length === 0) return;

    const svg = d3.select(svgRef.current);
    // Clear previous heatmap layers
    svg.select('.heatmap-layer').remove();

    const width = 100;
    const height = 80;

    const goals = shots.filter(s => s.result === ShotResult.GOAL && s.placement);
    
    if (goals.length === 0) return;

    const data = goals.map(s => [s.placement!.x, s.placement!.y] as [number, number]);

    // Compute density
    const densityData = d3.contourDensity()
      .x(d => d[0])
      .y(d => d[1])
      .size([width, height])
      .bandwidth(8) 
      .thresholds(10)
      (data);

    const g = svg.insert('g', '.heatmap-layer-target').attr('class', 'heatmap-layer');
    
    g.selectAll('path')
    .data(densityData)
    .enter().append('path')
    .attr('d', d3.geoPath())
    .attr('fill', '#ef4444') 
    .attr('fill-opacity', (d, i) => (i + 1) / densityData.length * 0.6)
    .attr('stroke', 'none');

  }, [shots, heatmapMode]);


  const handleClick = (e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
    if (!onSelectPlacement || heatmapMode) return;
    if (!svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }

    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;

    const point = { x, y };
    setIndicator(point);
    onSelectPlacement(point);
  };

  return (
    <div className="relative w-full aspect-[1.2] max-h-[50vh] mx-auto bg-slate-800 rounded-lg overflow-hidden border-2 border-slate-600 shadow-xl">
      <svg
        ref={svgRef}
        viewBox="0 0 100 80"
        className={`w-full h-full touch-none ${!heatmapMode ? 'cursor-crosshair' : ''}`}
        onClick={!heatmapMode ? handleClick : undefined}
        onTouchStart={!heatmapMode ? handleClick : undefined}
      >
        <defs>
            <pattern id="netPattern" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="4" stroke="#e2e8f0" strokeWidth="0.5" opacity="0.3" />
            </pattern>
        </defs>

        {/* Netting Background */}
        <g className="netting-layer">
            <rect x="10" y="10" width="80" height="70" fill="url(#netPattern)" />
            <rect x="10" y="10" width="80" height="70" fill="#000" fillOpacity="0.3" />
        </g>

        {/* Goal Frame */}
        {/* Top Bar */}
        <rect x="8" y="8" width="84" height="4" fill="#ef4444" rx="1" />
        {/* Left Post */}
        <rect x="8" y="8" width="4" height="72" fill="#ef4444" rx="1" />
        {/* Right Post */}
        <rect x="88" y="8" width="4" height="72" fill="#ef4444" rx="1" />

        {/* Goalie Graphic - Image Overlay */}
        <image 
            href="goalie.png" 
            x="15" 
            y="12" 
            width="70" 
            height="68" 
            preserveAspectRatio="xMidYMid meet"
            className="pointer-events-none opacity-80"
        />

        {/* Heatmap Container (Target for D3) */}
        <g className="heatmap-layer-target"></g>

        {/* Individual Shots (for summary view non-heatmap or basic view) */}
        {!heatmapMode && shots.map((s, idx) => s.placement && (
            <g key={idx}>
                <circle 
                    cx={s.placement.x}
                    cy={s.placement.y}
                    r="4"
                    fill={s.result === ShotResult.GOAL ? '#ef4444' : '#10b981'}
                    stroke="#fff"
                    strokeWidth="1"
                    opacity="0.9"
                />
                <text
                    x={s.placement.x}
                    y={s.placement.y}
                    dy="1.5"
                    textAnchor="middle"
                    fill="white"
                    fontSize="3.5"
                    fontWeight="bold"
                    className="pointer-events-none"
                >
                    {idx + 1}
                </text>
            </g>
        ))}

        {/* Indicator for current selection */}
        {indicator && (
             <circle 
                cx={indicator.x} 
                cy={indicator.y} 
                r="4" 
                fill="#fbbf24" 
                stroke="#fff"
                strokeWidth="2"
                className="animate-pulse"
            />
        )}
      </svg>
       <div className="absolute top-2 right-2 bg-slate-900/80 px-2 py-1 rounded text-xs font-mono text-slate-300 pointer-events-none">
        {heatmapMode ? 'GOAL DENSITY' : 'TAP PLACEMENT'}
      </div>
    </div>
  );
};

export default GoalMap;