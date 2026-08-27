import React, { useState } from 'react';
import {
  Sun,
  Droplets,
  Wind,
  ShieldAlert,
  Thermometer,
  Radio,
  Layers,
  Users,
  Flame,
  Snowflake,
  Sparkles,
  CheckCircle2,
  Maximize2,
  Minimize2,
  RefreshCw,
} from 'lucide-react';
import { Incident } from '../../types.js';

interface SpatialMapViewProps {
  mapData?: any;
  incidents?: Incident[];
  latestObservation?: any;
  selectedWorkerId?: string | null;
  selectedIncidentId?: string | null;
  onSelectWorker?: (workerId: string) => void;
  onSelectIncident?: (incidentId: string) => void;
}

export const SpatialMapView: React.FC<SpatialMapViewProps> = ({
  selectedWorkerId,
  onSelectWorker = () => {},
}) => {
  const [selectedZone, setSelectedZone] = useState<string>('ZONE-A');
  const [layerThermal, setLayerThermal] = useState(true);
  const [layerDensity, setLayerDensity] = useState(true);
  const [layerCooling, setLayerCooling] = useState(true);
  const [hoveredDot, setHoveredDot] = useState<string | null>(null);
  const [coolingActionSent, setCoolingActionSent] = useState<string | null>(null);

  const zones = [
    {
      id: 'ZONE-A',
      name: 'Zone A: Open Excavation',
      activity: 'High Activity',
      temp: '44.2°C',
      humidity: '24%',
      wetBulb: '28.4°C',
      solar: '940 W/m²',
      workersTotal: 24,
      workerCounts: { high: 8, elevated: 10, watch: 4, green: 2 },
      riskLevel: 'HIGH',
      riskColor: 'rose',
      coolingStations: 1,
      status: 'Critical Solar Exposure',
    },
    {
      id: 'ZONE-B',
      name: 'Zone B: Structural Concrete',
      activity: 'Heavy Curing',
      temp: '38.6°C',
      humidity: '29%',
      wetBulb: '25.1°C',
      solar: '620 W/m²',
      workersTotal: 38,
      workerCounts: { high: 0, elevated: 4, watch: 8, green: 26 },
      riskLevel: 'ELEVATED',
      riskColor: 'amber',
      coolingStations: 2,
      status: 'Active Radiative Heat',
    },
    {
      id: 'ZONE-C',
      name: 'Zone C: Steel Framing',
      activity: 'Assembly',
      temp: '36.8°C',
      humidity: '31%',
      wetBulb: '24.2°C',
      solar: '510 W/m²',
      workersTotal: 31,
      workerCounts: { high: 0, elevated: 0, watch: 6, green: 25 },
      riskLevel: 'WATCH',
      riskColor: 'sky',
      coolingStations: 1,
      status: 'Moderate Reflective Load',
    },
    {
      id: 'ZONE-D',
      name: 'Zone D: Shaded Staging Area',
      activity: 'Break & Logistics',
      temp: '30.4°C',
      humidity: '38%',
      wetBulb: '20.8°C',
      solar: '110 W/m²',
      workersTotal: 20,
      workerCounts: { high: 0, elevated: 0, watch: 0, green: 20 },
      riskLevel: 'GREEN',
      riskColor: 'emerald',
      coolingStations: 4,
      status: 'Safe Thermal Margin',
    },
  ];

  // Worker scatter coordinates
  const zoneADots = [
    { id: 'WRK-0043', x: 28, y: 28, color: '#f97316' },
    { id: 'WRK-0059', x: 31, y: 27, color: '#f59e0b' },
    { id: 'WRK-0188', x: 34, y: 29, color: '#f97316' },
    { id: 'WRK-0219', x: 27, y: 32, color: '#f59e0b' },
    { id: 'WRK-0284', x: 30, y: 31, color: '#f97316' },
    { id: 'WRK-0367', x: 33, y: 33, color: '#f59e0b' },
    { id: 'WRK-0475', x: 36, y: 31, color: '#f97316' },
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
    { id: 'WRK-0205', x: 72, y: 28, color: '#f59e0b' },
    { id: 'WRK-0206', x: 76, y: 27, color: '#10b981' },
    { id: 'WRK-0207', x: 80, y: 29, color: '#10b981' },
    { id: 'WRK-0208', x: 69, y: 32, color: '#10b981' },
    { id: 'WRK-0209', x: 73, y: 32, color: '#f59e0b' },
    { id: 'WRK-0210', x: 77, y: 33, color: '#10b981' },
    { id: 'WRK-0211', x: 71, y: 36, color: '#10b981' },
    { id: 'WRK-0212', x: 75, y: 37, color: '#10b981' },
    { id: 'WRK-0213', x: 78, y: 36, color: '#10b981' },
  ];

  const zoneCDots = [
    { id: 'WRK-0301', x: 53, y: 55, color: '#38bdf8' },
    { id: 'WRK-0302', x: 57, y: 54, color: '#10b981' },
    { id: 'WRK-0303', x: 55, y: 58, color: '#10b981' },
    { id: 'WRK-0304', x: 58, y: 59, color: '#38bdf8' },
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

  const handleDeployCooling = (zoneName: string) => {
    setCoolingActionSent(zoneName);
    setTimeout(() => setCoolingActionSent(null), 3000);
  };

  return (
    <div className="space-y-5">
      {/* Toast Feedback */}
      {coolingActionSent && (
        <div className="p-3 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Dispatched Mobile Misting Unit to {coolingActionSent}.</span>
        </div>
      )}

      {/* Two-Column Split Studio */}
      <div className="grid grid-cols-12 gap-6 items-start">
        {/* Left Studio Canvas (8 cols) */}
        <div className="col-span-12 lg:col-span-8 bg-[#0a0f1d] border border-slate-800 rounded-2xl relative overflow-hidden shadow-2xl p-4 flex flex-col justify-between min-h-[580px]">
          {/* Top Controls Overlay inside Canvas */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/70 z-10">
            {/* Top-Left: Layer Toggles */}
            <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => setLayerThermal(!layerThermal)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                  layerThermal
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Thermal Isotherms</span>
              </button>

              <button
                onClick={() => setLayerDensity(!layerDensity)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                  layerDensity
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Worker Density</span>
              </button>

              <button
                onClick={() => setLayerCooling(!layerCooling)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                  layerCooling
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <Snowflake className="w-3.5 h-3.5" />
                <span>Cooling Stations</span>
              </button>
            </div>

            {/* Top-Right: FortyGuard Live Ingestion Pill */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-[11px] font-mono text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
              <span>FortyGuard Live Feed: <strong className="text-white">42.3°C Ambient</strong> | Freshness: <strong className="text-emerald-400">12s</strong></span>
            </div>
          </div>

          {/* Interactive Vector Blueprint SVG Canvas */}
          <div className="relative my-auto w-full flex items-center justify-center p-2">
            <svg
              viewBox="0 0 100 68"
              className="w-full h-full max-h-[440px] select-none"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                {/* Blueprint Grid */}
                <pattern id="studioMapGrid" width="5" height="5" patternUnits="userSpaceOnUse">
                  <path d="M 5 0 L 0 0 0 5" fill="none" stroke="rgba(30, 41, 59, 0.4)" strokeWidth="0.25" />
                </pattern>

                {/* Zone A Thermal Gradient */}
                <radialGradient id="heatGlowZoneA" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="rgba(239, 68, 68, 0.35)" />
                  <stop offset="50%" stopColor="rgba(249, 115, 22, 0.18)" />
                  <stop offset="85%" stopColor="rgba(249, 115, 22, 0.04)" />
                  <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
                </radialGradient>

                {/* Zone Cool Radial Gradient */}
                <radialGradient id="coolGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="rgba(56, 189, 248, 0.10)" />
                  <stop offset="80%" stopColor="rgba(56, 189, 248, 0.02)" />
                  <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
                </radialGradient>
              </defs>

              {/* Grid Background */}
              <rect width="100" height="68" fill="url(#studioMapGrid)" />

              {/* --- Zone A: Open Excavation --- */}
              <g
                onClick={() => setSelectedZone('ZONE-A')}
                className="cursor-pointer transition-opacity"
                opacity={selectedZone === 'ZONE-A' ? 1 : 0.75}
              >
                {layerThermal && <circle cx="32" cy="36" r="18" fill="url(#heatGlowZoneA)" />}
                <circle
                  cx="32"
                  cy="36"
                  r="18"
                  fill="none"
                  stroke={selectedZone === 'ZONE-A' ? '#f43f5e' : 'rgba(239, 68, 68, 0.6)'}
                  strokeWidth={selectedZone === 'ZONE-A' ? 1.0 : 0.7}
                  strokeDasharray="1.5,1"
                />
                <text x="32" y="21" textAnchor="middle" fill="#ffffff" fontSize="2.5" fontWeight="bold">
                  Zone A
                </text>
                <text x="32" y="24" textAnchor="middle" fill="#94a3b8" fontSize="1.8">
                  Open Excavation
                </text>

                {/* Zone A Risk Badge */}
                <g transform="translate(23.5, 49)">
                  <rect
                    width="17"
                    height="3.8"
                    rx="1.9"
                    fill="rgba(15, 23, 42, 0.95)"
                    stroke="rgba(239, 68, 68, 0.8)"
                    strokeWidth="0.5"
                  />
                  <text x="8.5" y="2.6" textAnchor="middle" fill="#fca5a5" fontSize="1.6" fontWeight="bold">
                    ▲ HIGH (44.2°C)
                  </text>
                </g>

                {/* Worker Dots */}
                {layerDensity &&
                  zoneADots.map((dot) => {
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
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectWorker(dot.id);
                        }}
                      />
                    );
                  })}
              </g>

              {/* --- Zone B: Structural Concrete --- */}
              <g
                onClick={() => setSelectedZone('ZONE-B')}
                className="cursor-pointer transition-opacity"
                opacity={selectedZone === 'ZONE-B' ? 1 : 0.75}
              >
                {layerThermal && <circle cx="74" cy="30" r="15" fill="url(#coolGlow)" />}
                <circle
                  cx="74"
                  cy="30"
                  r="15"
                  fill="none"
                  stroke={selectedZone === 'ZONE-B' ? '#38bdf8' : 'rgba(56, 189, 248, 0.4)'}
                  strokeWidth={selectedZone === 'ZONE-B' ? 1.0 : 0.6}
                  strokeDasharray="2,1.5"
                />
                <text x="74" y="18" textAnchor="middle" fill="#ffffff" fontSize="2.4" fontWeight="bold">
                  Zone B
                </text>
                <text x="74" y="20.5" textAnchor="middle" fill="#94a3b8" fontSize="1.7">
                  Structural Concrete
                </text>

                {/* Cooling Point in Zone B */}
                {layerCooling && (
                  <g transform="translate(56, 27)">
                    <circle cx="2.2" cy="2.2" r="2.0" fill="rgba(14, 165, 233, 0.25)" stroke="#38bdf8" strokeWidth="0.5" />
                    <text x="2.2" y="2.9" textAnchor="middle" fill="#38bdf8" fontSize="1.8">❄️</text>
                  </g>
                )}

                {/* Worker Dots */}
                {layerDensity &&
                  zoneBDots.map((dot) => (
                    <circle
                      key={dot.id}
                      cx={dot.x}
                      cy={dot.y}
                      r={0.9}
                      fill={dot.color}
                      stroke="rgba(0,0,0,0.4)"
                      strokeWidth={0.15}
                      className="cursor-pointer transition-all hover:scale-125"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectWorker(dot.id);
                      }}
                    />
                  ))}
              </g>

              {/* --- Zone C: Steel Framing --- */}
              <g
                onClick={() => setSelectedZone('ZONE-C')}
                className="cursor-pointer transition-opacity"
                opacity={selectedZone === 'ZONE-C' ? 1 : 0.75}
              >
                {layerThermal && <circle cx="56" cy="58" r="10" fill="url(#coolGlow)" />}
                <circle
                  cx="56"
                  cy="58"
                  r="10"
                  fill="none"
                  stroke={selectedZone === 'ZONE-C' ? '#38bdf8' : 'rgba(56, 189, 248, 0.35)'}
                  strokeWidth={selectedZone === 'ZONE-C' ? 0.9 : 0.5}
                  strokeDasharray="2,1.5"
                />
                <text x="56" y="49" textAnchor="middle" fill="#ffffff" fontSize="2.2" fontWeight="bold">
                  Zone C
                </text>
                <text x="56" y="51.5" textAnchor="middle" fill="#94a3b8" fontSize="1.6">
                  Steel Framing
                </text>

                {/* Cooling Point in Zone C */}
                {layerCooling && (
                  <g transform="translate(62, 43)">
                    <circle cx="2.2" cy="2.2" r="2.0" fill="rgba(14, 165, 233, 0.25)" stroke="#38bdf8" strokeWidth="0.5" />
                    <text x="2.2" y="2.9" textAnchor="middle" fill="#38bdf8" fontSize="1.8">❄️</text>
                  </g>
                )}

                {/* Worker Dots */}
                {layerDensity &&
                  zoneCDots.map((dot) => (
                    <circle
                      key={dot.id}
                      cx={dot.x}
                      cy={dot.y}
                      r={0.9}
                      fill={dot.color}
                      stroke="rgba(0,0,0,0.4)"
                      strokeWidth={0.15}
                      className="cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectWorker(dot.id);
                      }}
                    />
                  ))}
              </g>

              {/* --- Zone D: Shaded Staging Area --- */}
              <g
                onClick={() => setSelectedZone('ZONE-D')}
                className="cursor-pointer transition-opacity"
                opacity={selectedZone === 'ZONE-D' ? 1 : 0.75}
              >
                {layerThermal && <circle cx="76" cy="58" r="10" fill="url(#coolGlow)" />}
                <circle
                  cx="76"
                  cy="58"
                  r="10"
                  fill="none"
                  stroke={selectedZone === 'ZONE-D' ? '#10b981' : 'rgba(16, 185, 129, 0.35)'}
                  strokeWidth={selectedZone === 'ZONE-D' ? 0.9 : 0.5}
                  strokeDasharray="2,1.5"
                />
                <text x="76" y="49" textAnchor="middle" fill="#ffffff" fontSize="2.2" fontWeight="bold">
                  Zone D
                </text>
                <text x="76" y="51.5" textAnchor="middle" fill="#94a3b8" fontSize="1.6">
                  Shaded Staging
                </text>

                {/* Worker Dots */}
                {layerDensity &&
                  zoneDDots.map((dot) => (
                    <circle
                      key={dot.id}
                      cx={dot.x}
                      cy={dot.y}
                      r={0.9}
                      fill={dot.color}
                      stroke="rgba(0,0,0,0.4)"
                      strokeWidth={0.15}
                      className="cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectWorker(dot.id);
                      }}
                    />
                  ))}
              </g>
            </svg>
          </div>

          {/* Bottom Bar: Risk Legend */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-800/70 text-[11px] text-slate-400">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Safe
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-400"></span> Watch
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span> Elevated
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-orange-500"></span> High
              </span>
            </div>

            <span className="text-slate-500 font-mono">
              Spatial Density: 113 Workers Tracked
            </span>
          </div>
        </div>

        {/* Right Zone Telemetry Panel (4 cols) */}
        <div className="col-span-12 lg:col-span-4 space-y-3.5">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-cyan-400" />
              Zone Telemetry & Logistics
            </h3>
            <span className="text-[10px] font-mono text-slate-500">Click to focus</span>
          </div>

          {/* Stacked Zone Cards */}
          <div className="space-y-3">
            {zones.map((z) => {
              const isSelected = selectedZone === z.id;

              return (
                <div
                  key={z.id}
                  onClick={() => setSelectedZone(z.id)}
                  className={`border rounded-xl p-4 transition-all duration-200 cursor-pointer shadow-md ${
                    isSelected
                      ? 'bg-[#131b2e] border-sky-500 ring-1 ring-sky-500/40'
                      : 'bg-[#0e1424]/80 border-slate-800/80 hover:bg-[#111828] hover:border-slate-700'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/80">
                    <div>
                      <div className="text-xs font-bold text-slate-100">{z.name}</div>
                      <div className="text-[10px] text-slate-400 font-medium mt-0.5">{z.activity}</div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                        z.riskLevel === 'HIGH'
                          ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          : z.riskLevel === 'ELEVATED'
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          : z.riskLevel === 'WATCH'
                          ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                          : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {z.riskLevel} ({z.temp})
                    </span>
                  </div>

                  {/* Worker Count by Risk Level (Colored Dots) */}
                  <div className="py-2.5 flex items-center justify-between text-xs border-b border-slate-800/60">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400 font-medium">Workforce:</span>
                      <div className="flex items-center gap-1.5 text-[10px] font-mono">
                        {z.workerCounts.high > 0 && (
                          <span className="flex items-center gap-1 text-rose-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> {z.workerCounts.high}
                          </span>
                        )}
                        {z.workerCounts.elevated > 0 && (
                          <span className="flex items-center gap-1 text-amber-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> {z.workerCounts.elevated}
                          </span>
                        )}
                        {z.workerCounts.watch > 0 && (
                          <span className="flex items-center gap-1 text-sky-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span> {z.workerCounts.watch}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> {z.workerCounts.green}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-cyan-400 font-mono">
                      <Snowflake className="w-3 h-3" />
                      <span>{z.coolingStations} stations</span>
                    </div>
                  </div>

                  {/* FortyGuard Microclimate Parameters */}
                  <div className="grid grid-cols-3 gap-2 pt-2.5 text-center text-xs">
                    <div className="bg-[#090e1a] p-1.5 rounded-lg border border-slate-800">
                      <div className="text-[9px] text-slate-500 uppercase">Ambient</div>
                      <div className="font-mono font-bold text-white text-[11px] mt-0.5">{z.temp}</div>
                    </div>

                    <div className="bg-[#090e1a] p-1.5 rounded-lg border border-slate-800">
                      <div className="text-[9px] text-slate-500 uppercase">Wet Bulb</div>
                      <div className="font-mono font-bold text-sky-300 text-[11px] mt-0.5">{z.wetBulb}</div>
                    </div>

                    <div className="bg-[#090e1a] p-1.5 rounded-lg border border-slate-800">
                      <div className="text-[9px] text-slate-500 uppercase">Solar</div>
                      <div className="font-mono font-bold text-amber-300 text-[11px] mt-0.5">{z.solar}</div>
                    </div>
                  </div>

                  {/* Action Trigger for High/Elevated Zones */}
                  {z.riskLevel === 'HIGH' && (
                    <div className="mt-3 pt-2.5 border-t border-slate-800/80">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeployCooling(z.name);
                        }}
                        className="w-full py-1.5 px-3 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Snowflake className="w-3.5 h-3.5" />
                        <span>Dispatch Mobile Misting Unit</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
