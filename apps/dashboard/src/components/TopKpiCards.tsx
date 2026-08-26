import React from 'react';
import { OperationsSummary } from '../types';

interface TopKpiCardsProps {
  summary: OperationsSummary | null;
}

export const TopKpiCards: React.FC<TopKpiCardsProps> = ({ summary }) => {
  const totalWorkers = summary?.active_workers ?? 113;
  const greenSafe = summary?.green_count ?? 106;
  const watchElevated = (summary?.watch_count ?? 5) + (summary?.elevated_count ?? 2);
  const highCritical = (summary?.high_count ?? 0) + (summary?.critical_count ?? 0);
  const criticalCount = summary?.critical_count ?? 0;
  const earlyWarnings = summary?.predicted_deterioration_count ?? 113;
  const activeIncidents = summary?.active_incidents ?? 2;
  const pendingAcks = summary?.pending_ack_count ?? 0;

  const cards = [
    {
      title: 'Total Workers',
      value: totalWorkers,
      subtitle: `${greenSafe} Green (Safe)`,
      subtitleColor: 'text-emerald-400',
      iconBg: 'bg-blue-500/15 text-blue-400',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      title: 'Watch & Elevated',
      value: watchElevated,
      subtitle: 'Monitoring thresholds',
      subtitleColor: 'text-amber-400',
      iconBg: 'bg-amber-500/15 text-amber-400',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ),
    },
    {
      title: 'High & Critical',
      value: highCritical,
      subtitle: `${criticalCount} Critical`,
      subtitleColor: 'text-red-400',
      iconBg: 'bg-red-500/15 text-red-400',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
    {
      title: 'Early Warnings',
      value: earlyWarnings,
      subtitle: 'Pred breach < 30m',
      subtitleColor: 'text-orange-400',
      iconBg: 'bg-orange-500/15 text-orange-400',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      ),
    },
    {
      title: 'Active Incidents',
      value: activeIncidents,
      subtitle: 'Spatial clusters',
      subtitleColor: 'text-purple-400',
      iconBg: 'bg-purple-500/15 text-purple-400',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
    },
    {
      title: 'Pending ACKs',
      value: pendingAcks,
      subtitle: 'Advisories awaiting ack',
      subtitleColor: 'text-emerald-400',
      iconBg: 'bg-teal-500/15 text-teal-400',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
      {cards.map((c, idx) => (
        <div
          key={idx}
          className="bg-[#111828]/90 border border-[#1e293b]/70 hover:border-[#334155] rounded-xl p-3.5 flex items-center space-x-3 transition shadow-sm"
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${c.iconBg}`}>
            {c.icon}
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-slate-400 font-medium leading-none truncate">{c.title}</div>
            <div className="text-xl font-bold text-white leading-tight mt-1">{c.value}</div>
            <div className={`text-[10px] ${c.subtitleColor} font-medium leading-none mt-0.5 truncate`}>
              {c.subtitle}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
