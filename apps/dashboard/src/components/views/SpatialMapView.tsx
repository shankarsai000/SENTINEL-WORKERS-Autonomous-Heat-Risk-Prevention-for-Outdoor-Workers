import React, { useState } from 'react';
import { RiskMap } from '../RiskMap.js';
import { Incident } from '../../types.js';

interface SpatialMapViewProps {
  mapData: any;
  incidents: Incident[];
  latestObservation: any;
  selectedWorkerId: string | null;
  selectedIncidentId: string | null;
  onSelectWorker: (workerId: string) => void;
  onSelectIncident: (incidentId: string) => void;
}

export const SpatialMapView: React.FC<SpatialMapViewProps> = ({
  mapData,
  incidents,
  latestObservation,
  selectedWorkerId,
  selectedIncidentId,
  onSelectWorker,
  onSelectIncident,
}) => {
  const [selectedZoneFilter, setSelectedZoneFilter] = useState<string>('ALL');
  const [activeLayer, setActiveLayer] = useState<'THERMAL' | 'DENSITY' | 'COOLING'>('THERMAL');
  const [coolingActionSent, setCoolingActionSent] = useState<string | null>(null);

  const zones = [
    {
      id: 'ZONE-A',
      name: 'Zone A: Open Excavation',
      temp: '44.2°C',
      humidity: '24%',
      wetBulb: '28.4°C',
      solar: '940 W/m²',
      workers: 24,
      riskLevel: 'HIGH',
      riskColor: 'rose',
      status: 'Critical Solar Exposure',
      coolingStations: 1,
    },
    {
      id: 'ZONE-B',
      name: 'Zone B: Structural Concrete',
      temp: '38.6°C',
      humidity: '29%',
      wetBulb: '25.1°C',
      solar: '620 W/m²',
      workers: 38,
      riskLevel: 'ELEVATED',
      riskColor: 'amber',
      status: 'Active Radiative Heat',
      coolingStations: 2,
    },
    {
      id: 'ZONE-C',
      name: 'Zone C: Steel Framing',
      temp: '36.8°C',
      humidity: '31%',
      wetBulb: '24.2°C',
      solar: '510 W/m²',
      workers: 31,
      riskLevel: 'WATCH',
      riskColor: 'sky',
      status: 'Moderate Reflective Load',
      coolingStations: 1,
    },
    {
      id: 'ZONE-D',
      name: 'Zone D: Shaded Staging Area',
      temp: '30.4°C',
      humidity: '38%',
      wetBulb: '20.8°C',
      solar: '110 W/m²',
      workers: 20,
      riskLevel: 'GREEN',
      riskColor: 'emerald',
      status: 'Safe Thermal Margin',
      coolingStations: 4,
    },
  ];

  const handleDeployCooling = (zoneName: string) => {
    setCoolingActionSent(zoneName);
    setTimeout(() => setCoolingActionSent(null), 3000);
  };

  return (
    <div className="space-y-4">
      {/* Panel Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#0e1424] p-3.5 rounded-xl border border-[#1e293b]/70">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
            <h2 className="text-sm font-bold text-white tracking-wide uppercase">
              Live Spatial Risk & Microclimate Studio
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Hyperlocal spatial mapping with real-time thermal gradient and cooling logistics
          </p>
        </div>

        {/* Layer Toggles & Zone Filter */}
        <div className="flex items-center space-x-2.5">
          <div className="flex bg-[#111827] p-0.5 rounded-lg border border-[#1e293b]">
            <button
              onClick={() => setActiveLayer('THERMAL')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                activeLayer === 'THERMAL'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🔥 Thermal Heatmap
            </button>
            <button
              onClick={() => setActiveLayer('DENSITY')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                activeLayer === 'DENSITY'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              👥 Worker Density
            </button>
            <button
              onClick={() => setActiveLayer('COOLING')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                activeLayer === 'COOLING'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ❄️ Cooling Stations
            </button>
          </div>

          <div className="relative">
            <select
              value={selectedZoneFilter}
              onChange={(e) => setSelectedZoneFilter(e.target.value)}
              className="bg-[#111828] border border-[#1e293b] text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer pr-7 appearance-none font-medium"
            >
              <option value="ALL">All Microclimate Zones</option>
              <option value="ZONE-A">Zone A (Excavation)</option>
              <option value="ZONE-B">Zone B (Concrete)</option>
              <option value="ZONE-C">Zone C (Steel Framing)</option>
              <option value="ZONE-D">Zone D (Shaded Staging)</option>
            </select>
            <svg
              className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* 4 Microclimate Zone Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {zones.map((zone) => {
          const isSelected = selectedZoneFilter === 'ALL' || selectedZoneFilter === zone.id;
          return (
            <div
              key={zone.id}
              onClick={() => setSelectedZoneFilter(zone.id === selectedZoneFilter ? 'ALL' : zone.id)}
              className={`p-3.5 rounded-xl border transition cursor-pointer select-none ${
                isSelected
                  ? 'bg-[#0f172a] border-[#334155] shadow-lg shadow-black/30 ring-1 ring-blue-500/40'
                  : 'bg-[#0b101d]/60 border-[#1e293b]/50 opacity-60 hover:opacity-90'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">{zone.name.split(':')[0]}</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    zone.riskLevel === 'HIGH'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse'
                      : zone.riskLevel === 'ELEVATED'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : zone.riskLevel === 'WATCH'
                      ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  {zone.riskLevel}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-medium mt-0.5 truncate">
                {zone.name.split(':')[1]}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="bg-[#131b2e] p-2 rounded-lg border border-[#1e293b]/60">
                  <div className="text-[10px] text-slate-400">Ambient Temp</div>
                  <div className="text-sm font-bold text-white">{zone.temp}</div>
                </div>
                <div className="bg-[#131b2e] p-2 rounded-lg border border-[#1e293b]/60">
                  <div className="text-[10px] text-slate-400">Wet-Bulb</div>
                  <div className="text-sm font-bold text-cyan-300">{zone.wetBulb}</div>
                </div>
              </div>

              <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 border-t border-[#1e293b]/50 pt-2">
                <span>👥 {zone.workers} workers</span>
                <span>❄️ {zone.coolingStations} station</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Expansive Spatial Map Canvas + Zone Control Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
        {/* Large Canvas View (8 cols) */}
        <div className="lg:col-span-8 bg-[#0a0f1d] rounded-xl border border-[#1e293b] p-3 flex flex-col min-h-[560px]">
          <RiskMap
            siteName={mapData?.site_name || 'Sky Harbor Air Logistics Hub'}
            zones={mapData?.zones}
            coolingPoints={mapData?.cooling_points}
            workers={mapData?.workers}
            activeIncidents={incidents}
            selectedWorkerId={selectedWorkerId}
            selectedIncidentId={selectedIncidentId}
            onSelectWorker={onSelectWorker}
            onSelectIncident={onSelectIncident}
          />
        </div>

        {/* Right Zone Control & Cooling Logistics (4 cols) */}
        <div className="lg:col-span-4 space-y-3 flex flex-col">
          {/* Active Cooling Stations Logistics */}
          <div className="bg-[#0e1424] rounded-xl border border-[#1e293b] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
                <span>❄️</span>
                <span>Active Cooling Resources</span>
              </h3>
              <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                4 Deployed
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-lg bg-[#131b2e] border border-[#1e293b] flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-200">Trailer AC-01 (Zone D)</div>
                  <div className="text-[10px] text-slate-400">Capacity: 20 workers · Climate: 22°C</div>
                </div>
                <span className="text-[10px] font-bold text-emerald-400">ACTIVE</span>
              </div>

              <div className="p-2.5 rounded-lg bg-[#131b2e] border border-[#1e293b] flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-200">Misting Fan Depot (Zone B)</div>
                  <div className="text-[10px] text-slate-400">Water Tank: 84% · Flow: Continuous</div>
                </div>
                <span className="text-[10px] font-bold text-emerald-400">ACTIVE</span>
              </div>

              <div className="p-2.5 rounded-lg bg-[#131b2e] border border-[#1e293b] flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-200">Mobile Hydration Cart (Zone C)</div>
                  <div className="text-[10px] text-slate-400">Electrolyte Ice Station · Dispensed: 42L</div>
                </div>
                <span className="text-[10px] font-bold text-emerald-400">ACTIVE</span>
              </div>

              <div className="p-2.5 rounded-lg bg-[#131b2e] border border-[#1e293b] flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-200">Canopy Shade Array (Zone A)</div>
                  <div className="text-[10px] text-slate-400">UV Reduction: 85% · 12 Shade Benches</div>
                </div>
                <span className="text-[10px] font-bold text-amber-400">HIGH LOAD</span>
              </div>
            </div>

            {coolingActionSent && (
              <div className="p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold text-center animate-fade-in">
                ✓ Mobile cooling protocol dispatched to {coolingActionSent}!
              </div>
            )}

            <button
              onClick={() => handleDeployCooling('Zone A (Open Excavation)')}
              className="w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-sm cursor-pointer flex items-center justify-center space-x-2"
            >
              <span>🚀</span>
              <span>Dispatch Mobile Misting Unit to Zone A</span>
            </button>
          </div>

          {/* Spatial Microclimate Variance Feed */}
          <div className="bg-[#0e1424] rounded-xl border border-[#1e293b] p-4 space-y-2.5 flex-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
              <span>📡</span>
              <span>Hyperlocal Thermal Variance</span>
            </h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              FortyGuard hyper-local spatial mesh detects a{' '}
              <span className="text-rose-400 font-bold">+13.8°C thermal differential</span> between Zone A (Open Excavation) and Zone D (Canopy Shade).
            </p>

            <div className="space-y-1.5 pt-1 text-xs">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Zone A vs Ambient Baseline</span>
                <span className="text-rose-400 font-bold">+5.2°C</span>
              </div>
              <div className="w-full bg-[#1e293b] rounded-full h-1.5">
                <div className="bg-rose-500 h-1.5 rounded-full" style={{ width: '85%' }}></div>
              </div>

              <div className="flex justify-between text-[11px] pt-1">
                <span className="text-slate-400">Zone B Structural Cure Delta</span>
                <span className="text-amber-400 font-bold">+2.4°C</span>
              </div>
              <div className="w-full bg-[#1e293b] rounded-full h-1.5">
                <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: '60%' }}></div>
              </div>

              <div className="flex justify-between text-[11px] pt-1">
                <span className="text-slate-400">Zone D Shaded Mitigation Effect</span>
                <span className="text-emerald-400 font-bold">-8.6°C</span>
              </div>
              <div className="w-full bg-[#1e293b] rounded-full h-1.5">
                <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '92%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
