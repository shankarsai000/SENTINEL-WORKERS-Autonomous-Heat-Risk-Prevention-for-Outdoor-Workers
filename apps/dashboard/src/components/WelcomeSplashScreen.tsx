import React, { useState, useEffect } from 'react';
import { ShieldCheck, Activity, Thermometer, Droplets, Zap, ChevronRight, Lock } from 'lucide-react';

interface WelcomeSplashScreenProps {
  onEnter: () => void;
  siteName?: string;
}

export const WelcomeSplashScreen: React.FC<WelcomeSplashScreenProps> = ({
  onEnter,
  siteName = 'Phoenix Sky Harbor Site #01',
}) => {
  const [countdown, setCountdown] = useState<number>(4);
  const [autoEnterActive, setAutoEnterActive] = useState<boolean>(true);
  const [stepIndex, setStepIndex] = useState<number>(0);

  const checklist = [
    { label: 'Ingesting FortyGuard Hyperlocal Thermal API...', status: '35.0°C Ambient Stream Verified', icon: '⚡' },
    { label: 'Initializing 113 Worker Biometric Mesh Telemetry...', status: 'All Physiological Streams Nominal', icon: '👷' },
    { label: 'Calibrating ACGIH Hydration & Task AI Schedules...', status: '0 Projected Heat Incidents', icon: '💧' },
    { label: 'Locking Tamper-Evident SHA-256 Cryptographic Ledger...', status: 'Enterprise Compliance Active', icon: '🔒' },
  ];

  // Step ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setStepIndex((prev) => (prev < checklist.length ? prev + 1 : prev));
    }, 600);
    return () => clearInterval(timer);
  }, []);

  // Countdown timer
  useEffect(() => {
    if (!autoEnterActive) return;
    if (countdown <= 0) {
      onEnter();
      return;
    }
    const timer = setInterval(() => {
      setCountdown((c) => c - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown, autoEnterActive, onEnter]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex items-center justify-center p-4 sm:p-6 overflow-hidden select-none">
      {/* Background Animated Ambient Radiant Gradients */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-sky-500/20 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[160px] pointer-events-none"></div>

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none"></div>

      {/* Center Welcome Card */}
      <div className="relative z-10 max-w-2xl w-full bg-slate-900/90 border border-slate-800/90 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl space-y-8 animate-welcome-scale">
        {/* Brand & Pill Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-sky-500/30 border border-sky-300/30">
              S
            </div>
            <div>
              <div className="text-xl font-black tracking-wider text-white">
                SENTINEL WORKERS
              </div>
              <div className="text-xs font-semibold text-sky-400 flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                Autonomous Heat-Risk Defense System
              </div>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/80 border border-slate-800 text-xs font-mono text-slate-300 self-start sm:self-auto">
            <span>📍 {siteName}</span>
          </div>
        </div>

        {/* Impactful Headline Callout */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-400 text-xs font-bold uppercase tracking-wider">
            <span>🛡️</span>
            <span>Protecting Every Life Under the Sun</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
            Autonomous Real-Time Heat-Risk Prevention & Microclimate Intelligence Safeguarding Outdoor Workforce.
          </h1>

          <p className="text-sm text-slate-300 leading-relaxed">
            Welcome to the Sentinel Command Center. Hyperlocal thermal ingestion from FortyGuard API, continuous physiological strain modeling, predictive scheduling, and automated cooling dispatch are active to eliminate heat stroke risk before symptoms emerge.
          </p>
        </div>

        {/* Initialization Checklist Animation */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 sm:p-5 space-y-2.5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            System Initialization Matrix
          </div>
          {checklist.map((item, idx) => {
            const isDone = idx < stepIndex;
            const isCurrent = idx === stepIndex;
            return (
              <div
                key={idx}
                className={`flex items-center justify-between text-xs py-1.5 px-2.5 rounded-xl transition-all ${
                  isDone
                    ? 'bg-emerald-500/10 text-emerald-300'
                    : isCurrent
                    ? 'bg-sky-500/15 text-sky-300 animate-pulse'
                    : 'text-slate-500 opacity-60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-sm">{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </div>
                <span className="font-mono text-[11px] font-semibold">
                  {isDone ? '✓ ' + item.status : isCurrent ? 'Calibrating...' : 'Standby'}
                </span>
              </div>
            );
          })}
        </div>

        {/* Action Button & Auto-Enter Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-slate-800/80">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            {autoEnterActive ? (
              <>
                <span>Auto-entering command center in <strong className="text-white font-mono">{countdown}s</strong>...</span>
                <button
                  onClick={() => setAutoEnterActive(false)}
                  className="text-sky-400 hover:text-sky-300 underline font-semibold cursor-pointer"
                >
                  Pause
                </button>
              </>
            ) : (
              <>
                <span>Auto-enter paused.</span>
                <button
                  onClick={() => {
                    setCountdown(4);
                    setAutoEnterActive(true);
                  }}
                  className="text-sky-400 hover:text-sky-300 underline font-semibold cursor-pointer"
                >
                  Resume
                </button>
              </>
            )}
          </div>

          <button
            id="enter-command-center-btn"
            onClick={onEnter}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-black text-sm shadow-xl shadow-sky-500/30 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2 cursor-pointer ring-1 ring-white/20"
          >
            <span>ENTER COMMAND CENTER</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
