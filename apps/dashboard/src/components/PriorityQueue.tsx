import React, { useState } from 'react';
import { PriorityWorkerItem } from '../types';

interface PriorityQueueProps {
  items: PriorityWorkerItem[];
  selectedWorkerId: string | null;
  onSelectWorker: (workerId: string) => void;
  isLoading?: boolean;
}

export const PriorityQueue: React.FC<PriorityQueueProps> = ({
  items,
  selectedWorkerId,
  onSelectWorker,
  isLoading = false,
}) => {
  const [search, setSearch] = useState('');
  const [filterRisk, setFilterRisk] = useState<string>('ALL');

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.worker_id.toLowerCase().includes(search.toLowerCase()) ||
      item.role.toLowerCase().includes(search.toLowerCase()) ||
      item.primary_reason.toLowerCase().includes(search.toLowerCase()) ||
      item.priority_reason.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (filterRisk === 'ALL') return true;
    if (filterRisk === 'WATCH+') return item.current_risk_level !== 'GREEN';
    if (filterRisk === 'ELEVATED+')
      return item.current_risk_level === 'ELEVATED' || item.current_risk_level === 'HIGH' || item.current_risk_level === 'CRITICAL';
    if (filterRisk === 'HIGH+')
      return item.current_risk_level === 'HIGH' || item.current_risk_level === 'CRITICAL';
    if (filterRisk === 'CRITICAL') return item.current_risk_level === 'CRITICAL';
    return item.current_risk_level === filterRisk;
  });

  const getRiskBadge = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-950/80 text-red-400 border border-red-800 animate-pulse">🔴 CRITICAL</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-orange-950/80 text-orange-400 border border-orange-800">🟠 HIGH</span>;
      case 'ELEVATED':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-yellow-950/80 text-yellow-400 border border-yellow-800">🟡 ELEVATED</span>;
      case 'WATCH':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-950/80 text-blue-400 border border-blue-800">🔵 WATCH</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-800">🟢 GREEN</span>;
    }
  };

  const getAckBadge = (status: string) => {
    if (status === 'ACK_PENDING') {
      return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-900/60 text-amber-300 border border-amber-700">ACK PENDING</span>;
    }
    if (status === 'ACKNOWLEDGED') {
      return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-900/60 text-emerald-300 border border-emerald-700">ACKED</span>;
    }
    if (status === 'ESCALATED') {
      return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-900/60 text-rose-300 border border-rose-700">ESCALATED</span>;
    }
    return <span className="text-[11px] text-slate-500">—</span>;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col h-full shadow-lg">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
          <h2 className="text-base font-semibold text-slate-100">Supervisor Priority Queue</h2>
          <span className="text-xs px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full font-mono">
            {filteredItems.length} active
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={filterRisk}
            onChange={(e) => setFilterRisk(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1 focus:ring-1 focus:ring-sky-500 outline-none"
          >
            <option value="ALL">All Risk Levels</option>
            <option value="WATCH+">Watch and Above</option>
            <option value="ELEVATED+">Elevated and Above</option>
            <option value="HIGH+">High & Critical</option>
            <option value="CRITICAL">Critical Only</option>
          </select>
          <input
            type="text"
            placeholder="Search worker / role / reason..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-1 w-48 focus:ring-1 focus:ring-sky-500 outline-none placeholder:text-slate-500"
          />
        </div>
      </div>

      <div className="overflow-y-auto flex-1 mt-3 space-y-1.5 pr-1 max-h-[460px]">
        {isLoading ? (
          <div className="py-12 text-center text-slate-500 text-sm">Loading priority queue...</div>
        ) : filteredItems.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">No workers matching filter.</div>
        ) : (
          filteredItems.map((item) => {
            const isSelected = selectedWorkerId === item.worker_id;
            return (
              <div
                key={item.worker_id}
                onClick={() => onSelectWorker(item.worker_id)}
                className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? 'bg-slate-800 border-sky-500 shadow-md ring-1 ring-sky-500/30'
                    : 'bg-slate-950/60 hover:bg-slate-800/80 border-slate-800/80'
                }`}
              >
                {/* Left: Rank & Worker ID & Role */}
                <div className="flex items-center space-x-3 min-w-[170px]">
                  <span className="text-xs font-mono font-bold text-slate-400 w-5">
                    #{item.priority_rank}
                  </span>
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span className="font-mono font-bold text-sm text-slate-100">{item.worker_id}</span>
                      <span className="text-[11px] text-slate-400">({item.role})</span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">{item.zone_id}</div>
                  </div>
                </div>

                {/* Center-Left: Current Risk & Trajectory */}
                <div className="flex flex-col items-start min-w-[130px]">
                  <div className="flex items-center space-x-1.5">
                    {getRiskBadge(item.current_risk_level)}
                    <span className="text-xs font-mono text-slate-300">
                      {Math.round(item.current_risk_score * 100)}%
                    </span>
                  </div>
                  {item.predicted_risk_level !== 'STABLE' && item.predicted_risk_level !== item.current_risk_level ? (
                    <span className="text-[10px] text-amber-400 mt-0.5">
                      ↗ Pred {item.predicted_risk_level} {item.threshold_eta_mins ? `(${item.threshold_eta_mins}m)` : ''}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 mt-0.5">Trajectory: Stable</span>
                  )}
                </div>

                {/* Center-Right: Priority Reason */}
                <div className="flex-1 px-3 hidden md:block">
                  <div className="text-xs font-medium text-slate-200 line-clamp-1">{item.priority_reason}</div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {item.primary_reason} • Exp: {item.exposure_duration_mins}m
                  </div>
                </div>

                {/* Right: Action / Ack Status & Action Button */}
                <div className="flex items-center space-x-2.5">
                  <div className="text-right">
                    <div className="text-[11px] font-mono text-slate-300">
                      {item.action_status !== 'NO_ACTION' ? item.action_status : 'MONITOR'}
                    </div>
                    <div>{getAckBadge(item.ack_status)}</div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectWorker(item.worker_id);
                    }}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-sky-600 text-slate-200 hover:text-white rounded text-xs font-medium transition"
                  >
                    Inspect
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
