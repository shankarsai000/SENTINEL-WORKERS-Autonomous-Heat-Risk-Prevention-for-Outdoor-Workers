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
  core_temp_c: number;
  heart_rate_bpm: number;
}

export const WorkersFleetView: React.FC<WorkersFleetViewProps> = ({
  priorityItems,
  selectedWorkerId,
  onSelectWorker,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  // Default tab: 'ATTENTION'
  const [statusTab, setStatusTab] = useState<'ATTENTION' | 'ALL' | 'SAFE'>('ATTENTION');
  const [zoneFilter, setZoneFilter] = useState('ALL');
  const [sortField, setSortField] = useState<'RISK' | 'EXPOSURE' | 'ID'>('RISK');
  const [sortAsc, setSortAsc] = useState(false);

  // Generate enriched worker fleet (113 workers)
  const fullWorkersList = useMemo<FleetWorker[]>(() => {
    const list: FleetWorker[] = priorityItems.map((p) => {
      const isElevated = p.current_risk_level === 'WATCH' || p.current_risk_level === 'ELEVATED';
      return {
        worker_id: p.worker_id,
        role: p.role || 'Laborer',
        zone_id: p.zone_id || 'ZONE-A',
        zone_name:
          p.zone_id === 'ZONE-A'
            ? 'Zone A · Open Excavation'
            : p.zone_id === 'ZONE-B'
            ? 'Zone B · Structural Concrete'
            : p.zone_id === 'ZONE-C'
            ? 'Zone C · Steel Framing'
            : 'Zone D · Shaded Staging',
        current_risk_score: p.current_risk_score,
        current_risk_level: p.current_risk_level,
        predicted_risk_level: p.predicted_risk_level,
        early_warning:
          p.predicted_risk_level === 'WATCH' ||
          p.predicted_risk_level === 'ELEVATED' ||
          p.predicted_risk_level === 'HIGH' ||
          p.predicted_risk_level === 'CRITICAL',
        expected_time_to_threshold_minutes: p.threshold_eta_mins,
        exposure_duration_mins: p.exposure_duration_mins || 60,
        primary_reason: p.primary_reason || 'BASELINE_PROFILE',
        core_temp_c: isElevated ? 38.1 : 37.3,
        heart_rate_bpm: isElevated ? 128 : 94,
      };
    });

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
        const exposure = 60 + (i * 2) + ((i % 5) * 11);

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
          exposure_duration_mins: exposure,
          primary_reason: isWatch ? 'HIGH_SOLAR_EXPOSURE' : 'SAFE_MARGIN',
          core_temp_c: isWatch ? 38.1 : 37.2 + ((i % 4) * 0.1),
          heart_rate_bpm: isWatch ? 124 + (i % 8) : 88 + (i % 12),
        });
      }
    }
    return list;
  }, [priorityItems]);

  // Tab counts
  const counts = useMemo(() => {
    const attention = fullWorkersList.filter(
      (w) =>
        w.current_risk_level === 'CRITICAL' ||
        w.current_risk_level === 'HIGH' ||
        w.current_risk_level === 'ELEVATED' ||
        w.current_risk_level === 'WATCH'
    ).length;

    const safe = fullWorkersList.filter((w) => w.current_risk_level === 'GREEN').length;

    return {
      all: fullWorkersList.length,
      attention,
      safe,
    };
  }, [fullWorkersList]);

  // Risk rank mapping for default sorting: CRITICAL (0) -> HIGH (1) -> ELEVATED (2) -> WATCH (3) -> GREEN (4)
  const riskRank = (level: string): number => {
    switch (level) {
      case 'CRITICAL':
        return 0;
      case 'HIGH':
        return 1;
      case 'ELEVATED':
        return 2;
      case 'WATCH':
        return 3;
      case 'GREEN':
      default:
        return 4;
    }
  };

  // Filtered & Sorted workers
  const filteredWorkers = useMemo(() => {
    let result = fullWorkersList.filter((w) => {
      // Status tab filter
      if (statusTab === 'ATTENTION') {
        if (w.current_risk_level === 'GREEN') return false;
      } else if (statusTab === 'SAFE') {
        if (w.current_risk_level !== 'GREEN') return false;
      }

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

    // Sort
    result.sort((a, b) => {
      if (sortField === 'RISK') {
        const rankDiff = riskRank(a.current_risk_level) - riskRank(b.current_risk_level);
        if (rankDiff !== 0) return sortAsc ? -rankDiff : rankDiff;
        return sortAsc
          ? a.current_risk_score - b.current_risk_score
          : b.current_risk_score - a.current_risk_score;
      } else if (sortField === 'EXPOSURE') {
        return sortAsc
          ? a.exposure_duration_mins - b.exposure_duration_mins
          : b.exposure_duration_mins - a.exposure_duration_mins;
      } else {
        return sortAsc
          ? a.worker_id.localeCompare(b.worker_id)
          : b.worker_id.localeCompare(a.worker_id);
      }
    });

    return result;
  }, [fullWorkersList, statusTab, zoneFilter, searchQuery, sortField, sortAsc]);

  // Format exposure duration
  const formatDuration = (mins: number): string => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m < 10 ? '0' : ''}${m}m`;
  };

  // Badge rendering
  const renderRiskBadge = (level: string, score: number) => {
    const pct = Math.round(score * 100);
    switch (level) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            Critical ({pct}%)
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20">
            High ({pct}%)
          </span>
        );
      case 'ELEVATED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Elevated ({pct}%)
          </span>
        );
      case 'WATCH':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
            Watch ({pct}%)
          </span>
        );
      case 'GREEN':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Safe ({pct}%)
          </span>
        );
    }
  };

  const toggleSort = (field: 'RISK' | 'EXPOSURE' | 'ID') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Filter & Control Bar */}
      <div className="bg-[#0e1424]/80 border border-slate-800 rounded-xl p-3.5 backdrop-blur-md flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setStatusTab('ATTENTION')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer flex items-center gap-2 ${
              statusTab === 'ATTENTION'
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <span>⚠️ Attention Required</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/25 text-amber-300 font-mono">
              {counts.attention}
            </span>
          </button>

          <button
            onClick={() => setStatusTab('ALL')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer flex items-center gap-2 ${
              statusTab === 'ALL'
                ? 'bg-sky-500/15 text-sky-300 border border-sky-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <span>All Active</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 font-mono">
              {counts.all}
            </span>
          </button>

          <button
            onClick={() => setStatusTab('SAFE')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer flex items-center gap-2 ${
              statusTab === 'SAFE'
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <span>Nominal / Safe</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/25 text-emerald-300 font-mono">
              {counts.safe}
            </span>
          </button>
        </div>

        {/* Search Input & Zone Filter */}
        <div className="flex items-center space-x-2.5">
          {/* Search Box */}
          <div className="relative flex-1 sm:w-64">
            <input
              type="text"
              placeholder="Search ID (e.g. WRK-0042) or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#111828] border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500 font-medium"
            />
            <svg
              className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Zone Dropdown */}
          <div className="relative">
            <select
              value={zoneFilter}
              onChange={(e) => setZoneFilter(e.target.value)}
              className="bg-[#111828] border border-slate-800 text-slate-300 text-xs rounded-lg px-3 py-1.5 focus:ring-1 focus:ring-sky-500 outline-none cursor-pointer pr-7 appearance-none font-medium"
            >
              <option value="ALL">All Zones</option>
              <option value="Zone A">Zone A (Excavation)</option>
              <option value="Zone B">Zone B (Concrete)</option>
              <option value="Zone C">Zone C (Steel)</option>
              <option value="Zone D">Zone D (Shaded)</option>
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

      {/* High-Density Data Table */}
      <div className="bg-[#0e1424]/80 border border-slate-800 rounded-xl overflow-hidden backdrop-blur-md shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60 text-[11px] font-semibold uppercase tracking-wider text-slate-400 select-none">
                <th
                  onClick={() => toggleSort('ID')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-200"
                >
                  <div className="flex items-center space-x-1">
                    <span>Worker ID & Role</span>
                    {sortField === 'ID' && (
                      <span className="text-sky-400">{sortAsc ? '▲' : '▼'}</span>
                    )}
                  </div>
                </th>
                <th className="py-3 px-4">Current Zone</th>
                <th
                  onClick={() => toggleSort('EXPOSURE')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-200"
                >
                  <div className="flex items-center space-x-1">
                    <span>Exposure Duration</span>
                    {sortField === 'EXPOSURE' && (
                      <span className="text-sky-400">{sortAsc ? '▲' : '▼'}</span>
                    )}
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('RISK')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-200"
                >
                  <div className="flex items-center space-x-1">
                    <span>Heat Risk State</span>
                    {sortField === 'RISK' && (
                      <span className="text-sky-400">{sortAsc ? '▲' : '▼'}</span>
                    )}
                  </div>
                </th>
                <th className="py-3 px-4">Trajectory / 30m Forecast</th>
                <th className="py-3 px-4">Key Telemetry (Temp / HR)</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {filteredWorkers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 font-medium">
                    No workers matching the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredWorkers.map((worker) => {
                  const isSelected = selectedWorkerId === worker.worker_id;

                  return (
                    <tr
                      key={worker.worker_id}
                      onClick={() => onSelectWorker(worker.worker_id)}
                      className={`hover:bg-slate-800/40 cursor-pointer transition-colors ${
                        isSelected ? 'bg-sky-500/10' : ''
                      }`}
                    >
                      {/* Worker ID & Role */}
                      <td className="py-3 px-4">
                        <div className="font-bold font-mono text-slate-200 leading-tight">
                          {worker.worker_id}
                        </div>
                        <div className="text-[11px] text-slate-400 leading-tight mt-0.5">
                          {worker.role}
                        </div>
                      </td>

                      {/* Current Zone */}
                      <td className="py-3 px-4 text-slate-300">
                        <span className="truncate max-w-[200px] inline-block">
                          {worker.zone_name}
                        </span>
                      </td>

                      {/* Exposure Duration */}
                      <td className="py-3 px-4 font-mono text-slate-300">
                        {formatDuration(worker.exposure_duration_mins)}
                      </td>

                      {/* Heat Risk State */}
                      <td className="py-3 px-4">
                        {renderRiskBadge(worker.current_risk_level, worker.current_risk_score)}
                      </td>

                      {/* Trajectory / 30m Forecast */}
                      <td className="py-3 px-4">
                        {worker.early_warning ? (
                          <span className="text-amber-400 font-medium flex items-center space-x-1">
                            <span>▲</span>
                            <span>Watch in {worker.expected_time_to_threshold_minutes || 12}m</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 font-medium flex items-center space-x-1">
                            <span>●</span>
                            <span>Stable</span>
                          </span>
                        )}
                      </td>

                      {/* Key Telemetry (Core Temp / Heart Rate) */}
                      <td className="py-3 px-4 font-mono text-slate-300">
                        <span className={worker.core_temp_c >= 38.0 ? 'text-amber-400' : 'text-slate-300'}>
                          {worker.core_temp_c.toFixed(1)}°C
                        </span>
                        <span className="text-slate-500 mx-1.5">/</span>
                        <span className={worker.heart_rate_bpm >= 120 ? 'text-rose-400' : 'text-slate-300'}>
                          {worker.heart_rate_bpm} bpm
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectWorker(worker.worker_id);
                          }}
                          className="px-3 py-1 rounded-md bg-slate-800/80 hover:bg-sky-600 text-slate-200 hover:text-white text-xs font-semibold transition border border-slate-700/80 cursor-pointer"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="p-3 bg-slate-900/40 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
          <span>
            Showing <span className="font-bold text-slate-200 font-mono">{filteredWorkers.length}</span> of{' '}
            <span className="font-bold text-slate-200 font-mono">{fullWorkersList.length}</span> active workers
          </span>
          <span className="text-slate-500">
            Click any row to inspect physiological vitals and audit history
          </span>
        </div>
      </div>
    </div>
  );
};
