import React from 'react';
import { TopKpiCards } from '../TopKpiCards.js';
import { PriorityQueue } from '../PriorityQueue.js';
import { RiskMap } from '../RiskMap.js';
import { RightSidebarCards } from '../RightSidebarCards.js';
import { BottomAnalyticsRow } from '../BottomAnalyticsRow.js';
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
  mapData,
  incidents,
  latestObservation,
  selectedWorkerId,
  selectedIncidentId,
  timeRange,
  onTimeRangeChange,
  onSelectWorker,
  onSelectIncident,
}) => {
  return (
    <div className="space-y-3.5">
      {/* Top Row: KPI Cards with Time Filter on Right */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Operations Center Overview
            </h2>
          </div>
          <div className="relative">
            <select
              value={timeRange}
              onChange={(e) => onTimeRangeChange(e.target.value)}
              className="bg-[#111828] border border-[#1e293b] text-slate-300 text-xs rounded-lg px-2.5 py-1 focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer pr-6 appearance-none font-medium"
            >
              <option value="1h">Last 1 hour</option>
              <option value="3h">Last 3 hours</option>
              <option value="8h">Full Shift</option>
            </select>
            <svg
              className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        <TopKpiCards summary={opsSummary} />
      </div>

      {/* Middle Row: 3-Column Operations Center Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch min-h-[460px]">
        {/* Left: Supervisor Priority Queue (approx 28% = 3.5 cols) */}
        <div className="lg:col-span-4 xl:col-span-3 h-full">
          <PriorityQueue
            items={priorityItems}
            selectedWorkerId={selectedWorkerId}
            onSelectWorker={onSelectWorker}
          />
        </div>

        {/* Center: Live Risk Map & Spatial Zones (approx 48% = 6 cols) */}
        <div className="lg:col-span-8 xl:col-span-6 h-full">
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

        {/* Right: Alerts & System Health (approx 24% = 3 cols) */}
        <div className="lg:col-span-12 xl:col-span-3 h-full">
          <RightSidebarCards summary={opsSummary} />
        </div>
      </div>

      {/* Bottom Row: 4 Analytics Cards */}
      <BottomAnalyticsRow
        incidents={incidents}
        onSelectIncident={onSelectIncident}
        observation={latestObservation}
      />
    </div>
  );
};
