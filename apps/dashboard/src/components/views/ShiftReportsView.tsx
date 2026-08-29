import React, { useState, useEffect } from 'react';

interface ShiftReport {
  report_id: string;
  site_id: string;
  date: string;
  shift: string;
  shift_start: string;
  shift_end: string;
  generated_at: string;
  workforce: {
    total_workers: number;
    risk_distribution: Record<string, number>;
  };
  environmental: {
    peak_temperature_c: number | null;
    peak_wbgt_c: number | null;
    peak_heat_index_c: number | null;
    observations_count: number;
    data_source: { fortyguard_live: number; simulation: number; cache: number; total: number };
  };
  interventions: {
    total_actions: number;
    acknowledged: number;
    by_type: Record<string, number>;
    compliance_rate_pct: number;
  };
  incidents: {
    total: number;
    by_severity: Record<string, number>;
    resolved: number;
  };
  compliance: {
    osha_status: 'PASS' | 'NEEDS_REVIEW' | 'FAIL';
    compliance_rate_pct: number;
    critical_workers: number;
    high_risk_workers: number;
  };
  actions_detail: Array<{
    action_id: string;
    worker_id: string;
    type: string;
    issued_at: string;
    acknowledged_at: string | null;
    outcome: string;
    message: string;
  }>;
}

export const ShiftReportsView: React.FC = () => {
  const [report, setReport] = useState<ShiftReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().substring(0, 10));
  const [selectedShift, setSelectedShift] = useState('morning');

  const loadReport = () => {
    setLoading(true);
    fetch(`/api/reports/shift?site_id=PHX-SITE-01&date=${selectedDate}&shift=${selectedShift}`)
      .then((r) => r.json())
      .then((data) => { setReport(data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { loadReport(); }, [selectedDate, selectedShift]);

  const exportCSV = () => {
    window.open(`/api/reports/shift/export?site_id=PHX-SITE-01&date=${selectedDate}&shift=${selectedShift}`, '_blank');
  };

  const oshaColor = (status: string) => {
    if (status === 'PASS') return 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30';
    if (status === 'NEEDS_REVIEW') return 'text-amber-400 bg-amber-500/15 border-amber-500/30';
    return 'text-red-400 bg-red-500/15 border-red-500/30';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-white">Shift & Compliance Reports</h1>
          <p className="text-sm text-slate-400 mt-1">OSHA-ready heat safety shift reports with exportable CSV</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          <select
            value={selectedShift}
            onChange={(e) => setSelectedShift(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
          >
            <option value="morning">Morning (5am–1pm)</option>
            <option value="afternoon">Afternoon (1pm–9pm)</option>
            <option value="night">Night (9pm–5am)</option>
          </select>
          <button
            onClick={exportCSV}
            className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold shadow-lg shadow-sky-500/20 transition cursor-pointer"
          >
            📥 Export CSV
          </button>
        </div>
      </div>

      {loading && <div className="text-sm text-slate-400 animate-pulse">Generating report...</div>}

      {report && !loading && (
        <>
          {/* OSHA Compliance Banner */}
          <div className={`rounded-2xl border p-4 flex items-center justify-between ${oshaColor(report.compliance.osha_status)}`}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{report.compliance.osha_status === 'PASS' ? '✅' : report.compliance.osha_status === 'NEEDS_REVIEW' ? '⚠️' : '🚨'}</span>
              <div>
                <div className="text-sm font-bold">OSHA Compliance: {report.compliance.osha_status.replace('_', ' ')}</div>
                <div className="text-xs opacity-75">Alert compliance rate: {report.compliance.compliance_rate_pct}%</div>
              </div>
            </div>
            <div className="text-xs font-mono opacity-75">{report.report_id}</div>
          </div>

          {/* Summary KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <KpiCard label="Workers on Shift" value={report.workforce.total_workers} icon="👷" />
            <KpiCard
              label="Peak Heat Index"
              value={report.environmental.peak_heat_index_c ? `${report.environmental.peak_heat_index_c.toFixed(1)}°C` : 'N/A'}
              icon="🌡️"
              valueColor={report.environmental.peak_heat_index_c && report.environmental.peak_heat_index_c > 40 ? 'text-red-400' : 'text-amber-300'}
            />
            <KpiCard
              label="Peak WBGT"
              value={report.environmental.peak_wbgt_c ? `${report.environmental.peak_wbgt_c.toFixed(1)}°C` : 'N/A'}
              icon="💧"
            />
            <KpiCard label="Interventions" value={report.interventions.total_actions} icon="🔔" />
            <KpiCard
              label="Compliance"
              value={`${report.interventions.compliance_rate_pct}%`}
              icon="📋"
              valueColor={report.interventions.compliance_rate_pct >= 90 ? 'text-emerald-400' : 'text-amber-400'}
            />
          </div>

          {/* Two Column: Risk Distribution + Incidents */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Risk Distribution */}
            <div className="bg-slate-900/80 rounded-2xl border border-slate-800/80 p-5">
              <h3 className="text-sm font-bold text-slate-300 mb-4">Worker Risk Distribution</h3>
              <div className="space-y-3">
                {Object.entries(report.workforce.risk_distribution).map(([level, count]) => (
                  <div key={level} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${riskColor(level)}`}></span>
                      <span className="text-sm text-slate-300">{level}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${riskBarColor(level)}`}
                          style={{ width: `${Math.min(100, (count / Math.max(1, report.workforce.total_workers)) * 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-bold text-white w-8 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Incident Summary */}
            <div className="bg-slate-900/80 rounded-2xl border border-slate-800/80 p-5">
              <h3 className="text-sm font-bold text-slate-300 mb-4">Incident Summary</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-slate-950/50 rounded-xl">
                  <div className="text-2xl font-black text-white">{report.incidents.total}</div>
                  <div className="text-xs text-slate-400 mt-1">Total Incidents</div>
                </div>
                <div className="text-center p-3 bg-slate-950/50 rounded-xl">
                  <div className="text-2xl font-black text-emerald-400">{report.incidents.resolved}</div>
                  <div className="text-xs text-slate-400 mt-1">Resolved</div>
                </div>
                <div className="text-center p-3 bg-slate-950/50 rounded-xl">
                  <div className="text-2xl font-black text-red-400">{report.incidents.by_severity.CRITICAL || 0}</div>
                  <div className="text-xs text-slate-400 mt-1">Critical</div>
                </div>
                <div className="text-center p-3 bg-slate-950/50 rounded-xl">
                  <div className="text-2xl font-black text-orange-400">{report.incidents.by_severity.HIGH || 0}</div>
                  <div className="text-xs text-slate-400 mt-1">High</div>
                </div>
              </div>

              {/* Data Source */}
              <div className="mt-4 pt-4 border-t border-slate-800/80">
                <div className="text-xs text-slate-400 mb-2">Environmental Data Source</div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 rounded-md text-[11px] font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30">
                    FortyGuard Live: {report.environmental.data_source.fortyguard_live}
                  </span>
                  <span className="px-2 py-1 rounded-md text-[11px] font-bold bg-slate-700/50 text-slate-300">
                    Simulation: {report.environmental.data_source.simulation}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Interventions Detail Table */}
          <div className="bg-slate-900/80 rounded-2xl border border-slate-800/80 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-300">Intervention Actions ({report.actions_detail.length})</h3>
              <div className="flex gap-2">
                {Object.entries(report.interventions.by_type).map(([type, count]) => (
                  <span key={type} className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-800 text-slate-300">
                    {type}: {count}
                  </span>
                ))}
              </div>
            </div>

            {report.actions_detail.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-400 border-b border-slate-800/80">
                      <th className="pb-2 pr-4">Action ID</th>
                      <th className="pb-2 pr-4">Worker</th>
                      <th className="pb-2 pr-4">Type</th>
                      <th className="pb-2 pr-4">Issued</th>
                      <th className="pb-2 pr-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.actions_detail.map((a) => (
                      <tr key={a.action_id} className="border-b border-slate-800/40 hover:bg-slate-800/30 transition">
                        <td className="py-2 pr-4 font-mono text-xs text-slate-300">{a.action_id.substring(0, 16)}…</td>
                        <td className="py-2 pr-4 text-white font-semibold">{a.worker_id}</td>
                        <td className="py-2 pr-4 text-slate-300">{a.type}</td>
                        <td className="py-2 pr-4 text-xs text-slate-400">{new Date(a.issued_at).toLocaleTimeString()}</td>
                        <td className="py-2 pr-4">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            a.acknowledged_at ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
                          }`}>
                            {a.acknowledged_at ? '✓ Acked' : '⏳ Pending'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-sm text-slate-500 text-center py-8">No interventions recorded for this shift window</div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

/* ─── Helper Components ─── */

const KpiCard: React.FC<{ label: string; value: string | number; icon: string; valueColor?: string }> = ({
  label, value, icon, valueColor = 'text-white',
}) => (
  <div className="bg-slate-900/80 rounded-2xl border border-slate-800/80 p-4 text-center">
    <div className="text-2xl mb-1">{icon}</div>
    <div className={`text-xl font-black ${valueColor}`}>{value}</div>
    <div className="text-xs text-slate-400 mt-1">{label}</div>
  </div>
);

function riskColor(level: string): string {
  const map: Record<string, string> = {
    GREEN: 'bg-emerald-400', WATCH: 'bg-sky-400', ELEVATED: 'bg-amber-400', HIGH: 'bg-orange-500', CRITICAL: 'bg-red-500',
  };
  return map[level] || 'bg-slate-400';
}

function riskBarColor(level: string): string {
  const map: Record<string, string> = {
    GREEN: 'bg-emerald-500', WATCH: 'bg-sky-500', ELEVATED: 'bg-amber-500', HIGH: 'bg-orange-500', CRITICAL: 'bg-red-500',
  };
  return map[level] || 'bg-slate-500';
}
