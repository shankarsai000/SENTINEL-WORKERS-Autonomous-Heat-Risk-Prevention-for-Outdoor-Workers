import React, { useState, useEffect } from 'react';
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

interface CoolingStation {
  station_id: string;
  site_id: string;
  zone_id: string;
  name: string;
  type: 'shade' | 'water' | 'mist' | 'ac_trailer';
  latitude: number;
  longitude: number;
  capacity: number;
  current_occupancy: number;
  status: 'AVAILABLE' | 'NEAR_CAPACITY' | 'FULL' | 'OFFLINE';
}

export const SpatialMapView: React.FC<SpatialMapViewProps> = ({
  selectedWorkerId,
  onSelectWorker = () => {},
}) => {
  const [selectedZone, setSelectedZone] = useState<string>('ZONE-A');
  const [showWorkers, setShowWorkers] = useState<boolean>(true);
  const [showCooling, setShowCooling] = useState<boolean>(true);
  const [showThermal, setShowThermal] = useState<boolean>(true);
  const [showMedical, setShowMedical] = useState<boolean>(true);
  const [coolingStations, setCoolingStations] = useState<CoolingStation[]>([]);
  const [selectedStation, setSelectedStation] = useState<CoolingStation | null>(null);

  // Fetch cooling stations from API
  useEffect(() => {
    fetch('/api/cooling/stations?site_id=PHX-SITE-01')
      .then((r) => r.json())
      .then((data) => {
        if (data && data.stations) {
          setCoolingStations(data.stations);
        }
      })
      .catch(() => {});
  }, []);

  const zones = [
    { id: 'ZONE-A', name: 'Zone A', desc: 'Open Excavation', temp: '44.2°C', workers: 24, risk: 'HIGH', color: 'red' },
    { id: 'ZONE-B', name: 'Zone B', desc: 'Structural Concrete', temp: '38.6°C', workers: 38, risk: 'ELEVATED', color: 'amber' },
    { id: 'ZONE-C', name: 'Zone C', desc: 'Steel Framing', temp: '36.8°C', workers: 31, risk: 'WATCH', color: 'sky' },
    { id: 'ZONE-D', name: 'Zone D', desc: 'Shaded Staging', temp: '30.4°C', workers: 20, risk: 'SAFE', color: 'emerald' },
  ];

  // Worker dots per zone
  const zoneADots = [
    { id: 'WRK-0043', x: 28, y: 28, c: '#f97316' }, { id: 'WRK-0059', x: 31, y: 27, c: '#f59e0b' },
    { id: 'WRK-0188', x: 34, y: 29, c: '#f97316' }, { id: 'WRK-0219', x: 27, y: 32, c: '#f59e0b' },
    { id: 'WRK-0284', x: 30, y: 31, c: '#f97316' }, { id: 'WRK-0367', x: 33, y: 33, c: '#f59e0b' },
    { id: 'WRK-0475', x: 36, y: 31, c: '#f97316' }, { id: 'WRK-0108', x: 26, y: 36, c: '#10b981' },
    { id: 'WRK-0109', x: 29, y: 35, c: '#f59e0b' }, { id: 'WRK-0110', x: 32, y: 37, c: '#f97316' },
    { id: 'WRK-0111', x: 35, y: 35, c: '#10b981' }, { id: 'WRK-0112', x: 38, y: 36, c: '#f59e0b' },
    { id: 'WRK-0113', x: 27, y: 40, c: '#f59e0b' }, { id: 'WRK-0114', x: 30, y: 41, c: '#f97316' },
    { id: 'WRK-0115', x: 33, y: 39, c: '#10b981' }, { id: 'WRK-0116', x: 36, y: 41, c: '#f59e0b' },
    { id: 'WRK-0117', x: 29, y: 45, c: '#10b981' }, { id: 'WRK-0118', x: 32, y: 44, c: '#f97316' },
    { id: 'WRK-0119', x: 35, y: 45, c: '#10b981' },
  ];
  const zoneBDots = [
    { id: 'WRK-0201', x: 70, y: 24, c: '#10b981' }, { id: 'WRK-0202', x: 74, y: 23, c: '#10b981' },
    { id: 'WRK-0203', x: 77, y: 25, c: '#10b981' }, { id: 'WRK-0204', x: 68, y: 27, c: '#10b981' },
    { id: 'WRK-0205', x: 72, y: 28, c: '#f59e0b' }, { id: 'WRK-0206', x: 76, y: 27, c: '#10b981' },
    { id: 'WRK-0207', x: 80, y: 29, c: '#10b981' }, { id: 'WRK-0208', x: 69, y: 32, c: '#10b981' },
    { id: 'WRK-0209', x: 73, y: 32, c: '#f59e0b' }, { id: 'WRK-0210', x: 77, y: 33, c: '#10b981' },
  ];
  const zoneCDots = [
    { id: 'WRK-0301', x: 53, y: 55, c: '#38bdf8' }, { id: 'WRK-0302', x: 57, y: 54, c: '#10b981' },
    { id: 'WRK-0303', x: 55, y: 58, c: '#10b981' }, { id: 'WRK-0304', x: 58, y: 59, c: '#38bdf8' },
    { id: 'WRK-0305', x: 54, y: 62, c: '#10b981' }, { id: 'WRK-0306', x: 57, y: 63, c: '#10b981' },
  ];
  const zoneDDots = [
    { id: 'WRK-0401', x: 73, y: 55, c: '#10b981' }, { id: 'WRK-0402', x: 77, y: 54, c: '#10b981' },
    { id: 'WRK-0403', x: 75, y: 58, c: '#10b981' }, { id: 'WRK-0404', x: 78, y: 59, c: '#10b981' },
    { id: 'WRK-0405', x: 74, y: 62, c: '#10b981' }, { id: 'WRK-0406', x: 77, y: 63, c: '#10b981' },
  ];

  // Cooling station coordinate mappings on SVG viewport [0-100, 0-68]
  const stationSVGCoords = [
    { id: 'CS-001', x: 23, y: 24, type: 'shade', label: 'A Shade' },
    { id: 'CS-002', x: 39, y: 26, type: 'water', label: 'A Water' },
    { id: 'CS-003', x: 25, y: 46, type: 'mist', label: 'A Mist' },
    { id: 'CS-004', x: 38, y: 44, type: 'ac_trailer', label: 'A AC Trailer' },
    { id: 'CS-005', x: 65, y: 20, type: 'shade', label: 'B Shade' },
    { id: 'CS-006', x: 82, y: 22, type: 'water', label: 'B Water' },
    { id: 'CS-007', x: 66, y: 38, type: 'mist', label: 'B Mist' },
    { id: 'CS-008', x: 83, y: 37, type: 'ac_trailer', label: 'B AC Trailer' },
    { id: 'CS-009', x: 49, y: 52, type: 'shade', label: 'C Shade' },
    { id: 'CS-010', x: 62, y: 53, type: 'water', label: 'C Water' },
    { id: 'CS-011', x: 50, y: 65, type: 'mist', label: 'C Mist' },
    { id: 'CS-012', x: 61, y: 65, type: 'ac_trailer', label: 'C AC Trailer' },
    { id: 'CS-013', x: 70, y: 52, type: 'shade', label: 'D Shade' },
    { id: 'CS-014', x: 82, y: 53, type: 'water', label: 'D Water' },
    { id: 'CS-015', x: 71, y: 65, type: 'mist', label: 'D Mist' },
    { id: 'CS-016', x: 82, y: 65, type: 'ac_trailer', label: 'D AC Trailer' },
  ];

  const riskBadge = (r: string) => {
    const c: Record<string, string> = {
      HIGH: 'bg-red-500/15 text-red-400 border-red-500/30',
      ELEVATED: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      WATCH: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
      SAFE: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    };
    return c[r] || c['SAFE'];
  };

  const getStationTypeIcon = (type: string) => {
    switch (type) {
      case 'water': return '💧';
      case 'mist': return '💨';
      case 'ac_trailer': return '❄️';
      default: return '⛺';
    }
  };

  return (
    <div className="space-y-6 w-full">
      {/* Top Header & Layer Toggles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Spatial Risk Heatmap & Cooling Studio</h1>
          <p className="text-xs text-slate-400 mt-0.5">Live vector map telemetry, microclimate thermal zones & cooling stations</p>
        </div>
        
        {/* Layer Toggles & Status Pill */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowWorkers(!showWorkers)}
            className={`px-2.5 py-1 rounded-xl text-xs font-semibold border transition cursor-pointer ${
              showWorkers ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 shadow-sm' : 'bg-slate-900 text-slate-500 border-slate-800'
            }`}
          >
            👷 Workers {showWorkers ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={() => setShowCooling(!showCooling)}
            className={`px-2.5 py-1 rounded-xl text-xs font-semibold border transition cursor-pointer ${
              showCooling ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm' : 'bg-slate-900 text-slate-500 border-slate-800'
            }`}
          >
            ❄️ Cooling {showCooling ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={() => setShowThermal(!showThermal)}
            className={`px-2.5 py-1 rounded-xl text-xs font-semibold border transition cursor-pointer ${
              showThermal ? 'bg-orange-500/20 text-orange-300 border-orange-500/40 shadow-sm' : 'bg-slate-900 text-slate-500 border-slate-800'
            }`}
          >
            🔥 Isotherms {showThermal ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={() => setShowMedical(!showMedical)}
            className={`px-2.5 py-1 rounded-xl text-xs font-semibold border transition cursor-pointer ${
              showMedical ? 'bg-red-500/20 text-red-300 border-red-500/40 shadow-sm' : 'bg-slate-900 text-slate-500 border-slate-800'
            }`}
          >
            🚑 Medical {showMedical ? 'ON' : 'OFF'}
          </button>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            FortyGuard Live: 35.0°C
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Studio Canvas: 8 cols on desktop */}
        <div className="lg:col-span-8 bg-slate-900 rounded-2xl border border-slate-800/60 overflow-hidden shadow-xl relative">
          <div className="p-4 sm:p-6">
            <svg viewBox="0 0 100 68" className="w-full h-auto max-h-[540px]" preserveAspectRatio="xMidYMid meet">
              <defs>
                <pattern id="g" width="5" height="5" patternUnits="userSpaceOnUse">
                  <path d="M 5 0 L 0 0 0 5" fill="none" stroke="rgba(51,65,85,0.3)" strokeWidth="0.25" />
                </pattern>
                <radialGradient id="ha" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="rgba(239,68,68,0.25)" />
                  <stop offset="100%" stopColor="rgba(0,0,0,0)" />
                </radialGradient>
                <radialGradient id="hb" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="rgba(245,158,11,0.20)" />
                  <stop offset="100%" stopColor="rgba(0,0,0,0)" />
                </radialGradient>
                <radialGradient id="hc" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="rgba(56,189,248,0.12)" />
                  <stop offset="100%" stopColor="rgba(0,0,0,0)" />
                </radialGradient>
                <radialGradient id="hd" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="rgba(16,185,129,0.15)" />
                  <stop offset="100%" stopColor="rgba(0,0,0,0)" />
                </radialGradient>
              </defs>
              <rect width="100" height="68" fill="url(#g)" />

              {/* Zone A */}
              <g onClick={() => setSelectedZone('ZONE-A')} className="cursor-pointer" opacity={selectedZone === 'ZONE-A' ? 1 : 0.65}>
                {showThermal && <circle cx="32" cy="36" r="18" fill="url(#ha)" />}
                <circle cx="32" cy="36" r="18" fill="none" stroke={selectedZone === 'ZONE-A' ? '#ef4444' : 'rgba(239,68,68,0.4)'} strokeWidth={selectedZone === 'ZONE-A' ? 0.8 : 0.5} strokeDasharray="1.5,1" />
                <text x="32" y="22" textAnchor="middle" fill="#fff" fontSize="2.5" fontWeight="bold">Zone A</text>
                <text x="32" y="25" textAnchor="middle" fill="#94a3b8" fontSize="1.6">Open Excavation (44.2°C)</text>
                {showWorkers && zoneADots.map(d => (
                  <circle key={d.id} cx={d.x} cy={d.y} r={selectedWorkerId === d.id ? 1.4 : 0.85} fill={d.c}
                    stroke={selectedWorkerId === d.id ? '#fff' : 'rgba(0,0,0,0.4)'} strokeWidth={selectedWorkerId === d.id ? 0.4 : 0.15}
                    className="cursor-pointer" onClick={(e) => { e.stopPropagation(); onSelectWorker(d.id); }} />
                ))}
              </g>

              {/* Zone B */}
              <g onClick={() => setSelectedZone('ZONE-B')} className="cursor-pointer" opacity={selectedZone === 'ZONE-B' ? 1 : 0.65}>
                {showThermal && <circle cx="74" cy="30" r="15" fill="url(#hb)" />}
                <circle cx="74" cy="30" r="15" fill="none" stroke={selectedZone === 'ZONE-B' ? '#f59e0b' : 'rgba(245,158,11,0.3)'} strokeWidth={selectedZone === 'ZONE-B' ? 0.8 : 0.5} strokeDasharray="2,1.5" />
                <text x="74" y="18" textAnchor="middle" fill="#fff" fontSize="2.4" fontWeight="bold">Zone B</text>
                <text x="74" y="21" textAnchor="middle" fill="#94a3b8" fontSize="1.5">Structural Concrete (38.6°C)</text>
                {showWorkers && zoneBDots.map(d => (
                  <circle key={d.id} cx={d.x} cy={d.y} r={0.85} fill={d.c} stroke="rgba(0,0,0,0.4)" strokeWidth={0.15}
                    className="cursor-pointer" onClick={(e) => { e.stopPropagation(); onSelectWorker(d.id); }} />
                ))}
              </g>

              {/* Zone C */}
              <g onClick={() => setSelectedZone('ZONE-C')} className="cursor-pointer" opacity={selectedZone === 'ZONE-C' ? 1 : 0.65}>
                {showThermal && <circle cx="56" cy="58" r="10" fill="url(#hc)" />}
                <circle cx="56" cy="58" r="10" fill="none" stroke={selectedZone === 'ZONE-C' ? '#38bdf8' : 'rgba(56,189,248,0.25)'} strokeWidth={selectedZone === 'ZONE-C' ? 0.7 : 0.4} strokeDasharray="2,1.5" />
                <text x="56" y="49" textAnchor="middle" fill="#fff" fontSize="2.2" fontWeight="bold">Zone C</text>
                <text x="56" y="52" textAnchor="middle" fill="#94a3b8" fontSize="1.4">Steel Framing (36.8°C)</text>
                {showWorkers && zoneCDots.map(d => (
                  <circle key={d.id} cx={d.x} cy={d.y} r={0.85} fill={d.c} stroke="rgba(0,0,0,0.4)" strokeWidth={0.15}
                    className="cursor-pointer" onClick={(e) => { e.stopPropagation(); onSelectWorker(d.id); }} />
                ))}
              </g>

              {/* Zone D */}
              <g onClick={() => setSelectedZone('ZONE-D')} className="cursor-pointer" opacity={selectedZone === 'ZONE-D' ? 1 : 0.65}>
                {showThermal && <circle cx="76" cy="58" r="10" fill="url(#hd)" />}
                <circle cx="76" cy="58" r="10" fill="none" stroke={selectedZone === 'ZONE-D' ? '#10b981' : 'rgba(16,185,129,0.25)'} strokeWidth={selectedZone === 'ZONE-D' ? 0.7 : 0.4} strokeDasharray="2,1.5" />
                <text x="76" y="49" textAnchor="middle" fill="#fff" fontSize="2.2" fontWeight="bold">Zone D</text>
                <text x="76" y="52" textAnchor="middle" fill="#94a3b8" fontSize="1.4">Shaded Staging (30.4°C)</text>
                {showWorkers && zoneDDots.map(d => (
                  <circle key={d.id} cx={d.x} cy={d.y} r={0.85} fill={d.c} stroke="rgba(0,0,0,0.4)" strokeWidth={0.15}
                    className="cursor-pointer" onClick={(e) => { e.stopPropagation(); onSelectWorker(d.id); }} />
                ))}
              </g>

              {/* Cooling Station Icons */}
              {showCooling && stationSVGCoords.map((st) => {
                const liveData = coolingStations.find(s => s.station_id === st.id);
                const isFull = liveData?.status === 'FULL';
                const isNearCap = liveData?.status === 'NEAR_CAPACITY';
                const stColor = isFull ? '#ef4444' : isNearCap ? '#f59e0b' : '#10b981';

                return (
                  <g
                    key={st.id}
                    className="cursor-pointer group"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedStation(liveData || {
                        station_id: st.id,
                        site_id: 'PHX-SITE-01',
                        zone_id: `ZONE-PHX-SITE-01-${st.id.slice(3, 4)}`,
                        name: st.label,
                        type: st.type as any,
                        latitude: 33.448,
                        longitude: -112.074,
                        capacity: 12,
                        current_occupancy: 4,
                        status: 'AVAILABLE',
                      });
                    }}
                  >
                    <rect
                      x={st.x - 1.8}
                      y={st.y - 1.8}
                      width="3.6"
                      height="3.6"
                      rx="0.8"
                      fill="#0f172a"
                      stroke={stColor}
                      strokeWidth="0.35"
                    />
                    <text
                      x={st.x}
                      y={st.y + 0.8}
                      textAnchor="middle"
                      fontSize="1.8"
                      fill="#fff"
                    >
                      {getStationTypeIcon(st.type)}
                    </text>
                  </g>
                );
              })}
              {/* Predictive Medical Pre-Positioning Ambulance in Zone A */}
              {showMedical && (
                <g className="cursor-pointer">
                  <circle cx="16" cy="36" r="4.5" fill="rgba(239,68,68,0.2)" stroke="#ef4444" strokeWidth="0.3" strokeDasharray="1,0.8" />
                  <rect x="13.5" y="33.5" width="5" height="5" rx="1.2" fill="#7f1d1d" stroke="#ef4444" strokeWidth="0.4" />
                  <text x="16" y="37.2" textAnchor="middle" fontSize="2.8">🚑</text>
                  <text x="16" y="41" textAnchor="middle" fontSize="1.3" fill="#fca5a5" fontWeight="bold">Paramedic #4</text>
                </g>
              )}
            </svg>
          </div>

          {/* Legend */}
          <div className="px-5 py-3 border-t border-slate-800/60 bg-slate-950/40 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span> Safe</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span> Watch</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span> Elevated</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> High</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">⛺ Canopy</span>
              <span className="flex items-center gap-1">💧 Water</span>
              <span className="flex items-center gap-1">💨 Mist</span>
              <span className="flex items-center gap-1">❄️ AC Trailer</span>
            </div>
          </div>
        </div>

        {/* Right Telemetry Cards: 4 cols on desktop */}
        <div className="lg:col-span-4 space-y-4">
          {/* Selected Cooling Station Inspector if clicked */}
          {selectedStation && (
            <div className="bg-slate-900 rounded-2xl border border-sky-500/40 p-4 shadow-lg ring-1 ring-sky-500/20">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{getStationTypeIcon(selectedStation.type)}</span>
                  <div>
                    <h3 className="text-sm font-bold text-white">{selectedStation.name}</h3>
                    <p className="text-[11px] text-slate-400 font-mono">{selectedStation.station_id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedStation(null)}
                  className="text-slate-400 hover:text-white text-xs cursor-pointer p-1"
                >
                  ✕
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                <div className="bg-slate-950/60 p-2 rounded-xl">
                  <div className="text-slate-400">Occupancy</div>
                  <div className="font-bold text-white text-sm">{selectedStation.current_occupancy} / {selectedStation.capacity}</div>
                </div>
                <div className="bg-slate-950/60 p-2 rounded-xl">
                  <div className="text-slate-400">Status</div>
                  <div className={`font-bold text-sm ${
                    selectedStation.status === 'AVAILABLE' ? 'text-emerald-400' : selectedStation.status === 'NEAR_CAPACITY' ? 'text-amber-400' : 'text-red-400'
                  }`}>
                    {selectedStation.status.replace('_', ' ')}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Cooling Station Resource Summary */}
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800/80 p-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Cooling Resource Fleet (16 Units)</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-950/60 rounded-xl p-2.5 text-center">
                <div className="text-lg font-black text-emerald-400">
                  {coolingStations.filter(s => s.status === 'AVAILABLE').length || 12}
                </div>
                <div className="text-[11px] text-slate-400">Available Stations</div>
              </div>
              <div className="bg-slate-950/60 rounded-xl p-2.5 text-center">
                <div className="text-lg font-black text-sky-400">
                  {coolingStations.reduce((sum, s) => sum + s.capacity, 0) || 184}
                </div>
                <div className="text-[11px] text-slate-400">Total Worker Cap</div>
              </div>
            </div>
          </div>

          {/* Predictive Medical Pre-Positioning Card (Vision 2030 Tier 1) */}
          <div className="bg-slate-900/90 rounded-2xl border border-red-500/30 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                🚑 Predictive Medical Pre-Positioning
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/15 text-red-300 border border-red-500/30">
                ACTIVE
              </span>
            </div>
            <div className="text-xs text-slate-300">
              <strong className="text-white">Phoenix Paramedic Unit #4</strong> pre-positioned at Zone A perimeter.
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div className="bg-slate-950/60 p-2 rounded-xl">
                <div className="text-[10px] text-slate-400">Response Time</div>
                <div className="font-bold text-emerald-400 text-sm">4 min <span className="text-[10px] text-slate-500 line-through">42m</span></div>
              </div>
              <div className="bg-slate-950/60 p-2 rounded-xl">
                <div className="text-[10px] text-slate-400">Survival Efficacy</div>
                <div className="font-bold text-sky-400 text-sm">+90.5% Gain</div>
              </div>
            </div>
          </div>

          {/* Zone Telemetry */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
              Zone Thermal Telemetry
            </h2>
            {zones.map((z) => (
              <button
                key={z.id}
                onClick={() => setSelectedZone(z.id)}
                className={`w-full bg-slate-900 rounded-2xl border p-4 text-left transition-all cursor-pointer group ${
                  selectedZone === z.id
                    ? 'border-sky-500 ring-2 ring-sky-500/20 bg-sky-500/5'
                    : 'border-slate-800/60 hover:border-slate-700 hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-sm font-semibold text-white group-hover:text-sky-300 transition-colors">
                      {z.name}
                    </div>
                    <div className="text-xs text-slate-400">{z.desc}</div>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-lg text-xs font-semibold border ${riskBadge(z.risk)}`}>
                    {z.risk}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/50">
                  <span className="text-slate-300 font-medium">{z.workers} active workers</span>
                  <span className="font-semibold text-white">{z.temp}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
