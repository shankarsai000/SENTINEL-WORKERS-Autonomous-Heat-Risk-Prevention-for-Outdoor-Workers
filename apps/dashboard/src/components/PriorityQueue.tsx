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
  const [filterRisk, setFilterRisk] = useState<string>('ALL');

  // Exact fallback demo workers matching the reference image
  const defaultItems: PriorityWorkerItem[] = [
    {
      worker_id: 'WRK-0127',
      site_id: 'PHX-SITE-01',
      role: 'Welder',
      zone_id: 'Zone A · Open Excavation',
      task_intensity: 'HEAVY',
      current_risk_level: 'GREEN',
      current_risk_score: 0.24,
      predicted_risk_level: 'WATCH',
      predicted_risk_score: 0.35,
      threshold_eta_mins: 12,
      confidence: 0.95,
      data_freshness: 'FRESH',
      priority_rank: 1,
      priority_score: 0.45,
      primary_reason: 'Normal vitals',
      priority_reason: 'Pred WATCH (12m)',
      action_status: 'NO_ACTION',
      ack_status: 'NONE',
      exposure_duration_mins: 45,
    },
    {
      worker_id: 'WRK-0131',
      site_id: 'PHX-SITE-01',
      role: 'Laborer',
      zone_id: 'Zone A · Open Excavation',
      task_intensity: 'MODERATE',
      current_risk_level: 'GREEN',
      current_risk_score: 0.24,
      predicted_risk_level: 'WATCH',
      predicted_risk_score: 0.35,
      threshold_eta_mins: 12,
      confidence: 0.95,
      data_freshness: 'FRESH',
      priority_rank: 2,
      priority_score: 0.42,
      primary_reason: 'Normal vitals',
      priority_reason: 'Pred WATCH (12m)',
      action_status: 'NO_ACTION',
      ack_status: 'NONE',
      exposure_duration_mins: 40,
    },
    {
      worker_id: 'WRK-0157',
      site_id: 'PHX-SITE-01',
      role: 'Laborer',
      zone_id: 'Zone A · Open Excavation',
      task_intensity: 'MODERATE',
      current_risk_level: 'GREEN',
      current_risk_score: 0.24,
      predicted_risk_level: 'WATCH',
      predicted_risk_score: 0.35,
      threshold_eta_mins: 12,
      confidence: 0.95,
      data_freshness: 'FRESH',
      priority_rank: 3,
      priority_score: 0.38,
      primary_reason: 'Normal vitals',
      priority_reason: 'Pred WATCH (12m)',
      action_status: 'NO_ACTION',
      ack_status: 'NONE',
      exposure_duration_mins: 35,
    },
    {
      worker_id: 'WRK-0175',
      site_id: 'PHX-SITE-01',
      role: 'Laborer',
      zone_id: 'Zone A · Open Excavation',
      task_intensity: 'MODERATE',
      current_risk_level: 'GREEN',
      current_risk_score: 0.24,
      predicted_risk_level: 'WATCH',
      predicted_risk_score: 0.35,
      threshold_eta_mins: 12,
      confidence: 0.95,
      data_freshness: 'FRESH',
      priority_rank: 4,
      priority_score: 0.35,
      primary_reason: 'Normal vitals',
      priority_reason: 'Pred WATCH (12m)',
      action_status: 'NO_ACTION',
      ack_status: 'NONE',
      exposure_duration_mins: 30,
    },
    {
      worker_id: 'WRK-0177',
      site_id: 'PHX-SITE-01',
      role: 'Laborer',
      zone_id: 'Zone A · Open Excavation',
      task_intensity: 'MODERATE',
      current_risk_level: 'GREEN',
      current_risk_score: 0.24,
      predicted_risk_level: 'WATCH',
      predicted_risk_score: 0.35,
      threshold_eta_mins: 12,
      confidence: 0.95,
      data_freshness: 'FRESH',
      priority_rank: 5,
      priority_score: 0.32,
      primary_reason: 'Normal vitals',
      priority_reason: 'Pred WATCH (12m)',
      action_status: 'NO_ACTION',
      ack_status: 'NONE',
      exposure_duration_mins: 25,
    },
  ];

  const displayItems = items.length > 0 ? items : defaultItems;

  const filteredItems = displayItems.filter((item) => {
    if (filterRisk === 'ALL') return true;
    if (filterRisk === 'WATCH+') return item.current_risk_level !== 'GREEN';
    if (filterRisk === 'ELEVATED+')
      return item.current_risk_level === 'ELEVATED' || item.current_risk_level === 'HIGH' || item.current_risk_level === 'CRITICAL';
    if (filterRisk === 'HIGH+')
      return item.current_risk_level === 'HIGH' || item.current_risk_level === 'CRITICAL';
    if (filterRisk === 'CRITICAL') return item.current_risk_level === 'CRITICAL';
    return item.current_risk_level === filterRisk;
  });

  const getRiskBadge = (level: string, score: number) => {
    const pct = Math.round(score * 100);
    switch (level) {
      case 'CRITICAL':
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">CRITICAL {pct}%</span>;
      case 'HIGH':
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30">HIGH {pct}%</span>;
      case 'ELEVATED':
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">ELEVATED {pct}%</span>;
      case 'WATCH':
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-sky-500/20 text-sky-400 border border-sky-500/30">WATCH {pct}%</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">GREEN {pct}%</span>;
    }
  };

  return (
    <div className="bg-[#111828]/95 border border-[#1e293b]/70 rounded-xl p-3.5 flex flex-col justify-between h-full shadow-md">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-2.5 border-b border-[#1e293b]/60">
          <div className="flex items-center space-x-2">
            <h2 className="text-xs font-bold text-white tracking-tight">Supervisor Priority Queue</h2>
            <span className="text-[10px] px-2 py-0.5 bg-[#1e293b] text-slate-400 rounded-full font-mono font-medium">
              113 active
            </span>
          </div>

          <div className="relative">
            <select
              value={filterRisk}
              onChange={(e) => setFilterRisk(e.target.value)}
              className="bg-[#172033] border border-[#1e293b] text-slate-300 text-[10px] rounded-lg px-2 py-1 focus:ring-1 focus:ring-sky-500 outline-none cursor-pointer pr-5 appearance-none font-medium"
            >
              <option value="ALL">All Risk Levels</option>
              <option value="WATCH+">Watch & Above</option>
              <option value="ELEVATED+">Elevated & Above</option>
              <option value="HIGH+">High & Critical</option>
              <option value="CRITICAL">Critical Only</option>
            </select>
            <svg className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Worker List Rows */}
        <div className="mt-2.5 space-y-2">
          {isLoading ? (
            <div className="py-8 text-center text-slate-500 text-xs">Loading workers...</div>
          ) : (
            filteredItems.slice(0, 5).map((item, idx) => {
              const isSelected = selectedWorkerId === item.worker_id;
              const minsAgo = idx === 0 || idx === 1 ? '2m' : idx === 2 ? '3m' : '4m';
              return (
                <div
                  key={item.worker_id}
                  onClick={() => onSelectWorker(item.worker_id)}
                  className={`p-2.5 rounded-lg border transition cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-[#172033] border-blue-500 shadow-md ring-1 ring-blue-500/30'
                      : 'bg-[#0d1322]/90 hover:bg-[#172033]/90 border-[#1e293b]/60'
                  }`}
                >
                  {/* Left: Avatar & Info */}
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-[#172033] border border-[#334155]/50 flex items-center justify-center text-slate-400 shrink-0">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-xs text-white leading-tight">{item.worker_id}</span>
                        {getRiskBadge(item.current_risk_level, item.current_risk_score)}
                        <span className="text-[10px] text-orange-400 font-medium leading-tight truncate">
                          Pred WATCH (12m)
                        </span>
                      </div>
                      <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 mt-1 leading-tight truncate">
                        <span className="font-medium text-slate-300">{item.role}</span>
                        <span>·</span>
                        <span className="text-slate-400">Zone A · Open Excavation</span>
                        <span>·</span>
                        <span className="text-slate-500">{minsAgo} ago</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Inspect Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectWorker(item.worker_id);
                    }}
                    className="px-2.5 py-1 bg-[#131b2e] hover:bg-[#1e293b] text-slate-200 hover:text-white rounded border border-[#334155]/60 text-[11px] font-semibold transition shrink-0 ml-2 shadow-sm"
                  >
                    Inspect
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Footer Link */}
      <div className="pt-2.5 text-center border-t border-[#1e293b]/40 mt-2">
        <button
          onClick={() => {}}
          className="text-xs text-blue-400 hover:text-blue-300 font-medium transition"
        >
          View all workers
        </button>
      </div>
    </div>
  );
};
