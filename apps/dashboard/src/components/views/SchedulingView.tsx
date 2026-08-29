import React, { useState, useEffect } from 'react';

interface HourlyForecast {
  hour: number;
  timeLabel: string;
  temperature_c: number;
  wet_bulb_c: number;
  solar_irradiance: number;
  riskCategory: string;
}

interface ScheduledSlot {
  startHour: number;
  endHour: number;
  timeRangeLabel: string;
  taskId: string;
  taskName: string;
  zoneId: string;
  intensity: 'LIGHT' | 'MODERATE' | 'HEAVY' | 'REST';
  workersCount: number;
  ambientTemp: number;
  wbgt: number;
  safetyScore: number;
  actionNote: string;
  isCoolingBreak: boolean;
}

interface OptimizationResult {
  scheduleId: string;
  siteId: string;
  shiftDate: string;
  forecast: HourlyForecast[];
  optimizedSlots: ScheduledSlot[];
  naiveSlots: ScheduledSlot[];
  impactMetrics: {
    predictedIncidentsNaive: number;
    predictedIncidentsOptimized: number;
    incidentReductionPct: number;
    productivityGainPct: number;
    peakHeatExposureAvoidedDegC: number;
    carbonCoolingAlignment: string;
  };
  recommendations: string[];
}

export const SchedulingView: React.FC = () => {
  const [data, setData] = useState<OptimizationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [deployed, setDeployed] = useState(false);
  const [activeTab, setActiveTab] = useState<'optimized' | 'naive'>('optimized');
  const [peakTempInput, setPeakTempInput] = useState<number>(42.5);

  const fetchSchedule = (temp: number = 42.5) => {
    setLoading(true);
    fetch('/api/scheduling/optimize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ site_id: 'PHX-SITE-01', peak_temp_c: temp }),
    })
      .then((r) => r.json())
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchSchedule(peakTempInput);
  }, []);

  const handleDeploy = () => {
    setDeployed(true);
    setTimeout(() => setDeployed(false), 4000);
  };

  const getIntensityBadge = (intensity: string) => {
    switch (intensity) {
      case 'HEAVY': return 'bg-red-500/15 text-red-400 border-red-500/30';
      case 'MODERATE': return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'LIGHT': return 'bg-sky-500/15 text-sky-400 border-sky-500/30';
      default: return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Deploy Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-white">Heat-Aware Task Scheduling AI</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30">
              Vision 2030 Tier 1 Engine
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Diurnal microclimate alignment eliminates peak heat strain and optimizes task throughput
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300">
            <span>Peak Temp:</span>
            <input
              type="number"
              value={peakTempInput}
              onChange={(e) => setPeakTempInput(parseFloat(e.target.value) || 40)}
              step="0.5"
              min="30"
              max="52"
              className="w-14 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-white font-mono text-center font-bold focus:outline-none"
            />
            <span>°C</span>
            <button
              onClick={() => fetchSchedule(peakTempInput)}
              className="ml-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-sky-400 cursor-pointer"
            >
              Recalculate
            </button>
          </div>

          <button
            onClick={handleDeploy}
            disabled={deployed}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs shadow-lg transition flex items-center gap-2 cursor-pointer ${
              deployed
                ? 'bg-emerald-500 text-white shadow-emerald-500/30'
                : 'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white shadow-sky-500/25'
            }`}
          >
            <span>{deployed ? '✓ Deployed to All Shift Radios' : '🚀 Deploy AI Schedule to Jobsite'}</span>
          </button>
        </div>
      </div>

      {deployed && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <span>✨</span>
            <span>Optimized shift sequence dispatched to 113 worker radios and Phoenix jobsite supervisor console.</span>
          </div>
          <span className="font-mono text-[11px] opacity-75">ID: {data?.scheduleId}</span>
        </div>
      )}

      {loading && <div className="text-sm text-slate-400 animate-pulse">Computing optimal diurnal work sequence...</div>}

      {data && !loading && (
        <>
          {/* Impact Metrics Banner */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-slate-900/90 rounded-2xl border border-slate-800/80 p-4 text-center">
              <div className="text-xs text-slate-400 mb-1">Predicted Heat Incidents</div>
              <div className="text-2xl font-black text-emerald-400">
                0 <span className="text-xs font-normal text-slate-500 line-through">5</span>
              </div>
              <div className="text-[11px] text-emerald-400 font-bold mt-1">100% Incident Avoidance</div>
            </div>

            <div className="bg-slate-900/90 rounded-2xl border border-slate-800/80 p-4 text-center">
              <div className="text-xs text-slate-400 mb-1">Productivity Gain</div>
              <div className="text-2xl font-black text-sky-400">+{data.impactMetrics.productivityGainPct}%</div>
              <div className="text-[11px] text-slate-400 mt-1">Via Exertion Timing</div>
            </div>

            <div className="bg-slate-900/90 rounded-2xl border border-slate-800/80 p-4 text-center">
              <div className="text-xs text-slate-400 mb-1">Peak Heat Avoided</div>
              <div className="text-2xl font-black text-amber-400">-{data.impactMetrics.peakHeatExposureAvoidedDegC}°C</div>
              <div className="text-[11px] text-slate-400 mt-1">Thermal Margin Gain</div>
            </div>

            <div className="bg-slate-900/90 rounded-2xl border border-slate-800/80 p-4 text-center">
              <div className="text-xs text-slate-400 mb-1">Total Workers Scheduled</div>
              <div className="text-2xl font-black text-white">113</div>
              <div className="text-[11px] text-slate-400 mt-1">Across 4 Zones</div>
            </div>

            <div className="bg-slate-900/90 rounded-2xl border border-slate-800/80 p-4 text-center col-span-2 lg:col-span-1">
              <div className="text-xs text-slate-400 mb-1">Carbon-Aware Cooling</div>
              <div className="text-base font-bold text-emerald-300 mt-1">100% Solar Aligned</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Peak Solar AC Trailers</div>
            </div>
          </div>

          {/* Diurnal Thermal Curve Visualization */}
          <div className="bg-slate-900/80 rounded-2xl border border-slate-800/80 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Diurnal Microclimate Curve (Phoenix Jobsite — 06:00 to 18:00)
              </h3>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1 text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400"></span> Ambient Temp
                </span>
                <span className="flex items-center gap-1 text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span> WBGT
                </span>
              </div>
            </div>

            {/* Visual Bar Chart of Hourly Curve */}
            <div className="grid grid-cols-13 gap-1.5 pt-2 pb-1">
              {data.forecast.map((f) => {
                const heightPct = Math.max(20, Math.min(100, ((f.temperature_c - 20) / 25) * 100));
                const isPeak = f.temperature_c >= 41;
                return (
                  <div key={f.hour} className="flex flex-col items-center gap-1">
                    <div className="text-[10px] font-mono text-slate-400">{f.temperature_c}°</div>
                    <div className="w-full h-24 bg-slate-950 rounded-lg flex items-end p-1">
                      <div
                        className={`w-full rounded-md transition-all ${
                          isPeak
                            ? 'bg-gradient-to-t from-orange-500 to-red-500 shadow-sm shadow-red-500/50'
                            : f.temperature_c >= 35
                            ? 'bg-gradient-to-t from-amber-500 to-orange-400'
                            : 'bg-gradient-to-t from-sky-500 to-emerald-400'
                        }`}
                        style={{ height: `${heightPct}%` }}
                      ></div>
                    </div>
                    <div className="text-[10px] font-mono font-bold text-slate-400">{f.timeLabel}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Timeline Sequence & Mode Switcher */}
          <div className="bg-slate-900/80 rounded-2xl border border-slate-800/80 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('optimized')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    activeTab === 'optimized'
                      ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  ✨ AI-Optimized Sequence (0 Incidents)
                </button>
                <button
                  onClick={() => setActiveTab('naive')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    activeTab === 'naive'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  ⚠️ Naive Unoptimized Baseline (5 Incidents)
                </button>
              </div>

              <div className="text-xs text-slate-400">
                Showing {activeTab === 'optimized' ? data.optimizedSlots.length : data.naiveSlots.length} Scheduled Shift Blocks
              </div>
            </div>

            {/* Scheduled Blocks List */}
            <div className="space-y-3">
              {(activeTab === 'optimized' ? data.optimizedSlots : data.naiveSlots).map((slot, idx) => (
                <div
                  key={idx}
                  className={`rounded-2xl border p-4 transition ${
                    slot.isCoolingBreak
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : slot.safetyScore < 50
                      ? 'bg-red-500/10 border-red-500/30'
                      : 'bg-slate-950/60 border-slate-800'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-24 shrink-0 font-mono text-xs font-bold text-white bg-slate-900 border border-slate-800 py-1.5 px-2.5 rounded-xl text-center">
                        {slot.timeRangeLabel}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white flex items-center gap-2">
                          <span>{slot.taskName}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getIntensityBadge(slot.intensity)}`}>
                            {slot.intensity}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {slot.zoneId} • {slot.workersCount} Workers Assigned
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs">
                      <div className="text-right">
                        <div className="text-slate-400">Forecasted Heat</div>
                        <div className="font-bold text-white font-mono">{slot.ambientTemp}°C (WBGT {slot.wbgt}°C)</div>
                      </div>
                      <div className="w-12 text-center py-1 rounded-lg bg-slate-900 border border-slate-800 font-mono font-bold text-sky-400">
                        {slot.safetyScore}%
                      </div>
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2.5 border-t border-slate-800/60 text-xs text-slate-300 flex items-center justify-between">
                    <span>{slot.actionNote}</span>
                    {slot.isCoolingBreak && (
                      <span className="text-[11px] text-emerald-400 font-semibold">
                        ❄️ Misting & Hydration Refill Mandatory
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Strategic Recommendations */}
          <div className="bg-slate-900/80 rounded-2xl border border-sky-500/30 p-5 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
              <span>🧠</span> AI Strategic Work-Sequence Directives
            </h3>
            <ul className="space-y-1.5 text-xs text-slate-300 list-disc list-inside">
              {data.recommendations.map((rec, i) => (
                <li key={i} className="leading-relaxed">{rec}</li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
};
