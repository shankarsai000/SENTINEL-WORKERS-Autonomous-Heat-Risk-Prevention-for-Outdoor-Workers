import React, { useState, useMemo } from 'react';
import { PriorityWorkerItem } from '../../types.js';

interface WorkersFleetViewProps {
  priorityItems: PriorityWorkerItem[];
  selectedWorkerId: string | null;
  onSelectWorker: (workerId: string) => void;
}

export const WorkersFleetView: React.FC<WorkersFleetViewProps> = ({
  priorityItems,
  selectedWorkerId,
  onSelectWorker,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'attention' | 'all' | 'safe'>('attention');

  const riskOrder: Record<string, number> = { CRITICAL: 0, HIGH: 1, ELEVATED: 2, WATCH: 3, GREEN: 4 };

  const workers = useMemo(() => {
    let list = [...priorityItems];

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((w) =>
        w.worker_id.toLowerCase().includes(q) ||
        (w.role || '').toLowerCase().includes(q)
      );
    }

    // Status filter
    if (statusFilter === 'attention') {
      list = list.filter((w) => w.current_risk_level !== 'GREEN');
    } else if (statusFilter === 'safe') {
      list = list.filter((w) => w.current_risk_level === 'GREEN');
    }

    // Sort by risk
    list.sort((a, b) => (riskOrder[a.current_risk_level || 'GREEN'] ?? 4) - (riskOrder[b.current_risk_level || 'GREEN'] ?? 4));

    return list;
  }, [priorityItems, search, statusFilter]);

  const attentionCount = priorityItems.filter((w) => w.current_risk_level !== 'GREEN').length;
  const safeCount = priorityItems.filter((w) => w.current_risk_level === 'GREEN').length;

  const riskDot = (level: string) => {
    const c: Record<string, string> = {
      CRITICAL: 'bg-red-500', HIGH: 'bg-red-500', ELEVATED: 'bg-amber-500', WATCH: 'bg-sky-400', GREEN: 'bg-emerald-400',
    };
    return c[level] || c['GREEN'];
  };

  const riskBadge = (level: string) => {
    const c: Record<string, string> = {
      CRITICAL: 'bg-red-500/15 text-red-400 border-red-500/30',
      HIGH: 'bg-red-500/15 text-red-400 border-red-500/30',
      ELEVATED: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      WATCH: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
      GREEN: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    };
    return c[level] || c['GREEN'];
  };

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-bold text-white">Workers</h1>

      {/* Search & Filters */}
      <div className="space-y-3">
        <input
          type="text"
          placeholder="Search by ID or role..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800/60 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-sky-500 transition"
        />

        <div className="flex items-center gap-2">
          {[
            { key: 'attention' as const, label: `Attention (${attentionCount})` },
            { key: 'all' as const, label: `All (${priorityItems.length})` },
            { key: 'safe' as const, label: `Safe (${safeCount})` },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition cursor-pointer ${
                statusFilter === tab.key
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                  : 'bg-slate-900 text-slate-400 border border-slate-800/60 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Worker Cards (mobile) / Table (desktop) */}
      {workers.length === 0 ? (
        <div className="bg-slate-900 rounded-2xl border border-slate-800/60 p-8 text-center text-slate-500 text-sm">
          No workers match your filters
        </div>
      ) : (
        <>
          {/* Mobile: Cards */}
          <div className="space-y-2 md:hidden">
            {workers.map((w) => (
              <button
                key={w.worker_id}
                onClick={() => onSelectWorker(w.worker_id)}
                className="w-full bg-slate-900 rounded-xl border border-slate-800/60 p-3.5 flex items-center justify-between hover:bg-slate-800/60 transition cursor-pointer text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${riskDot(w.current_risk_level || 'GREEN')}`}></div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white">{w.worker_id}</div>
                    <div className="text-xs text-slate-400 truncate">{w.role || 'Worker'} · {w.zone_id || 'Zone D'}</div>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold border shrink-0 ${riskBadge(w.current_risk_level || 'GREEN')}`}>
                  {w.current_risk_level || 'GREEN'}
                </span>
              </button>
            ))}
          </div>

          {/* Desktop: Table */}
          <div className="hidden md:block bg-slate-900 rounded-2xl border border-slate-800/60 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800/60 text-xs text-slate-400 uppercase tracking-wider">
                  <th className="text-left p-3.5 font-semibold">Worker</th>
                  <th className="text-left p-3.5 font-semibold">Zone</th>
                  <th className="text-left p-3.5 font-semibold">Risk</th>
                  <th className="text-left p-3.5 font-semibold">Forecast</th>
                  <th className="text-right p-3.5 font-semibold"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {workers.map((w) => (
                  <tr
                    key={w.worker_id}
                    onClick={() => onSelectWorker(w.worker_id)}
                    className="hover:bg-slate-800/40 transition cursor-pointer"
                  >
                    <td className="p-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${riskDot(w.current_risk_level || 'GREEN')}`}></div>
                        <div>
                          <div className="font-semibold text-white">{w.worker_id}</div>
                          <div className="text-xs text-slate-500">{w.role || 'Worker'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5 text-slate-300">{w.zone_id || 'Zone D'}</td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold border ${riskBadge(w.current_risk_level || 'GREEN')}`}>
                        {w.current_risk_level || 'GREEN'}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-400 text-xs">
                      {w.predicted_risk_level ? `Pred: ${w.predicted_risk_level}` : '—'}
                    </td>
                    <td className="p-3.5 text-right">
                      <span className="text-sky-400 text-xs font-medium">Inspect →</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="text-xs text-slate-500 text-center">
            Showing {workers.length} of {priorityItems.length} workers
          </div>
        </>
      )}
    </div>
  );
};
