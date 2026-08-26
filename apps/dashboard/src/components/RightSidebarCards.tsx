import React from 'react';
import { OperationsSummary } from '../types';

interface RightSidebarCardsProps {
  summary: OperationsSummary | null;
}

export const RightSidebarCards: React.FC<RightSidebarCardsProps> = ({ summary }) => {
  const fgStatus = summary?.fortyguard_status || 'Degraded';
  const freshness = summary?.data_freshness || 'Fresh';

  return (
    <div className="flex flex-col space-y-3 h-full">
      {/* 1. Alerts & Notifications */}
      <div className="bg-[#111828]/95 border border-[#1e293b]/70 rounded-xl p-3.5 shadow-md flex-1">
        <div className="flex items-center justify-between pb-2.5 border-b border-[#1e293b]/60">
          <h3 className="text-xs font-bold text-white tracking-tight">Alerts & Notifications</h3>
          <button className="text-[10px] text-blue-400 hover:text-blue-300 font-medium transition">
            View all
          </button>
        </div>

        <div className="mt-2.5 space-y-2.5">
          {/* Alert 1 */}
          <div className="flex items-start space-x-2.5">
            <div className="w-5 h-5 rounded-md bg-red-500/15 text-red-400 flex items-center justify-center shrink-0 mt-0.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-bold text-red-400 leading-tight">HIGH RISK CLUSTER</div>
              <div className="text-[10px] text-slate-300 font-medium leading-tight mt-0.5">Zone A · Open Excavation</div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                <span>0 workers currently affected</span>
                <span className="text-slate-500 font-mono">2m ago</span>
              </div>
            </div>
          </div>

          {/* Alert 2 */}
          <div className="flex items-start space-x-2.5">
            <div className="w-5 h-5 rounded-md bg-orange-500/15 text-orange-400 flex items-center justify-center shrink-0 mt-0.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-bold text-orange-400 leading-tight">PREDICTED BREACH</div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                <span className="text-slate-300">7 workers at risk in next 30m</span>
                <span className="text-slate-500 font-mono">12m ago</span>
              </div>
            </div>
          </div>

          {/* Alert 3 */}
          <div className="flex items-start space-x-2.5">
            <div className="w-5 h-5 rounded-md bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-bold text-blue-400 leading-tight">ADVISORY</div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                <span className="text-slate-300">Hydration reminder issued</span>
                <span className="text-slate-500 font-mono">25m ago</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. System Health */}
      <div className="bg-[#111828]/95 border border-[#1e293b]/70 rounded-xl p-3.5 shadow-md">
        <div className="pb-2.5 border-b border-[#1e293b]/60">
          <h3 className="text-xs font-bold text-white tracking-tight">System Health</h3>
        </div>

        <div className="mt-2.5 space-y-2 text-[11px]">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-medium">FortyGuard API</span>
            <span className="flex items-center space-x-1.5 text-amber-400 font-semibold">
              <span>{fgStatus}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-medium">Data Freshness</span>
            <span className="flex items-center space-x-1.5 text-emerald-400 font-semibold">
              <span>{freshness}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-medium">WebSocket Feed</span>
            <span className="flex items-center space-x-1.5 text-emerald-400 font-semibold">
              <span>Live</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-medium">Prediction Engine</span>
            <span className="flex items-center space-x-1.5 text-emerald-400 font-semibold">
              <span>Healthy</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-medium">Action Engine</span>
            <span className="flex items-center space-x-1.5 text-emerald-400 font-semibold">
              <span>Healthy</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
