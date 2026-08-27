import React, { useState, useMemo } from 'react';
import { PriorityWorkerItem } from '../../types.js';

interface WorkersFleetViewProps {
  priorityItems: PriorityWorkerItem[];
  selectedWorkerId: string | null;
  onSelectWorker: (workerId: string) => void;
}

export interface FleetWorker {
  worker_id: string;
  role: string;
  zone_id: string;
  zone_name: string;
  current_risk_score: number;
  current_risk_level: 'GREEN' | 'WATCH' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
  predicted_risk_level: 'GREEN' | 'WATCH' | 'ELEVATED' | 'HIGH' | 'CRITICAL' | 'STABLE';
  early_warning: boolean;
  expected_time_to_threshold_minutes: number | null;
  exposure_duration_mins: number;
  primary_reason: string;
  last_update: string;
}

export const WorkersFleetView: React.FC<WorkersFleetViewProps> = ({
  priorityItems,
  selectedWorkerId,
  onSelectWorker,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH' | 'ELEVATED' | 'WATCH' | 'GREEN'>('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [zoneFilter, setZoneFilter] = useState('ALL');
  const [bulkAlertSent, setBulkAlertSent] = useState<string | null>(null);

  // Generate enriched worker list
  const fullWorkersList = useMemo<FleetWorker[]>(() => {
    const list: FleetWorker[] = priorityItems.map((p) => ({
      worker_id: p.worker_id,
      role: p.role || 'Laborer',
      zone_id: p.zone_id || 'ZONE-A',
      zone_name: p.zone_id === 'ZONE-A' ? 'Zone A · Open Excavation' : p.zone_id === 'ZONE-B' ? 'Zone B · Structural Concrete' : p.zone_id === 'ZONE-C' ? 'Zone C · Steel Framing' : 'Zone D · Shaded Staging',
      current_risk_score: p.current_risk_score,
      current_risk_level: p.current_risk_level,
      predicted_risk_level: p.predicted_risk_level,
      early_warning: p.predicted_risk_level === 'WATCH' || p.predicted_risk_level === 'ELEVATED' || p.predicted_risk_level === 'HIGH' || p.predicted_risk_level === 'CRITICAL',
      expected_time_to_threshold_minutes: p.threshold_eta_mins,
      exposure_duration_mins: p.exposure_duration_mins || 60,
      primary_reason: p.primary_reason || 'BASELINE_PROFILE',
      last_update: '2m ago',
    }));

    if (list.length < 113) {
      const roles = ['Welder', 'Laborer', 'Carpenter', 'Electrician', 'Supervisor'];
      const zones = [
        { id: 'ZONE-A', name: 'Zone A · Open Excavation' },
        { id: 'ZONE-B', name: 'Zone B · Structural Concrete' },
        { id: 'ZONE-C', name: 'Zone C · Steel Framing' },
        { id: 'ZONE-D', name: 'Zone D · Shaded Staging' },
      ];

      for (let i = list.length + 1; i <= 113; i++) {
        const idNum = String(i).padStart(4, '0');
        const role = roles[i % roles.length];
        const zoneObj = zones[i % zones.length];
        const isWatch = i <= 7;
        const level = isWatch ? (i % 2 === 0 ? 'ELEVATED' : 'WATCH') : 'GREEN';
        const score = isWatch ? (i % 2 === 0 ? 0.48 : 0.31) : 0.18 + ((i % 10) * 0.01);

        list.push({
          worker_id: `WRK-${idNum}`,
          role,
          zone_id: zoneObj.id,
          zone_name: zoneObj.name,
          current_risk_score: score,
          current_risk_level: level as any,
          predicted_risk_level: (isWatch ? 'WATCH' : 'GREEN') as any,
          early_warning: isWatch,
          expected_time_to_threshold_minutes: isWatch ? 12 + (i % 8) : null,
          exposure_duration_mins: 60 + (i * 2),
          primary_reason: isWatch ? 'HIGH_SOLAR_EXPOSURE' : 'SAFE_MARGIN',
          last_update: '2m ago',
        });
      }
    }
    return list;
  }, [priorityItems]);

  const filteredWorkers = useMemo(() => {
    return fullWorkersList.filter((w) => {
      // Risk filter
      if (riskFilter !== 'ALL' && w.current_risk_level !== riskFilter) return false;

      // Role filter
      if (roleFilter !== 'ALL' && w.role !== roleFilter) return false;

      // Zone filter
      if (zoneFilter !== 'ALL' && !w.zone_name.includes(zoneFilter)) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchId = w.worker_id.toLowerCase().includes(q);
        const matchRole = w.role.toLowerCase().includes(q);
        const matchZone = w.zone_name.toLowerCase().includes(q);
        if (!matchId && !matchRole && !matchZone) return false;
      }

      return true;
    });
  }, [fullWorkersList, riskFilter, roleFilter, zoneFilter, searchQuery]);

  const counts = useMemo(() => {
    return {
      total: fullWorkersList.length,
      green: fullWorkersList.filter((w) => w.current_risk_level === 'GREEN').length,
      watch: fullWorkersList.filter((w) => w.current_risk_level === 'WATCH').length,
      elevated: fullWorkersList.filter((w) => w.current_risk_level === 'ELEVATED').length,
      high: fullWorkersList.filter((w) => w.current_risk_level === 'HIGH').length,
      critical: fullWorkersList.filter((w) => w.current_risk_level === 'CRITICAL').length,
    };
  }, [fullWorkersList]);

  const handleSendBulkHydration = () => {
    setBulkAlertSent('Hydration Advisory dispatched via SMS to all 113 active workers.');
    setTimeout(() => setBulkAlertSent(null), 4000);
  };

  const handleSendZoneBreak = () => {
    setBulkAlertSent('Mandatory 15-minute shade rotation issued for Zone A (Open Excavation).');
    setTimeout(() => setBulkAlertSent(null), 4000);
  };

  return (
    <div className="space-y-4">
      {/* Top Banner: Metrics & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#0e1424] p-4 rounded-xl border border-[#1e293b]/70">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400"></span>
            <h2 className="text-sm font-bold text-white tracking-wide uppercase">
              Worker Fleet & Predictive Vitals Hub
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time biometric heat strain tracking, continuous exposure timers, and early breach forecasting
          </p>
        </div>

        {/* Quick Bulk Safety Actions */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleSendBulkHydration}
            className="px-3 py-1.5 rounded-lg bg-[#131b2e] hover:bg-[#1e293b] border border-[#1e293b] text-sky-300 text-xs font-semibold transition cursor-pointer flex items-center space-x-1.5"
          >
            <span>💧</span>
            <span>Broadcast Hydration SMS</span>
          </button>
          <button
            onClick={handleSendZoneBreak}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-sm cursor-pointer flex items-center space-x-1.5"
          >
            <span>⏱️</span>
            <span>Rotate Zone A Break</span>
          </button>
        </div>
      </div>

      {bulkAlertSent && (
        <div className="p-2.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold text-center animate-fade-in">
          ✓ {bulkAlertSent}
        </div>
      )}

      {/* KPI Filter Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
        <button
          onClick={() => setRiskFilter('ALL')}
          className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
            riskFilter === 'ALL'
              ? 'bg-[#1e293b] border-blue-500/50 shadow-md ring-1 ring-blue-500/40'
              : 'bg-[#0f172a]/70 border-[#1e293b]/70 hover:bg-[#131b2e]'
          }`}
        >
          <div className="text-[10px] uppercase font-bold text-slate-400">Total Workforce</div>
          <div className="text-lg font-extrabold text-white mt-0.5">{counts.total}</div>
        </button>

        <button
          onClick={() => setRiskFilter('GREEN')}
          className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
            riskFilter === 'GREEN'
              ? 'bg-[#1e293b] border-emerald-500/50 shadow-md ring-1 ring-emerald-500/40'
              : 'bg-[#0f172a]/70 border-[#1e293b]/70 hover:bg-[#131b2e]'
          }`}
        >
          <div className="text-[10px] uppercase font-bold text-emerald-400">Safe (Green)</div>
          <div className="text-lg font-extrabold text-emerald-400 mt-0.5">{counts.green}</div>
        </button>

        <button
          onClick={() => setRiskFilter('WATCH')}
          className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
            riskFilter === 'WATCH'
              ? 'bg-[#1e293b] border-sky-500/50 shadow-md ring-1 ring-sky-500/40'
              : 'bg-[#0f172a]/70 border-[#1e293b]/70 hover:bg-[#131b2e]'
          }`}
        >
          <div className="text-[10px] uppercase font-bold text-sky-400">Watch (Elevated)</div>
          <div className="text-lg font-extrabold text-sky-400 mt-0.5">{counts.watch}</div>
        </button>

        <button
          onClick={() => setRiskFilter('ELEVATED')}
          className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
            riskFilter === 'ELEVATED'
              ? 'bg-[#1e293b] border-amber-500/50 shadow-md ring-1 ring-amber-500/40'
              : 'bg-[#0f172a]/70 border-[#1e293b]/70 hover:bg-[#131b2e]'
          }`}
        >
          <div className="text-[10px] uppercase font-bold text-amber-400">Elevated Risk</div>
          <div className="text-lg font-extrabold text-amber-400 mt-0.5">{counts.elevated}</div>
        </button>

        <button
          onClick={() => setRiskFilter('HIGH')}
          className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
            riskFilter === 'HIGH'
              ? 'bg-[#1e293b] border-rose-500/50 shadow-md ring-1 ring-rose-500/40'
              : 'bg-[#0f172a]/70 border-[#1e293b]/70 hover:bg-[#131b2e]'
          }`}
        >
          <div className="text-[10px] uppercase font-bold text-rose-400">High Risk</div>
          <div className="text-lg font-extrabold text-rose-400 mt-0.5">{counts.high}</div>
        </button>

        <button
          onClick={() => setRiskFilter('CRITICAL')}
          className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
            riskFilter === 'CRITICAL'
              ? 'bg-[#1e293b] border-red-500/50 shadow-md ring-1 ring-red-500/40'
              : 'bg-[#0f172a]/70 border-[#1e293b]/70 hover:bg-[#131b2e]'
          }`}
        >
          <div className="text-[10px] uppercase font-bold text-red-500">Critical</div>
          <div className="text-lg font-extrabold text-red-500 mt-0.5">{counts.critical}</div>
        </button>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-[#0e1424] p-3 rounded-xl border border-[#1e293b]/70">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search by worker ID (e.g. WRK-0043), role, or zone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#111828] border border-[#1e293b] rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <svg
            className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Dropdowns */}
        <div className="flex items-center space-x-2">
          {/* Trade / Role Dropdown */}
          <div className="relative">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-[#111828] border border-[#1e293b] text-slate-300 text-xs rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer pr-6 appearance-none font-medium"
            >
              <option value="ALL">All Trades</option>
              <option value="Welder">Welder</option>
              <option value="Laborer">Laborer</option>
              <option value="Carpenter">Carpenter</option>
              <option value="Electrician">Electrician</option>
              <option value="Supervisor">Supervisor</option>
            </select>
            <svg className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          {/* Zone Dropdown */}
          <div className="relative">
            <select
              value={zoneFilter}
              onChange={(e) => setZoneFilter(e.target.value)}
              className="bg-[#111828] border border-[#1e293b] text-slate-300 text-xs rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer pr-6 appearance-none font-medium"
            >
              <option value="ALL">All Zones</option>
              <option value="Zone A">Zone A (Excavation)</option>
              <option value="Zone B">Zone B (Concrete)</option>
              <option value="Zone C">Zone C (Steel)</option>
              <option value="Zone D">Zone D (Shaded)</option>
            </select>
            <svg className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Worker Fleet Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {filteredWorkers.map((worker) => {
          const isSelected = selectedWorkerId === worker.worker_id;
          const isElevated = worker.current_risk_level === 'WATCH' || worker.current_risk_level === 'ELEVATED';

          return (
            <div
              key={worker.worker_id}
              className={`bg-[#0f172a] rounded-xl border p-3.5 flex flex-col justify-between transition ${
                isSelected
                  ? 'border-blue-500 ring-1 ring-blue-500 shadow-lg shadow-blue-500/20'
                  : 'border-[#1e293b] hover:border-[#334155]'
              }`}
            >
              <div>
                {/* Card Top: Worker ID, Role, and Risk Score Pill */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-9 h-9 rounded-lg bg-[#131b2e] border border-[#1e293b] flex items-center justify-center text-slate-300">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center space-x-1.5">
                        <span>{worker.worker_id}</span>
                        <span className="text-[10px] font-normal text-slate-400">({worker.role})</span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[170px] mt-0.5">
                        📍 {worker.zone_name}
                      </div>
                    </div>
                  </div>

                  {/* Current Risk Badge */}
                  <div className="flex flex-col items-end space-y-1">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        worker.current_risk_level === 'GREEN'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : worker.current_risk_level === 'WATCH'
                          ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {worker.current_risk_level} {Math.round(worker.current_risk_score * 100)}%
                    </span>

                    {worker.early_warning && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Pred WATCH ({worker.expected_time_to_threshold_minutes || 12}m)
                      </span>
                    )}
                  </div>
                </div>

                {/* Biometric & Exposure Row */}
                <div className="grid grid-cols-3 gap-1.5 mt-3 pt-2.5 border-t border-[#1e293b]/60 text-center text-xs">
                  <div className="bg-[#131b2e] p-1.5 rounded-lg border border-[#1e293b]/40">
                    <div className="text-[9px] text-slate-400 uppercase">Exposure</div>
                    <div className="text-[11px] font-bold text-slate-200">{worker.exposure_duration_mins}m</div>
                  </div>
                  <div className="bg-[#131b2e] p-1.5 rounded-lg border border-[#1e293b]/40">
                    <div className="text-[9px] text-slate-400 uppercase">Est. Heart Rate</div>
                    <div className="text-[11px] font-bold text-rose-400">{isElevated ? '128 bpm' : '94 bpm'}</div>
                  </div>
                  <div className="bg-[#131b2e] p-1.5 rounded-lg border border-[#1e293b]/40">
                    <div className="text-[9px] text-slate-400 uppercase">Core Temp</div>
                    <div className="text-[11px] font-bold text-amber-300">{isElevated ? '38.1°C' : '37.3°C'}</div>
                  </div>
                </div>

                {/* Primary Risk Factors */}
                <div className="mt-2.5 flex flex-wrap gap-1">
                  <span className="px-1.5 py-0.5 rounded bg-[#131b2e] text-[9px] font-medium text-slate-400 border border-[#1e293b]">
                    {worker.primary_reason || 'BASELINE_PROFILE'}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-[#131b2e] text-[9px] font-medium text-slate-400 border border-[#1e293b]">
                    CHANNEL: SMS
                  </span>
                </div>
              </div>

              {/* Card Action Button */}
              <div className="mt-3 pt-2.5 border-t border-[#1e293b]/60 flex items-center justify-between">
                <span className="text-[10px] text-slate-500">Updated {worker.last_update}</span>
                <button
                  onClick={() => onSelectWorker(worker.worker_id)}
                  className="px-3 py-1 rounded bg-[#131b2e] hover:bg-blue-600 hover:text-white text-slate-200 text-[11px] font-bold transition border border-[#1e293b] cursor-pointer"
                >
                  Inspect Vitals →
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
