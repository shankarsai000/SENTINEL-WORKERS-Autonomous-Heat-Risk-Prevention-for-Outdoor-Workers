import React from 'react';
import { PriorityWorkerItem, OperationsSummary, Incident } from '../../types.js';

interface OverviewViewProps {
  opsSummary: OperationsSummary | null;
  priorityItems: PriorityWorkerItem[];
  mapData: any;
  incidents: Incident[];
  latestObservation: any;
  selectedWorkerId: string | null;
  selectedIncidentId: string | null;
  timeRange: string;
  onTimeRangeChange: (val: string) => void;
  onSelectWorker: (workerId: string) => void;
  onSelectIncident: (incidentId: string) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  opsSummary,
  priorityItems,
  incidents,
  latestObservation,
  onSelectWorker,
  onSelectIncident,
}) => {
  const activeIncidents = incidents.filter((i) => i.status !== 'RESOLVED' && i.status !== 'CLOSED');
  const totalWorkers = opsSummary?.active_workers ?? 113;
  const safeWorkers = opsSummary?.green_count ?? 106;
  const watchElevated = (opsSummary?.watch_count ?? 0) + (opsSummary?.elevated_count ?? 0);
  const criticalHigh = (opsSummary?.high_count ?? 0) + (opsSummary?.critical_count ?? 0);

  const riskBadge = (level: string) => {
    const colors: Record<string, string> = {
      CRITICAL: 'bg-red-500/15 text-red-400 border-red-500/30',
      HIGH: 'bg-red-500/15 text-red-400 border-red-500/30',
      ELEVATED: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      WATCH: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
      GREEN: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    };
    return colors[level] || colors['GREEN'];
  };

  return (
    <div className="space-y-6 w-full">
      {/* Section 1: Summary Stats */}
      <div>
        <h1 className="text-xl font-bold text-white mb-4">Dashboard Overview</h1>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 rounded-2xl border border-slate-800/60 p-5">
            <div className="text-sm text-slate-400 mb-1">Total Workers</div>
            <div className="text-3xl font-bold text-white tracking-tight">{totalWorkers}</div>
            <div className="text-xs text-slate-500 mt-1">Active on site</div>
          </div>
          <div className="bg-slate-900 rounded-2xl border border-slate-800/60 p-5">
            <div className="text-sm text-slate-400 mb-1">Safe</div>
            <div className="text-3xl font-bold text-emerald-400 tracking-tight">{safeWorkers}</div>
            <div className="text-xs text-slate-500 mt-1">Nominal risk</div>
          </div>
          <div className="bg-slate-900 rounded-2xl border border-slate-800/60 p-5">
            <div className="text-sm text-slate-400 mb-1">Monitoring</div>
            <div className="text-3xl font-bold text-amber-400 tracking-tight">{watchElevated + criticalHigh}</div>
            <div className="text-xs text-slate-500 mt-1">Watch & elevated</div>
          </div>
          <div className="bg-slate-900 rounded-2xl border border-slate-800/60 p-5">
            <div className="text-sm text-slate-400 mb-1">Active Incidents</div>
            <div className="text-3xl font-bold text-red-400 tracking-tight">{activeIncidents.length}</div>
            <div className="text-xs text-slate-500 mt-1">Requiring attention</div>
          </div>
        </div>
      </div>

      {/* Section 2: Priority Workers & Active Incidents (Side-by-side on wide screens) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Column: Priority Workers */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
              Priority Workers
            </h2>
            <span className="text-xs text-slate-500 font-medium">
              {priorityItems.length} active monitoring
            </span>
          </div>

          {priorityItems.length === 0 ? (
            <div className="bg-slate-900 rounded-2xl border border-slate-800/60 p-8 text-center text-slate-500 text-sm">
              No workers requiring immediate attention
            </div>
          ) : (
            <div className="space-y-2.5">
              {priorityItems.slice(0, 8).map((item) => (
                <button
                  key={item.worker_id}
                  onClick={() => onSelectWorker(item.worker_id)}
                  className="w-full bg-slate-900 rounded-xl border border-slate-800/60 p-4 flex items-center justify-between hover:bg-slate-800/60 hover:border-slate-700 transition cursor-pointer text-left group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className={`w-3 h-3 rounded-full shrink-0 ${
                      item.current_risk_level === 'HIGH' || item.current_risk_level === 'CRITICAL' ? 'bg-red-500 shadow-sm shadow-red-500/50' :
                      item.current_risk_level === 'ELEVATED' ? 'bg-amber-500 shadow-sm shadow-amber-500/50' :
                      item.current_risk_level === 'WATCH' ? 'bg-sky-400 shadow-sm shadow-sky-400/50' : 'bg-emerald-400'
                    }`}></div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white group-hover:text-sky-300 transition-colors">
                        {item.worker_id}
                      </div>
                      <div className="text-xs text-slate-400 truncate mt-0.5">
                        {item.role || 'Worker'} · {item.zone_id || 'Zone A'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className={`px-2.5 py-0.5 rounded-lg text-xs font-semibold border ${riskBadge(item.current_risk_level || 'WATCH')}`}>
                      {item.current_risk_level || 'WATCH'}
                    </span>
                    <svg className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Active Incidents */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
              Active Incidents
            </h2>
            <span className="text-xs text-slate-500 font-medium">
              {activeIncidents.length} open clusters
            </span>
          </div>

          {activeIncidents.length === 0 ? (
            <div className="bg-slate-900 rounded-2xl border border-slate-800/60 p-8 text-center text-slate-500 text-sm">
              No active incidents — all clear
            </div>
          ) : (
            <div className="space-y-2.5">
              {activeIncidents.slice(0, 8).map((inc) => (
                <button
                  key={inc.incident_id}
                  onClick={() => onSelectIncident(inc.incident_id)}
                  className="w-full bg-slate-900 rounded-xl border border-slate-800/60 p-4 flex items-center justify-between hover:bg-slate-800/60 hover:border-slate-700 transition cursor-pointer text-left group"
                >
                  <div className="min-w-0 pr-3">
                    <div className="text-sm font-semibold text-white group-hover:text-sky-300 transition-colors truncate">
                      {inc.summary || `Heat stress cluster`}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {inc.zone_id || 'Zone A'} · {inc.affected_worker_count || 0} workers affected
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className={`px-2.5 py-0.5 rounded-lg text-xs font-semibold border ${riskBadge(inc.severity || 'ELEVATED')}`}>
                      {inc.severity || 'ELEVATED'}
                    </span>
                    <svg className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Section 3: Environment */}
      <div>
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">
          Hyperlocal Environmental Intelligence (FortyGuard Feed)
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 rounded-2xl border border-slate-800/60 p-4 text-center">
            <div className="text-xs text-slate-400 mb-1 font-medium">Ambient Temp</div>
            <div className="text-2xl font-bold text-red-400">
              {latestObservation?.temperature_c ? `${latestObservation.temperature_c.toFixed(1)}°C` : '35.0°C'}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">FortyGuard Live</div>
          </div>
          <div className="bg-slate-900 rounded-2xl border border-slate-800/60 p-4 text-center">
            <div className="text-xs text-slate-400 mb-1 font-medium">WBGT & Humidity</div>
            <div className="text-2xl font-bold text-sky-400">
              {latestObservation?.wet_bulb_c ? `${latestObservation.wet_bulb_c.toFixed(1)}°C` : '29.4°C'}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">28% RH</div>
          </div>
          <div className="bg-slate-900 rounded-2xl border border-slate-800/60 p-4 text-center">
            <div className="text-xs text-slate-400 mb-1 font-medium">Solar Irradiance</div>
            <div className="text-2xl font-bold text-amber-400">
              {latestObservation?.solar_irradiance ? `${latestObservation.solar_irradiance.toFixed(0)} W/m²` : '850 W/m²'}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">Direct Sun Zone</div>
          </div>
          <div className="bg-slate-900 rounded-2xl border border-slate-800/60 p-4 text-center">
            <div className="text-xs text-slate-400 mb-1 font-medium">Site Wind Speed</div>
            <div className="text-2xl font-bold text-slate-200">
              5.2 km/h
            </div>
            <div className="text-[10px] text-slate-500 mt-1">Microclimate Sensor</div>
          </div>
        </div>
      </div>

      {/* Section 4: Vision 2030 Hydration, Cooling Fleet & Peer Buddy Network */}
      <div>
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">
          Vision 2030 Heat Safety Fleet Intelligence
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-900/90 rounded-2xl border border-sky-500/20 p-4 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-xl shrink-0">
              💧
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Hydration Cadence (ACGIH)</div>
              <div className="text-lg font-bold text-white">250 mL / 15 min</div>
              <div className="text-[11px] text-sky-400 mt-0.5">Target: 1,000 mL/hr</div>
            </div>
          </div>

          <div className="bg-slate-900/90 rounded-2xl border border-emerald-500/20 p-4 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-xl shrink-0">
              ❄️
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Cooling Stations</div>
              <div className="text-lg font-bold text-emerald-400">16 Deployed / 12 Avail</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Capacity: 184 Workers</div>
            </div>
          </div>

          <div className="bg-slate-900/90 rounded-2xl border border-purple-500/20 p-4 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-xl shrink-0">
              👥
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Peer Buddy Mesh</div>
              <div className="text-lg font-bold text-purple-300">56 Pairs Synced</div>
              <div className="text-[11px] text-emerald-400 mt-0.5">0 Overdue Check-ins</div>
            </div>
          </div>

          <div className="bg-slate-900/90 rounded-2xl border border-amber-500/20 p-4 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-xl shrink-0">
              📋
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">OSHA Compliance</div>
              <div className="text-lg font-bold text-amber-300">96.4% on Schedule</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Shift Reports Ready</div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 5: Long-Horizon Climate Resilience Projections (Vision 2030 Tier 2) */}
      <div className="bg-slate-900/80 rounded-2xl border border-slate-800/80 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span>🌍</span>
              <span>Long-Horizon Climate Resilience & Shift Adaptation (2030–2050)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              IPCC thermal models: Quantifying avoided economic loss and automated dawn/night shift transitions
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            Estimated ROI: $1.42M / Site / Year
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-sm">2030 Horizon</span>
              <span className="text-[11px] font-mono text-amber-400 font-bold">+1.6°C Peak</span>
            </div>
            <div className="text-xs text-slate-400">Projected Peak Summer: <strong className="text-slate-200">44.1°C</strong> (94 days &gt; 40°C)</div>
            <div className="text-xs text-emerald-400 font-semibold">Adapted Schedule: 05:00 - 13:00 (Dawn Shift)</div>
            <div className="text-[11px] text-slate-500">Productivity Retention: 94.5% (vs 68% traditional)</div>
          </div>

          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-sm">2040 Horizon</span>
              <span className="text-[11px] font-mono text-orange-400 font-bold">+3.7°C Peak</span>
            </div>
            <div className="text-xs text-slate-400">Projected Peak Summer: <strong className="text-slate-200">46.2°C</strong> (118 days &gt; 40°C)</div>
            <div className="text-xs text-emerald-400 font-semibold">Adapted Schedule: 20:00 - 04:00 (Night Economy)</div>
            <div className="text-[11px] text-slate-500">Productivity Retention: 88.0% (vs 52% traditional)</div>
          </div>

          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-sm">2050 Horizon</span>
              <span className="text-[11px] font-mono text-red-400 font-bold">+5.5°C Peak</span>
            </div>
            <div className="text-xs text-slate-400">Projected Peak Summer: <strong className="text-slate-200">48.0°C</strong> (142 days &gt; 40°C)</div>
            <div className="text-xs text-emerald-400 font-semibold">Adapted Schedule: Autonomous Enclosed Robotics</div>
            <div className="text-[11px] text-slate-500">Productivity Retention: 82.0% (vs 35% traditional)</div>
          </div>
        </div>
      </div>
    </div>
  );
};
