import React, { useRef, useState } from 'react';
import { Point } from '../types';

interface FloorMapProps {
  onSelectLocation: (point: Point) => void;
  shots?: Point[]; // For visualizing past shots (optional)
}

const FloorMap: React.FC<FloorMapProps> = ({ onSelectLocation, shots = [] }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [indicator, setIndicator] = useState<Point | null>(null);

  const handleClick = (e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
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
    
    setTimeout(() => {
        onSelectLocation(point);
    }, 150);
  };

  return (
    <div className="relative w-full aspect-[0.85] max-h-[60vh] mx-auto bg-slate-800 rounded-lg overflow-hidden border-2 border-slate-600 shadow-xl">
      <svg
        ref={svgRef}
        viewBox="0 0 100 120"
        className="w-full h-full cursor-crosshair touch-none"
        onClick={handleClick}
        onTouchStart={(e) => {
            handleClick(e);
        }}
      >
        {/* Floor Surface - Concrete look */}
        <rect x="0" y="0" width="100" height="120" fill="#94a3b8" />

        {/* Boards / Rounded Corners */}
        <path
          d="M 5,0 L 5,110 Q 5,115 10,120 L 90,120 Q 95,115 95,110 L 95,0"
          fill="none"
          stroke="#1e293b"
          strokeWidth="2"
        />

        {/* Center Line (Top) */}
        <line x1="5" y1="0" x2="95" y2="0" stroke="#ef4444" strokeWidth="1" />

        {/* Restraining Line (approx 1/3 down in offensive zone) */}
        <line x1="5" y1="40" x2="95" y2="40" stroke="#ef4444" strokeWidth="1" />

        {/* Goal Line */}
        <line x1="5" y1="100" x2="95" y2="100" stroke="#ef4444" strokeWidth="1" />

        {/* 24-Foot Arc (Dotted) 
            Based on scale: Width 100 = 85ft. 
            24ft radius = approx 28.2 units.
            Center x=50, y=100.
        */}
        <path
            d="M 21.8,100 A 28.2,28.2 0 0 1 78.2,100"
            fill="none"
            stroke="#ef4444"
            strokeWidth="0.8"
            strokeDasharray="3,3"
            opacity="0.8"
        />

        {/* Crease (24ft diameter -> 9ft radius approx = 10.5 units) */}
        <path
            d="M 39.5,100 A 10.5,10.5 0 0 1 60.5,100" 
            fill="#cbd5e1" 
            fillOpacity="0.5"
            stroke="#3b82f6" 
            strokeWidth="1" 
        />
        
        {/* Goal Outline */}
        <rect x="42" y="100" width="16" height="4" fill="#cbd5e1" stroke="#ea580c" strokeWidth="1" />

        {/* Faceoff Dots - Moved deeper into zone and wider 
            Standard placement: ~24ft from boards, ~35ft from goal line 
        */}
        <circle cx="20" cy="55" r="1.5" fill="#ef4444" />
        <circle cx="80" cy="55" r="1.5" fill="#ef4444" />
        {/* Faceoff Rings */}
        <circle cx="20" cy="55" r="8" fill="none" stroke="#ef4444" strokeWidth="0.5" strokeDasharray="2,2" />
        <circle cx="80" cy="55" r="8" fill="none" stroke="#ef4444" strokeWidth="0.5" strokeDasharray="2,2" />

        {/* Existing Shots (Ghosted) with Numbers */}
        {shots.map((s, idx) => (
            <g key={idx}>
             <circle 
                cx={s.x} 
                cy={s.y} 
                r="3" 
                fill="rgba(30, 41, 59, 0.7)" 
                stroke="rgba(255,255,255,0.5)"
                strokeWidth="0.5"
            />
            <text 
                x={s.x} 
                y={s.y} 
                dy="1" 
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

        {/* Current Touch Indicator */}
        {indicator && (
            <circle 
                cx={indicator.x} 
                cy={indicator.y} 
                r="3" 
                fill="#10b981" 
                className="animate-ping"
            />
        )}
      </svg>
      <div className="absolute top-2 right-2 bg-slate-900/80 px-2 py-1 rounded text-xs font-mono text-slate-300 pointer-events-none">
        TAP ORIGIN
      </div>
    </div>
  );
};

export default FloorMap;