import React from 'react';
import { IncidentCenter } from '../IncidentCenter.js';
import { Incident, SupervisorRole } from '../../types.js';

interface IncidentsAnalyticsViewProps {
  incidents: Incident[];
  userRole: SupervisorRole;
  selectedIncidentId: string | null;
  latestObservation: any;
  onSelectIncident: (incidentId: string) => void;
  onAcknowledgeIncident: (incidentId: string) => void;
  onAssignIncident: (incidentId: string, owner: string) => void;
  onStartMitigation: (incidentId: string) => void;
  onEscalateIncident: (incidentId: string, reason: string) => void;
  onResolveIncident: (incidentId: string, resolution: string) => void;
}

export const IncidentsAnalyticsView: React.FC<IncidentsAnalyticsViewProps> = ({
  incidents,
  userRole,
  selectedIncidentId,
  latestObservation,
  onSelectIncident,
  onAcknowledgeIncident,
  onAssignIncident,
  onStartMitigation,
  onEscalateIncident,
  onResolveIncident,
}) => {
  const activeIncidentsCount = incidents.filter((i) => i.status !== 'RESOLVED' && i.status !== 'CLOSED').length;
  const resolvedIncidentsCount = incidents.filter((i) => i.status === 'RESOLVED' || i.status === 'CLOSED').length;

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#0e1424] p-4 rounded-xl border border-[#1e293b]/70">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400 animate-pulse"></span>
            <h2 className="text-sm font-bold text-white tracking-wide uppercase">
              Incident Management & Predictive Trends Studio
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time heat stress clusters, escalation mitigation workflows, and 1-hour risk trajectory forecasting
          </p>
        </div>

        {/* Quick Stats Badges */}
        <div className="flex items-center space-x-2 text-xs">
          <div className="px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 font-semibold">
            🚨 {activeIncidentsCount} Active Clusters
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-semibold">
            ✓ {resolvedIncidentsCount} Resolved Today
          </div>
        </div>
      </div>

      {/* 2-Column Split Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column: Full Interactive Incident Center (7 cols) */}
        <div className="lg:col-span-7 bg-[#0e1424] rounded-xl border border-[#1e293b] p-4 min-h-[580px]">
          <IncidentCenter
            incidents={incidents}
            userRole={userRole}
            selectedIncidentId={selectedIncidentId}
            onSelectIncident={onSelectIncident}
            onAcknowledge={onAcknowledgeIncident}
            onAssign={onAssignIncident}
            onStartMitigation={onStartMitigation}
            onEscalate={onEscalateIncident}
            onResolve={onResolveIncident}
          />
        </div>

        {/* Right Column: Predictive Analytics & Charts (5 cols) */}
        <div className="lg:col-span-5 space-y-3.5">
          {/* Risk Trend Multi-line Chart */}
          <div className="bg-[#0e1424] rounded-xl border border-[#1e293b] p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Risk Trend (Last 1 Hour)
              </h3>
              <span className="text-[10px] text-slate-400 font-medium">10m intervals</span>
            </div>

            <div className="h-44 w-full flex items-center justify-center pt-2">
              <svg className="w-full h-full" viewBox="0 0 320 140">
                {/* Grid horizontal lines */}
                <line x1="30" y1="20" x2="310" y2="20" stroke="#1e293b" strokeDasharray="3,3" strokeWidth="1" />
                <line x1="30" y1="50" x2="310" y2="50" stroke="#1e293b" strokeDasharray="3,3" strokeWidth="1" />
                <line x1="30" y1="80" x2="310" y2="80" stroke="#1e293b" strokeDasharray="3,3" strokeWidth="1" />
                <line x1="30" y1="110" x2="310" y2="110" stroke="#1e293b" strokeDasharray="3,3" strokeWidth="1" />

                {/* Y Axis Labels */}
                <text x="5" y="24" fill="#64748b" fontSize="8" fontFamily="sans-serif">100</text>
                <text x="5" y="54" fill="#64748b" fontSize="8" fontFamily="sans-serif">75</text>
                <text x="5" y="84" fill="#64748b" fontSize="8" fontFamily="sans-serif">50</text>
                <text x="5" y="114" fill="#64748b" fontSize="8" fontFamily="sans-serif">25</text>

                {/* X Axis Labels */}
                <text x="35" y="132" fill="#64748b" fontSize="8" fontFamily="sans-serif">08:00</text>
                <text x="100" y="132" fill="#64748b" fontSize="8" fontFamily="sans-serif">08:15</text>
                <text x="165" y="132" fill="#64748b" fontSize="8" fontFamily="sans-serif">08:30</text>
                <text x="230" y="132" fill="#64748b" fontSize="8" fontFamily="sans-serif">08:45</text>
                <text x="290" y="132" fill="#64748b" fontSize="8" fontFamily="sans-serif">09:00</text>

                {/* High Line (Red/Coral) */}
                <path
                  d="M 40 45 Q 100 40, 165 30 T 240 50 T 300 40"
                  fill="none"
                  stroke="#f43f5e"
                  strokeWidth="2.5"
                />

                {/* Elevated Line (Amber) */}
                <path
                  d="M 40 70 Q 100 85, 165 80 T 240 70 T 300 65"
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="2"
                />

                {/* Watch Line (Sky) */}
                <path
                  d="M 40 90 Q 100 95, 165 105 T 240 95 T 300 90"
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="2"
                />

                {/* Safe Green Line */}
                <path
                  d="M 40 105 Q 100 110, 165 110 T 240 105 T 300 100"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2"
                />
              </svg>
            </div>

            <div className="flex items-center justify-center space-x-4 text-[10px] text-slate-400 pt-1">
              <span className="flex items-center space-x-1"><span className="w-2 h-2 rounded-full bg-rose-500"></span><span>High</span></span>
              <span className="flex items-center space-x-1"><span className="w-2 h-2 rounded-full bg-amber-400"></span><span>Elevated</span></span>
              <span className="flex items-center space-x-1"><span className="w-2 h-2 rounded-full bg-sky-400"></span><span>Watch</span></span>
              <span className="flex items-center space-x-1"><span className="w-2 h-2 rounded-full bg-emerald-400"></span><span>Green</span></span>
            </div>
          </div>

          {/* Incidents Over Time Clustered Bar Chart */}
          <div className="bg-[#0e1424] rounded-xl border border-[#1e293b] p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Incidents Over Time
              </h3>
              <span className="text-[10px] text-slate-400 font-medium">Hourly breakdown</span>
            </div>

            <div className="h-40 w-full flex items-center justify-center pt-2">
              <svg className="w-full h-full" viewBox="0 0 320 130">
                <line x1="30" y1="20" x2="310" y2="20" stroke="#1e293b" strokeDasharray="3,3" strokeWidth="1" />
                <line x1="30" y1="55" x2="310" y2="55" stroke="#1e293b" strokeDasharray="3,3" strokeWidth="1" />
                <line x1="30" y1="90" x2="310" y2="90" stroke="#1e293b" strokeDasharray="3,3" strokeWidth="1" />

                <text x="5" y="24" fill="#64748b" fontSize="8" fontFamily="sans-serif">10</text>
                <text x="5" y="59" fill="#64748b" fontSize="8" fontFamily="sans-serif">6</text>
                <text x="5" y="94" fill="#64748b" fontSize="8" fontFamily="sans-serif">2</text>
                <text x="5" y="118" fill="#64748b" fontSize="8" fontFamily="sans-serif">0</text>

                <text x="45" y="125" fill="#64748b" fontSize="8" fontFamily="sans-serif">08:00</text>
                <text x="105" y="125" fill="#64748b" fontSize="8" fontFamily="sans-serif">08:15</text>
                <text x="165" y="125" fill="#64748b" fontSize="8" fontFamily="sans-serif">08:30</text>
                <text x="225" y="125" fill="#64748b" fontSize="8" fontFamily="sans-serif">08:45</text>
                <text x="280" y="125" fill="#64748b" fontSize="8" fontFamily="sans-serif">09:00</text>

                {/* 08:00 */}
                <rect x="42" y="90" width="6" height="28" fill="#f43f5e" rx="1" />
                <rect x="50" y="70" width="6" height="48" fill="#38bdf8" rx="1" />

                {/* 08:15 */}
                <rect x="102" y="95" width="6" height="23" fill="#f43f5e" rx="1" />
                <rect x="110" y="75" width="6" height="43" fill="#38bdf8" rx="1" />

                {/* 08:30 */}
                <rect x="162" y="80" width="6" height="38" fill="#f43f5e" rx="1" />
                <rect x="170" y="45" width="6" height="73" fill="#38bdf8" rx="1" />

                {/* 08:45 */}
                <rect x="222" y="85" width="6" height="33" fill="#f43f5e" rx="1" />
                <rect x="230" y="60" width="6" height="58" fill="#38bdf8" rx="1" />

                {/* 09:00 */}
                <rect x="277" y="90" width="6" height="28" fill="#f43f5e" rx="1" />
                <rect x="285" y="55" width="6" height="63" fill="#38bdf8" rx="1" />
              </svg>
            </div>

            <div className="flex items-center justify-center space-x-4 text-[10px] text-slate-400 pt-1">
              <span className="flex items-center space-x-1"><span className="w-2 h-2 rounded bg-rose-500"></span><span>High</span></span>
              <span className="flex items-center space-x-1"><span className="w-2 h-2 rounded bg-sky-400"></span><span>Total Incidents</span></span>
            </div>
          </div>

          {/* Environmental Parameter Grid */}
          <div className="bg-[#0e1424] rounded-xl border border-[#1e293b] p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Environmental Telemetry
            </h3>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="bg-[#131b2e] p-3 rounded-lg border border-[#1e293b]/60 flex items-center space-x-3">
                <span className="text-xl">🌡️</span>
                <div>
                  <div className="text-[10px] text-slate-400">Heat Index</div>
                  <div className="text-base font-bold text-white">42.3°C</div>
                </div>
              </div>

              <div className="bg-[#131b2e] p-3 rounded-lg border border-[#1e293b]/60 flex items-center space-x-3">
                <span className="text-xl">💧</span>
                <div>
                  <div className="text-[10px] text-slate-400">Humidity</div>
                  <div className="text-base font-bold text-white">28%</div>
                </div>
              </div>

              <div className="bg-[#131b2e] p-3 rounded-lg border border-[#1e293b]/60 flex items-center space-x-3">
                <span className="text-xl">☀️</span>
                <div>
                  <div className="text-[10px] text-slate-400">Solar Irradiance</div>
                  <div className="text-base font-bold text-amber-300">850 W/m²</div>
                </div>
              </div>

              <div className="bg-[#131b2e] p-3 rounded-lg border border-[#1e293b]/60 flex items-center space-x-3">
                <span className="text-xl">💨</span>
                <div>
                  <div className="text-[10px] text-slate-400">Wind Speed</div>
                  <div className="text-base font-bold text-white">5 km/h</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
