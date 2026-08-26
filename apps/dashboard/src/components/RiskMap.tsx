import React, { useState } from 'react';
import { Incident } from '../types';

export interface MapZone {
  zone_id: string;
  name: string;
  x: number;
  y: number;
  radius: number;
  base_temp_delta: number;
}

export interface MapCoolingPoint {
  id: string;
  type: string;
  name: string;
  x: number;
  y: number;
  capacity: number;
}

export interface MapWorkerNode {
  worker_id: string;
  role: string;
  zone_id: string;
  x: number;
  y: number;
  current_risk_level: string;
  current_risk_score: number;
  predicted_risk_level: string;
  early_warning: boolean;
  action_status: string;
}

interface RiskMapProps {
  siteName?: string;
  zones?: MapZone[];
  coolingPoints?: MapCoolingPoint[];
  workers?: MapWorkerNode[];
  activeIncidents?: Incident[];
  selectedWorkerId: string | null;
  selectedIncidentId: string | null;
  onSelectWorker: (workerId: string) => void;
  onSelectIncident: (incidentId: string) => void;
}

export const RiskMap: React.FC<RiskMapProps> = ({
  selectedWorkerId,
  onSelectWorker,
}) => {
  const [hoveredDot, setHoveredDot] = useState<string | null>(null);

  // Exact worker clusters matching the visual reference image
  const zoneADots = [
    { id: 'WRK-0101', x: 28, y: 28, color: '#10b981' },
    { id: 'WRK-0102', x: 31, y: 27, color: '#f59e0b' },
    { id: 'WRK-0103', x: 34, y: 29, color: '#f97316' },
    { id: 'WRK-0104', x: 27, y: 32, color: '#f59e0b' },
    { id: 'WRK-0105', x: 30, y: 31, color: '#10b981' },
    { id: 'WRK-0106', x: 33, y: 33, color: '#f59e0b' },
    { id: 'WRK-0107', x: 36, y: 31, color: '#f97316' },
    { id: 'WRK-0108', x: 26, y: 36, color: '#10b981' },
    { id: 'WRK-0109', x: 29, y: 35, color: '#f59e0b' },
    { id: 'WRK-0110', x: 32, y: 37, color: '#f97316' },
    { id: 'WRK-0111', x: 35, y: 35, color: '#10b981' },
    { id: 'WRK-0112', x: 38, y: 36, color: '#f59e0b' },
    { id: 'WRK-0113', x: 27, y: 40, color: '#f59e0b' },
    { id: 'WRK-0114', x: 30, y: 41, color: '#f97316' },
    { id: 'WRK-0115', x: 33, y: 39, color: '#10b981' },
    { id: 'WRK-0116', x: 36, y: 41, color: '#f59e0b' },
    { id: 'WRK-0117', x: 29, y: 45, color: '#10b981' },
    { id: 'WRK-0118', x: 32, y: 44, color: '#f97316' },
    { id: 'WRK-0119', x: 35, y: 45, color: '#10b981' },
  ];

  const zoneBDots = [
    { id: 'WRK-0201', x: 70, y: 24, color: '#10b981' },
    { id: 'WRK-0202', x: 74, y: 23, color: '#10b981' },
    { id: 'WRK-0203', x: 77, y: 25, color: '#10b981' },
    { id: 'WRK-0204', x: 68, y: 27, color: '#10b981' },
    { id: 'WRK-0205', x: 72, y: 28, color: '#10b981' },
    { id: 'WRK-0206', x: 76, y: 27, color: '#10b981' },
    { id: 'WRK-0207', x: 80, y: 29, color: '#10b981' },
    { id: 'WRK-0208', x: 69, y: 32, color: '#10b981' },
    { id: 'WRK-0209', x: 73, y: 32, color: '#10b981' },
    { id: 'WRK-0210', x: 77, y: 33, color: '#10b981' },
    { id: 'WRK-0211', x: 71, y: 36, color: '#10b981' },
    { id: 'WRK-0212', x: 75, y: 37, color: '#10b981' },
    { id: 'WRK-0213', x: 78, y: 36, color: '#10b981' },
  ];

  const zoneCDots = [
    { id: 'WRK-0301', x: 53, y: 55, color: '#10b981' },
    { id: 'WRK-0302', x: 57, y: 54, color: '#10b981' },
    { id: 'WRK-0303', x: 55, y: 58, color: '#10b981' },
    { id: 'WRK-0304', x: 58, y: 59, color: '#10b981' },
    { id: 'WRK-0305', x: 54, y: 62, color: '#10b981' },
    { id: 'WRK-0306', x: 57, y: 63, color: '#10b981' },
  ];

  const zoneDDots = [
    { id: 'WRK-0401', x: 73, y: 55, color: '#10b981' },
    { id: 'WRK-0402', x: 77, y: 54, color: '#10b981' },
    { id: 'WRK-0403', x: 75, y: 58, color: '#10b981' },
    { id: 'WRK-0404', x: 78, y: 59, color: '#10b981' },
    { id: 'WRK-0405', x: 74, y: 62, color: '#10b981' },
    { id: 'WRK-0406', x: 77, y: 63, color: '#10b981' },
  ];

  return (
    <div className="bg-[#111828]/95 border border-[#1e293b]/70 rounded-xl p-3.5 flex flex-col justify-between h-full shadow-md relative overflow-hidden">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-[#1e293b]/60">
          <h2 className="text-xs font-bold text-white tracking-tight">Live Risk Map & Spatial Zones</h2>

          <div className="flex items-center space-x-3">
            {/* Legend */}
            <div className="flex items-center space-x-2 text-[10px] text-slate-400 font-medium">
              <span className="flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>Green</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
                <span>Watch</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                <span>Elevated</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                <span>High</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                <span>Critical</span>
              </span>
            </div>

            {/* Tools */}
            <div className="flex items-center space-x-1 text-slate-400">
              <button className="p-1 hover:text-white rounded hover:bg-[#1e293b]/60 transition">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </button>
              <button className="p-1 hover:text-white rounded hover:bg-[#1e293b]/60 transition">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Map SVG Canvas */}
        <div className="relative mt-2 bg-[#090e1a] rounded-xl border border-[#1e293b]/60 overflow-hidden flex items-center justify-center min-h-[300px]">
          <svg viewBox="0 0 100 68" className="w-full h-full p-1 select-none" preserveAspectRatio="xMidYMid meet">
            <defs>
              {/* Subtle Blueprint Grid */}
              <pattern id="mapGrid2" width="5" height="5" patternUnits="userSpaceOnUse">
                <path d="M 5 0 L 0 0 0 5" fill="none" stroke="rgba(30, 41, 59, 0.4)" strokeWidth="0.25" />
              </pattern>

              {/* Zone A Heat Radial Glow */}
              <radialGradient id="heatGlowZoneA2" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(239, 68, 68, 0.40)" />
                <stop offset="50%" stopColor="rgba(249, 115, 22, 0.22)" />
                <stop offset="85%" stopColor="rgba(249, 115, 22, 0.05)" />
                <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
              </radialGradient>

              {/* Zone B/C/D Subtle Cool Radial Glow */}
              <radialGradient id="coolGlow2" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(56, 189, 248, 0.12)" />
                <stop offset="80%" stopColor="rgba(56, 189, 248, 0.03)" />
                <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
              </radialGradient>
            </defs>

            {/* Grid */}
            <rect width="100" height="68" fill="url(#mapGrid2)" />

            {/* --- Zone A: Open Excavation (Hot Spot) --- */}
            <circle cx="32" cy="36" r="18" fill="url(#heatGlowZoneA2)" />
            <circle cx="32" cy="36" r="18" fill="none" stroke="rgba(239, 68, 68, 0.6)" strokeWidth="0.7" strokeDasharray="1.5,1" />
            <text x="32" y="21" textAnchor="middle" fill="#ffffff" fontSize="2.5" fontWeight="bold">Zone A</text>
            <text x="32" y="24" textAnchor="middle" fill="#94a3b8" fontSize="1.8">Open Excavation</text>

            {/* Zone A High Risk Cluster Badge */}
            <g transform="translate(24, 49)">
              <rect width="16" height="3.8" rx="1.9" fill="rgba(15, 23, 42, 0.92)" stroke="rgba(239, 68, 68, 0.75)" strokeWidth="0.5" />
              <text x="8" y="2.6" textAnchor="middle" fill="#fca5a5" fontSize="1.6" fontWeight="bold">
                ▲ HIGH (0 Affected)
              </text>
            </g>

            {/* --- Zone B: Structural Concrete --- */}
            <circle cx="74" cy="30" r="15" fill="url(#coolGlow2)" />
            <circle cx="74" cy="30" r="15" fill="none" stroke="rgba(56, 189, 248, 0.35)" strokeWidth="0.6" strokeDasharray="2,1.5" />
            <text x="74" y="18" textAnchor="middle" fill="#ffffff" fontSize="2.4" fontWeight="bold">Zone B</text>
            <text x="74" y="20.5" textAnchor="middle" fill="#94a3b8" fontSize="1.7">Structural Concrete</text>

            {/* Cooling Point in Zone B */}
            <g transform="translate(56, 27)">
              <circle cx="2.2" cy="2.2" r="2.0" fill="rgba(14, 165, 233, 0.25)" stroke="#38bdf8" strokeWidth="0.5" />
              <text x="2.2" y="2.9" textAnchor="middle" fill="#38bdf8" fontSize="1.8">❄️</text>
            </g>

            {/* --- Zone C: Steel Framing --- */}
            <circle cx="56" cy="58" r="10" fill="url(#coolGlow2)" />
            <circle cx="56" cy="58" r="10" fill="none" stroke="rgba(56, 189, 248, 0.3)" strokeWidth="0.5" strokeDasharray="2,1.5" />
            <text x="56" y="49" textAnchor="middle" fill="#ffffff" fontSize="2.2" fontWeight="bold">Zone C</text>
            <text x="56" y="51.5" textAnchor="middle" fill="#94a3b8" fontSize="1.6">Steel Framing</text>

            {/* Cooling Point in Zone C */}
            <g transform="translate(62, 43)">
              <circle cx="2.2" cy="2.2" r="2.0" fill="rgba(14, 165, 233, 0.25)" stroke="#38bdf8" strokeWidth="0.5" />
              <text x="2.2" y="2.9" textAnchor="middle" fill="#38bdf8" fontSize="1.8">❄️</text>
            </g>

            {/* --- Zone D: Shaded Staging Area --- */}
            <circle cx="76" cy="58" r="10" fill="url(#coolGlow2)" />
            <circle cx="76" cy="58" r="10" fill="none" stroke="rgba(56, 189, 248, 0.3)" strokeWidth="0.5" strokeDasharray="2,1.5" />
            <text x="76" y="49" textAnchor="middle" fill="#ffffff" fontSize="2.2" fontWeight="bold">Zone D</text>
            <text x="76" y="51.5" textAnchor="middle" fill="#94a3b8" fontSize="1.6">Shaded Staging Area</text>

            {/* Render Zone A Worker Dots */}
            {zoneADots.map((dot) => {
              const isSelected = selectedWorkerId === dot.id;
              const isHovered = hoveredDot === dot.id;
              return (
                <circle
                  key={dot.id}
                  cx={dot.x}
                  cy={dot.y}
                  r={isSelected ? 1.4 : isHovered ? 1.2 : 0.9}
                  fill={dot.color}
                  stroke={isSelected ? '#ffffff' : 'rgba(0,0,0,0.5)'}
                  strokeWidth={isSelected ? 0.4 : 0.15}
                  className="cursor-pointer transition-all hover:scale-125"
                  onMouseEnter={() => setHoveredDot(dot.id)}
                  onMouseLeave={() => setHoveredDot(null)}
                  onClick={() => onSelectWorker(dot.id)}
                />
              );
            })}

            {/* Render Zone B Worker Dots */}
            {zoneBDots.map((dot) => (
              <circle
                key={dot.id}
                cx={dot.x}
                cy={dot.y}
                r={0.9}
                fill={dot.color}
                stroke="rgba(0,0,0,0.4)"
                strokeWidth={0.15}
                className="cursor-pointer transition-all"
                onClick={() => onSelectWorker(dot.id)}
              />
            ))}

            {/* Render Zone C Worker Dots */}
            {zoneCDots.map((dot) => (
              <circle
                key={dot.id}
                cx={dot.x}
                cy={dot.y}
                r={0.9}
                fill={dot.color}
                stroke="rgba(0,0,0,0.4)"
                strokeWidth={0.15}
                className="cursor-pointer transition-all"
                onClick={() => onSelectWorker(dot.id)}
              />
            ))}

            {/* Render Zone D Worker Dots */}
            {zoneDDots.map((dot) => (
              <circle
                key={dot.id}
                cx={dot.x}
                cy={dot.y}
                r={0.9}
                fill={dot.color}
                stroke="rgba(0,0,0,0.4)"
                strokeWidth={0.15}
                className="cursor-pointer transition-all"
                onClick={() => onSelectWorker(dot.id)}
              />
            ))}
          </svg>
        </div>
      </div>

      {/* Map Bottom Bar */}
      <div className="flex items-center justify-between pt-2 border-t border-[#1e293b]/40 text-[10px] text-slate-400 mt-2">
        <div className="flex items-center space-x-1">
          <span className="text-slate-400 font-medium">Active Cooling Points:</span>
          <span className="text-white font-semibold">4 stations</span>
        </div>

        <div className="flex items-center space-x-1 text-slate-400 font-medium cursor-pointer hover:text-slate-200">
          <span>Spatial Density:</span>
          <span className="text-white font-semibold">113 workers tracked</span>
          <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
  );
};
