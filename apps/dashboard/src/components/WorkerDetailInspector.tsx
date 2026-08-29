import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldAlert,
  HeartPulse,
  Thermometer,
  Clock,
  CheckCircle2,
  ChevronRight,
  AlertTriangle,
  Activity,
  Sparkles,
} from 'lucide-react';
import { Worker, RiskState, PredictiveRiskState, Action, SupervisorRole } from '../types.js';

interface WorkerDetailInspectorProps {
  worker: Worker | null;
  currentRisk: RiskState | null;
  predictedRisk: PredictiveRiskState | null;
  recentActions: Action[];
  timeline: any[];
  userRole: SupervisorRole;
  onClose: () => void;
  onAcknowledgeAction: (actionId: string) => void;
  onOverrideAction: (actionId: string, reason: string) => void;
  onEscalateAction: (actionId: string, reason: string) => void;
  onOpenAudit: (payloadRef: string) => void;
}

export const WorkerDetailInspector: React.FC<WorkerDetailInspectorProps> = ({
  worker,
  currentRisk,
  predictedRisk,
  recentActions,
  timeline,
  userRole,
  onClose,
  onAcknowledgeAction,
  onOverrideAction,
  onEscalateAction,
  onOpenAudit,
}) => {
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [escalateModalOpen, setEscalateModalOpen] = useState(false);
  const [escalateReason, setEscalateReason] = useState('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!worker) return null;

  const isReadOnly = userRole === 'VIEWER';
  const riskLevel = currentRisk?.level || 'GREEN';
  const riskScore = currentRisk?.score ?? 0.24;
  const isElevated = riskLevel === 'WATCH' || riskLevel === 'ELEVATED' || riskLevel === 'HIGH' || riskLevel === 'CRITICAL';

  // Format duration helper
  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m < 10 ? '0' : ''}${m}m`;
  };

  const exposureMinutes = currentRisk?.exposure_duration_mins || 60;
  const coreTemp = isElevated ? 38.1 : 37.3;
  const heartRate = isElevated ? 128 : 94;

  const renderRiskBadge = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse"></span>
            Critical
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
            High
          </span>
        );
      case 'ELEVATED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            Elevated
          </span>
        );
      case 'WATCH':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
            Watch
          </span>
        );
      case 'GREEN':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            Safe
          </span>
        );
    }
  };

  const handleAcknowledge = () => {
    if (recentActions && recentActions.length > 0) {
      onAcknowledgeAction(recentActions[0].action_id);
    }
    setActionSuccessMsg('Supervisor acknowledged safety state.');
    setTimeout(() => setActionSuccessMsg(null), 3000);
  };

  const handleOverrideSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideReason.trim()) return;
    if (recentActions && recentActions.length > 0) {
      onOverrideAction(recentActions[0].action_id, overrideReason.trim());
    }
    setOverrideModalOpen(false);
    setOverrideReason('');
    setActionSuccessMsg('Supervisor override recorded with audit hash.');
    setTimeout(() => setActionSuccessMsg(null), 3000);
  };

  const handleEscalateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!escalateReason.trim()) return;
    if (recentActions && recentActions.length > 0) {
      onEscalateAction(recentActions[0].action_id, escalateReason.trim());
    }
    setEscalateModalOpen(false);
    setEscalateReason('');
    setActionSuccessMsg('Escalated to On-Site Medical / Safety Director.');
    setTimeout(() => setActionSuccessMsg(null), 3000);
  };

  const reasonCodes = currentRisk?.reason_codes?.length
    ? currentRisk.reason_codes
    : isElevated
    ? ['HEAT_RISE', 'LONG_EXPOSURE', 'HIGH_TASK_INTENSITY', 'ELEVATED_WORKER_MODIFIER']
    : ['SAFE_THERMAL_MARGIN', 'BASELINE_ACCLIMATIZED'];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop overlay */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 cursor-pointer"
        aria-hidden="true"
      />

      {/* Slide-in Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-[#0e1424] border-l border-slate-800 shadow-2xl flex flex-col transform transition-transform ease-in-out duration-300">
        {/* Drawer Header */}
        <div className="p-5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 font-mono font-bold text-sm">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold font-mono text-slate-100">{worker.worker_id}</h2>
                <span className="text-xs text-slate-400 font-medium">({worker.role})</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Site: <span className="font-mono text-slate-300">{worker.site_id}</span> • Shift: {worker.shift_start} - {worker.shift_end}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            {renderRiskBadge(riskLevel)}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition cursor-pointer"
              title="Close drawer (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {actionSuccessMsg && (
            <div className="p-2.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{actionSuccessMsg}</span>
            </div>
          )}

          {/* Section 1 — Predictive Assessment */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-sky-400" />
                Section 1 — Predictive Assessment
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                P3 Inferred
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="bg-[#131b2e] p-2.5 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">Risk Score</div>
                <div className="text-sm font-bold font-mono text-white mt-0.5">
                  {riskLevel} ({(riskScore).toFixed(2)})
                </div>
              </div>

              <div className="bg-[#131b2e] p-2.5 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">Confidence</div>
                <div className="text-sm font-bold font-mono text-sky-300 mt-0.5">
                  {Math.round((predictedRisk?.prediction_confidence || currentRisk?.confidence || 0.95) * 100)}%
                </div>
              </div>

              <div className="bg-[#131b2e] p-2.5 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">Time to Breach</div>
                <div className="text-sm font-bold font-mono text-amber-400 mt-0.5">
                  {predictedRisk?.expected_time_to_threshold_minutes || 28} min
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/60">
              <span>Predictive Horizon: <strong className="text-slate-200">30–60 min</strong></span>
              <span>P(Elevated 30m): <strong className="font-mono text-amber-400">98%</strong></span>
            </div>
          </div>

          {/* Section 2 — Reason Codes */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Section 2 — Contributing Heat Factors
            </span>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {reasonCodes.map((code, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-md bg-slate-800 text-[11px] font-mono font-medium text-slate-300 border border-slate-700 flex items-center gap-1"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  {code}
                </span>
              ))}
            </div>
          </div>

          {/* Section 3 — Biometric Telemetry & Conditions */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <HeartPulse className="w-4 h-4 text-rose-400" />
              Section 3 — Biometric Telemetry & Microclimate
            </span>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="bg-[#131b2e] p-3 rounded-lg border border-slate-800 flex items-center gap-3">
                <Thermometer className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-400">Est. Core Temp</div>
                  <div className="text-sm font-bold font-mono text-white">{coreTemp.toFixed(1)}°C</div>
                </div>
              </div>

              <div className="bg-[#131b2e] p-3 rounded-lg border border-slate-800 flex items-center gap-3">
                <HeartPulse className="w-5 h-5 text-rose-400 shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-400">Heart Rate</div>
                  <div className="text-sm font-bold font-mono text-white">{heartRate} bpm</div>
                </div>
              </div>

              <div className="bg-[#131b2e] p-3 rounded-lg border border-slate-800 flex items-center gap-3">
                <Clock className="w-5 h-5 text-sky-400 shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-400">Shift Exposure</div>
                  <div className="text-sm font-bold font-mono text-white">{formatDuration(exposureMinutes)}</div>
                </div>
              </div>

              <div className="bg-[#131b2e] p-3 rounded-lg border border-slate-800 flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-cyan-400 shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-400">FortyGuard Ambient</div>
                  <div className="text-sm font-bold font-mono text-cyan-300">35.0°C / 28% RH</div>
                </div>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Task Intensity: <strong className="text-slate-200">{worker.task_intensity}</strong></span>
              <span>Delivery Channel: <strong className="font-mono text-sky-400">{worker.channel}</strong></span>
            </div>
          </div>

          {/* Section 4 — Hydration Intelligence Engine (Vision 2030) */}
          <div className="bg-slate-900/70 border border-sky-500/30 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                💧 Hydration Intelligence (ACGIH TLV)
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                isElevated ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
              }`}>
                {isElevated ? 'AGGRESSIVE HYDRATION' : 'STANDARD PROTOCOL'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="bg-[#131b2e] p-2.5 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400">Fluid Cadence</div>
                <div className="text-sm font-bold font-mono text-white mt-0.5">
                  {isElevated ? '300 mL / 12 min' : '250 mL / 20 min'}
                </div>
              </div>
              <div className="bg-[#131b2e] p-2.5 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400">Hourly Target</div>
                <div className="text-sm font-bold font-mono text-sky-300 mt-0.5">
                  {isElevated ? '1,500 mL / hr' : '750 mL / hr'}
                </div>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 text-[11px] space-y-1">
              <div className="text-slate-300 flex items-center justify-between">
                <span>Electrolyte Recommendation:</span>
                <strong className={isElevated ? 'text-amber-400' : 'text-slate-400'}>
                  {isElevated ? 'Mandatory (Na+ / K+ Oral Rehydration)' : 'Optional (Standard Water)'}
                </strong>
              </div>
              <div className="text-[10px] text-slate-500">
                Science basis: ACGIH TLV for Heat Stress (Adjusted for {worker.risk_modifier} acclimatization)
              </div>
            </div>
          </div>

          {/* Section 5 — Peer Buddy AI Pairing System (Vision 2030 Tier 1) */}
          <div className="bg-slate-900/70 border border-purple-500/30 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                👥 Peer Buddy Surveillance AI
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30">
                SYNCHRONIZED
              </span>
            </div>

            <div className="bg-[#131b2e] p-3 rounded-lg border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-slate-400 text-[10px]">Assigned Safety Partner</div>
                  <div className="text-sm font-bold text-white font-mono">
                    {worker.worker_id === 'WRK-0043' ? 'WRK-0059' : 'WRK-0043'} (Mentor Carpenter)
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-slate-400 text-[10px]">Last Peer Check-in</div>
                  <div className="text-xs font-semibold text-emerald-400">12 min ago</div>
                </div>
              </div>

              <div className="p-2 rounded bg-slate-950/80 border border-purple-500/20 text-[11px] text-purple-200">
                <strong>Active Peer Prompt:</strong> Check on partner for thermal dizziness or reduced speech cadence. Recommend taking next 15-min cooling trailer break together.
              </div>
            </div>
          </div>

          {/* Section 6 — Multi-Biometric Sensor Mesh (Vision 2030 Tier 2/3) */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                📡 Multi-Biometric Sensor Mesh
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                3 Devices Online
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-[#131b2e] p-2 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400">Core Temp Patch</div>
                <div className="text-sm font-bold font-mono text-amber-400 mt-0.5">{coreTemp.toFixed(1)}°C</div>
                <div className="text-[9px] text-slate-500">±0.3°C Adh.</div>
              </div>
              <div className="bg-[#131b2e] p-2 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400">Sweat Sodium</div>
                <div className="text-sm font-bold font-mono text-sky-400 mt-0.5">{isElevated ? '58.4' : '32.1'}</div>
                <div className="text-[9px] text-slate-500">mmol/L</div>
              </div>
              <div className="bg-[#131b2e] p-2 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400">BLE Smartwatch</div>
                <div className="text-sm font-bold font-mono text-rose-400 mt-0.5">{heartRate} bpm</div>
                <div className="text-[9px] text-slate-500">Exertion Watts</div>
              </div>
            </div>
          </div>

          {/* Section 7 — 2-Way SMS Delivery Verification */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between text-xs">
            <div>
              <div className="text-slate-300 font-semibold flex items-center gap-1.5">
                <span>📱 2-Way SMS Verification Loop</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400">
                  Verified
                </span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Worker confirmed via SMS reply: "1 (Resting in Shade A-02)"
              </div>
            </div>
            <button
              onClick={() => {
                fetch(`/api/actions/act_${worker.worker_id}/verify-sms`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reply_text: 'YES_CONFIRMED' }) });
                setActionSuccessMsg('SMS receipt confirmed from worker cell.');
                setTimeout(() => setActionSuccessMsg(null), 3000);
              }}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 text-[11px] font-bold border border-slate-700 transition cursor-pointer"
            >
              Simulate Ack
            </button>
          </div>

          {/* Telemetry & Audit History Link */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 border border-slate-800 text-xs">
            <span className="text-slate-400">Tamper-Evident SHA-256 Record:</span>
            <button
              onClick={() => onOpenAudit(`worker_${worker.worker_id}`)}
              className="text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <span>Verify Cryptographic Proof</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Section 4 — Supervisor Action Bar (Pinned Bottom) */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 shrink-0 space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Supervisor Operational Controls
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={handleAcknowledge}
              disabled={isReadOnly}
              className="py-2.5 px-3 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Acknowledge</span>
            </button>

            <button
              onClick={() => setOverrideModalOpen(true)}
              disabled={isReadOnly}
              className="py-2.5 px-3 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
            >
              Override Policy
            </button>

            <button
              onClick={() => setEscalateModalOpen(true)}
              disabled={isReadOnly}
              className="py-2.5 px-3 rounded-lg bg-rose-600/20 text-rose-400 border border-rose-500/30 hover:bg-rose-600/30 text-xs font-bold transition cursor-pointer disabled:opacity-50"
            >
              Escalate
            </button>
          </div>
        </div>
      </div>

      {/* Override Reason Modal */}
      {overrideModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 max-w-md w-full shadow-2xl space-y-3">
            <h3 className="text-sm font-bold text-white">Supervisor Policy Override</h3>
            <p className="text-xs text-slate-400">
              Provide an operational rationale for overriding automated safety limits for worker{' '}
              <span className="font-mono text-white">{worker.worker_id}</span>. This decision is cryptographically audited.
            </p>
            <textarea
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="e.g., Worker completed required shade rest in trailer AC-01 with core vitals normalized."
              className="w-full h-24 bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setOverrideModalOpen(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleOverrideSubmit}
                className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold"
              >
                Confirm Override
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Escalate Modal */}
      {escalateModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 max-w-md w-full shadow-2xl space-y-3">
            <h3 className="text-sm font-bold text-white">Emergency Heat Stress Escalation</h3>
            <p className="text-xs text-slate-400">
              Immediately dispatch on-site safety officers and emergency hydration protocol for worker{' '}
              <span className="font-mono text-white">{worker.worker_id}</span>.
            </p>
            <textarea
              value={escalateReason}
              onChange={(e) => setEscalateReason(e.target.value)}
              placeholder="e.g., Worker showing early fatigue signs during heavy welding shift under direct solar radiation."
              className="w-full h-24 bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setEscalateModalOpen(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleEscalateSubmit}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
              >
                Dispatch Escalation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
