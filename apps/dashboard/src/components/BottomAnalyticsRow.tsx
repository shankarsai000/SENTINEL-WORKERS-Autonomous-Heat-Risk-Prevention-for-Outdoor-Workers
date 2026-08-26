import React from 'react';
import { Incident } from '../types';

interface BottomAnalyticsRowProps {
  incidents: Incident[];
  onSelectIncident: (id: string) => void;
  observation?: any;
}

export const BottomAnalyticsRow: React.FC<BottomAnalyticsRowProps> = ({
  incidents,
  onSelectIncident,
  observation,
}) => {
  const heatIndex = observation?.apparent_temperature_c ? `${observation.apparent_temperature_c.toFixed(1)}°C` : '42.3°C';
  const humidity = observation?.humidity_pct ? `${Math.round(observation.humidity_pct)}%` : '28%';
  const solar = observation?.solar_irradiance ? `${Math.round(observation.solar_irradiance)} W/m²` : '850 W/m²';
  const wind = '5 km/h';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
      {/* 1. Active Incidents Card */}
      <div className="bg-[#111828]/95 border border-[#1e293b]/70 rounded-xl p-3.5 shadow-md flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-2 border-b border-[#1e293b]/60">
            <h3 className="text-xs font-bold text-white tracking-tight">Active Incidents</h3>
            <button className="text-[10px] text-blue-400 hover:text-blue-300 font-medium transition">
              View all
            </button>
          </div>

          <div className="mt-2.5 space-y-2">
            {/* Incident 1 */}
            <div
              onClick={() => onSelectIncident('INC-4651-A')}
              className="p-2 rounded-lg bg-[#0d1322]/80 border border-[#1e293b]/50 hover:bg-[#172033]/80 transition cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <span className="text-red-400 text-xs">⚠️</span>
                  <span className="font-mono font-bold text-xs text-white">INC-4651-A</span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                    HIGH
                  </span>
                </div>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  ACTIVE
                </span>
              </div>
              <div className="text-[11px] font-medium text-slate-200 mt-1">Heat stress cluster in Zone A</div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 mt-0.5">
                <span className="text-emerald-400 font-medium">113 workers affected</span>
                <span className="text-slate-500">2m ago</span>
              </div>
              <div className="text-[9px] text-slate-400 mt-0.5">Supervisor: Unassigned</div>
            </div>

            {/* Incident 2 */}
            <div
              onClick={() => onSelectIncident('INC-9848-A')}
              className="p-2 rounded-lg bg-[#0d1322]/80 border border-[#1e293b]/50 hover:bg-[#172033]/80 transition cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <span className="text-amber-400 text-xs">⚠️</span>
                  <span className="font-mono font-bold text-xs text-white">INC-9848-A</span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    ELEVATED
                  </span>
                </div>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  ACTIVE
                </span>
              </div>
              <div className="text-[11px] font-medium text-slate-200 mt-1">Heat stress cluster in Zone C</div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 mt-0.5">
                <span className="text-emerald-400 font-medium">90 workers affected</span>
                <span className="text-slate-500">15m ago</span>
              </div>
              <div className="text-[9px] text-slate-400 mt-0.5">Supervisor: Unassigned</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Risk Trend (Last 1 Hour) */}
      <div className="bg-[#111828]/95 border border-[#1e293b]/70 rounded-xl p-3.5 shadow-md flex flex-col justify-between">
        <div>
          <div className="pb-2 border-b border-[#1e293b]/60">
            <h3 className="text-xs font-bold text-white tracking-tight">Risk Trend (Last 1 Hour)</h3>
          </div>

          <div className="mt-2.5 h-28 flex items-center justify-center">
            <svg viewBox="0 0 100 50" className="w-full h-full overflow-visible">
              {/* Y Axis Grid Lines */}
              <line x1="10" y1="5" x2="95" y2="5" stroke="#1e293b" strokeWidth="0.5" />
              <line x1="10" y1="16" x2="95" y2="16" stroke="#1e293b" strokeWidth="0.5" />
              <line x1="10" y1="28" x2="95" y2="28" stroke="#1e293b" strokeWidth="0.5" />
              <line x1="10" y1="40" x2="95" y2="40" stroke="#1e293b" strokeWidth="0.5" />

              {/* Y Axis Labels */}
              <text x="8" y="6" fill="#64748b" fontSize="2.8" textAnchor="end">100</text>
              <text x="8" y="17.5" fill="#64748b" fontSize="2.8" textAnchor="end">75</text>
              <text x="8" y="29.5" fill="#64748b" fontSize="2.8" textAnchor="end">50</text>
              <text x="8" y="41.5" fill="#64748b" fontSize="2.8" textAnchor="end">25</text>
              <text x="8" y="47" fill="#64748b" fontSize="2.8" textAnchor="end">0</text>

              {/* Red Line (High) */}
              <polyline
                fill="none"
                stroke="#ef4444"
                strokeWidth="1.2"
                points="12,18 28,16 44,19 60,15 76,21 92,17"
              />
              <circle cx="12" cy="18" r="1.2" fill="#ef4444" />
              <circle cx="28" cy="16" r="1.2" fill="#ef4444" />
              <circle cx="44" cy="19" r="1.2" fill="#ef4444" />
              <circle cx="60" cy="15" r="1.2" fill="#ef4444" />
              <circle cx="76" cy="21" r="1.2" fill="#ef4444" />
              <circle cx="92" cy="17" r="1.2" fill="#ef4444" />

              {/* Orange Line (Elevated) */}
              <polyline
                fill="none"
                stroke="#f97316"
                strokeWidth="1.2"
                points="12,27 28,29 44,26 60,28 76,24 92,26"
              />
              <circle cx="12" cy="27" r="1.2" fill="#f97316" />
              <circle cx="28" cy="29" r="1.2" fill="#f97316" />
              <circle cx="44" cy="26" r="1.2" fill="#f97316" />
              <circle cx="60" cy="28" r="1.2" fill="#f97316" />
              <circle cx="76" cy="24" r="1.2" fill="#f97316" />
              <circle cx="92" cy="26" r="1.2" fill="#f97316" />

              {/* Yellow Line (Watch) */}
              <polyline
                fill="none"
                stroke="#eab308"
                strokeWidth="1.2"
                points="12,36 28,34 44,38 60,35 76,32 92,34"
              />
              <circle cx="12" cy="36" r="1.2" fill="#eab308" />
              <circle cx="28" cy="34" r="1.2" fill="#eab308" />
              <circle cx="44" cy="38" r="1.2" fill="#eab308" />
              <circle cx="60" cy="35" r="1.2" fill="#eab308" />
              <circle cx="76" cy="32" r="1.2" fill="#eab308" />
              <circle cx="92" cy="34" r="1.2" fill="#eab308" />

              {/* Green Line (Green) */}
              <polyline
                fill="none"
                stroke="#10b981"
                strokeWidth="1.2"
                points="12,44 28,45 44,43 60,45 76,44 92,45"
              />
              <circle cx="12" cy="44" r="1.2" fill="#10b981" />
              <circle cx="28" cy="45" r="1.2" fill="#10b981" />
              <circle cx="44" cy="43" r="1.2" fill="#10b981" />
              <circle cx="60" cy="45" r="1.2" fill="#10b981" />
              <circle cx="76" cy="44" r="1.2" fill="#10b981" />
              <circle cx="92" cy="45" r="1.2" fill="#10b981" />

              {/* X Axis Labels */}
              <text x="12" y="49" fill="#64748b" fontSize="2.6" textAnchor="middle">08:00</text>
              <text x="32" y="49" fill="#64748b" fontSize="2.6" textAnchor="middle">08:15</text>
              <text x="52" y="49" fill="#64748b" fontSize="2.6" textAnchor="middle">08:30</text>
              <text x="72" y="49" fill="#64748b" fontSize="2.6" textAnchor="middle">08:45</text>
              <text x="92" y="49" fill="#64748b" fontSize="2.6" textAnchor="middle">09:00</text>
            </svg>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center space-x-3 text-[10px] text-slate-400 font-medium pt-2 border-t border-[#1e293b]/40">
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-sm bg-red-500"></span>
            <span>High</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-sm bg-orange-500"></span>
            <span>Elevated</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-sm bg-yellow-400"></span>
            <span>Watch</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-sm bg-emerald-400"></span>
            <span>Green</span>
          </span>
        </div>
      </div>

      {/* 3. Incidents Over Time */}
      <div className="bg-[#111828]/95 border border-[#1e293b]/70 rounded-xl p-3.5 shadow-md flex flex-col justify-between">
        <div>
          <div className="pb-2 border-b border-[#1e293b]/60">
            <h3 className="text-xs font-bold text-white tracking-tight">Incidents Over Time</h3>
          </div>

          <div className="mt-2.5 h-28 flex items-center justify-center">
            <svg viewBox="0 0 100 50" className="w-full h-full overflow-visible">
              {/* Y Axis Grid Lines */}
              <line x1="10" y1="8" x2="95" y2="8" stroke="#1e293b" strokeWidth="0.5" />
              <line x1="10" y1="20" x2="95" y2="20" stroke="#1e293b" strokeWidth="0.5" />
              <line x1="10" y1="32" x2="95" y2="32" stroke="#1e293b" strokeWidth="0.5" />
              <line x1="10" y1="44" x2="95" y2="44" stroke="#1e293b" strokeWidth="0.5" />

              {/* Y Axis Labels */}
              <text x="8" y="9.5" fill="#64748b" fontSize="2.8" textAnchor="end">10</text>
              <text x="8" y="21.5" fill="#64748b" fontSize="2.8" textAnchor="end">6</text>
              <text x="8" y="33.5" fill="#64748b" fontSize="2.8" textAnchor="end">2</text>
              <text x="8" y="45.5" fill="#64748b" fontSize="2.8" textAnchor="end">0</text>

              {/* Bars Group 1: 08:00 */}
              <rect x="13" y="34" width="2.4" height="10" fill="#f97316" rx="0.5" />
              <rect x="16" y="40" width="2.4" height="4" fill="#ef4444" rx="0.5" />
              <rect x="19" y="30" width="2.4" height="14" fill="#3b82f6" rx="0.5" />

              {/* Bars Group 2: 08:15 */}
              <rect x="29" y="36" width="2.4" height="8" fill="#f97316" rx="0.5" />
              <rect x="32" y="38" width="2.4" height="6" fill="#ef4444" rx="0.5" />
              <rect x="35" y="26" width="2.4" height="18" fill="#3b82f6" rx="0.5" />

              {/* Bars Group 3: 08:30 */}
              <rect x="45" y="32" width="2.4" height="12" fill="#f97316" rx="0.5" />
              <rect x="48" y="42" width="2.4" height="2" fill="#ef4444" rx="0.5" />
              <rect x="51" y="16" width="2.4" height="28" fill="#3b82f6" rx="0.5" />

              {/* Bars Group 4: 08:45 */}
              <rect x="61" y="34" width="2.4" height="10" fill="#f97316" rx="0.5" />
              <rect x="64" y="38" width="2.4" height="6" fill="#ef4444" rx="0.5" />
              <rect x="67" y="24" width="2.4" height="20" fill="#3b82f6" rx="0.5" />

              {/* Bars Group 5: 09:00 */}
              <rect x="77" y="38" width="2.4" height="6" fill="#f97316" rx="0.5" />
              <rect x="80" y="35" width="2.4" height="9" fill="#ef4444" rx="0.5" />
              <rect x="83" y="22" width="2.4" height="22" fill="#3b82f6" rx="0.5" />

              {/* X Axis Labels */}
              <text x="17.5" y="48.5" fill="#64748b" fontSize="2.6" textAnchor="middle">08:00</text>
              <text x="33.5" y="48.5" fill="#64748b" fontSize="2.6" textAnchor="middle">08:15</text>
              <text x="49.5" y="48.5" fill="#64748b" fontSize="2.6" textAnchor="middle">08:30</text>
              <text x="65.5" y="48.5" fill="#64748b" fontSize="2.6" textAnchor="middle">08:45</text>
              <text x="81.5" y="48.5" fill="#64748b" fontSize="2.6" textAnchor="middle">09:00</text>
            </svg>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center space-x-3 text-[10px] text-slate-400 font-medium pt-2 border-t border-[#1e293b]/40">
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-sm bg-red-500"></span>
            <span>High</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-sm bg-orange-500"></span>
            <span>Elevated</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-sm bg-blue-500"></span>
            <span>Total</span>
          </span>
        </div>
      </div>

      {/* 4. Environmental Snapshot */}
      <div className="bg-[#111828]/95 border border-[#1e293b]/70 rounded-xl p-3.5 shadow-md flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-2 border-b border-[#1e293b]/60">
            <h3 className="text-xs font-bold text-white tracking-tight">Environmental Snapshot</h3>
            <button className="text-[10px] text-blue-400 hover:text-blue-300 font-medium transition">
              More details
            </button>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            {/* Heat Index */}
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-lg bg-orange-500/15 text-orange-400 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-bold text-white leading-tight">{heatIndex}</div>
                <div className="text-[10px] text-slate-400 font-medium leading-tight">Heat Index</div>
              </div>
            </div>

            {/* Humidity */}
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-bold text-white leading-tight">{humidity}</div>
                <div className="text-[10px] text-slate-400 font-medium leading-tight">Humidity</div>
              </div>
            </div>

            {/* Solar Irradiance */}
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-bold text-white leading-tight">{solar}</div>
                <div className="text-[10px] text-slate-400 font-medium leading-tight">Solar Irradiance</div>
              </div>
            </div>

            {/* Wind Speed */}
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-lg bg-teal-500/15 text-teal-400 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-bold text-white leading-tight">{wind}</div>
                <div className="text-[10px] text-slate-400 font-medium leading-tight">Wind Speed</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
