import React, { useState } from 'react';

export interface DemoStep {
  step: number;
  time: string;
  temp: number;
  title: string;
  description: string;
  expectedOutcome: string;
}

export const DEMO_SCENARIO_STEPS: DemoStep[] = [
  {
    step: 1,
    time: '06:00',
    temp: 31.0,
    title: 'Morning Baseline',
    description: 'Shift start under cool ambient morning conditions.',
    expectedOutcome: 'All 50 workers GREEN, baseline risk scores < 0.20, 0 active incidents.',
  },
  {
    step: 2,
    time: '08:30',
    temp: 35.2,
    title: 'FortyGuard Environmental Intelligence Sync',
    description: 'Hyperlocal microclimate observation ingestion with caching and validation.',
    expectedOutcome: 'Normalized observation stored, data freshness verified FRESH.',
  },
  {
    step: 3,
    time: '10:00',
    temp: 38.5,
    title: 'Microclimate Solar Warming',
    description: 'Open excavation Zone A heats up faster than shaded zones.',
    expectedOutcome: 'Zone A workers transition to WATCH (score 0.35+).',
  },
  {
    step: 4,
    time: '11:00',
    temp: 41.0,
    title: 'Contextual Worker-Risk Elevation',
    description: 'Unacclimatized workers performing HEAVY labor reach ELEVATED risk.',
    expectedOutcome: 'P2 Contextual Engine elevates 8 workers; reason codes assigned.',
  },
  {
    step: 5,
    time: '11:30',
    temp: 42.5,
    title: 'Predictive Short-Horizon Early Warning',
    description: 'Logistic + exponential smoothing detects imminent critical breach.',
    expectedOutcome: 'P3 Predictor flags HIGH/CRITICAL breach in 24m with early warning badge.',
  },
  {
    step: 6,
    time: '11:45',
    temp: 43.2,
    title: 'Autonomous Hydration & Rest Advisory',
    description: 'Policy gate approves autonomous simulated SMS advisory.',
    expectedOutcome: 'Action issued to worker phone, delivery record created, deduplication verified.',
  },
  {
    step: 7,
    time: '11:50',
    temp: 43.5,
    title: 'Worker Simulated SMS Acknowledgement',
    description: 'Worker replies to rest advisory via simulated SMS channel.',
    expectedOutcome: 'Action transitions to ACKNOWLEDGED; audit record generated.',
  },
  {
    step: 8,
    time: '12:30',
    temp: 45.5,
    title: 'Thermal Peak & Multi-Worker Deterioration',
    description: 'Extreme heat conditions across Zone A and Zone C.',
    expectedOutcome: 'Multiple workers reach HIGH & CRITICAL; priority queue reorganizes.',
  },
  {
    step: 9,
    time: '12:35',
    temp: 45.8,
    title: 'Deterministic Incident Cluster Formed',
    description: 'Spatial clustering detects 4 affected workers in Zone A.',
    expectedOutcome: 'Incident INC-001 created; common factors extracted (HIGH_TASK_INTENSITY).',
  },
  {
    step: 10,
    time: '12:45',
    temp: 46.0,
    title: 'Unacknowledged Mandatory Rest Advisory',
    description: 'Critical rest order issued to worker who does not acknowledge within 5m.',
    expectedOutcome: 'Action stays in ACK_PENDING as timer counts down.',
  },
  {
    step: 11,
    time: '12:50',
    temp: 46.0,
    title: 'Supervisor Auto-Escalation',
    description: 'Deadline expiration triggers autonomous escalation protocol.',
    expectedOutcome: 'Escalation ESC-001 opened; audio/visual alert raised in Operations Center.',
  },
  {
    step: 12,
    time: '13:00',
    temp: 45.2,
    title: 'Supervisor Incident Triage & Mitigation',
    description: 'Supervisor assigns owner and triggers mobile AC trailer deployment.',
    expectedOutcome: 'Incident status transitions to MITIGATING; workers directed to cooling points.',
  },
  {
    step: 13,
    time: '13:30',
    temp: 44.0,
    title: 'FortyGuard Sensor Fallback Test',
    description: 'Simulated upstream network anomaly activates local sensor fallback.',
    expectedOutcome: 'System status shows HYBRID FALLBACK; zero pipeline downtime.',
  },
  {
    step: 14,
    time: '14:30',
    temp: 39.0,
    title: 'Thermal Recovery & Incident Resolution',
    description: 'Workers rest in AC trailer; thermal load decreases below threshold.',
    expectedOutcome: 'Workers return to GREEN; supervisor provides resolution justification & closes INC-001.',
  },
];

interface DemoScenarioControllerProps {
  currentStep: number;
  onStepChange: (step: number) => void;
  onRunSimulationStep: () => void;
  onResetSimulation: () => void;
}

export const DemoScenarioController: React.FC<DemoScenarioControllerProps> = ({
  currentStep,
  onStepChange,
  onRunSimulationStep,
  onResetSimulation,
}) => {
  const [autoPlaying, setAutoPlaying] = useState(false);

  const activeStep = DEMO_SCENARIO_STEPS[currentStep - 1] || DEMO_SCENARIO_STEPS[0];

  const handleNext = () => {
    if (currentStep < DEMO_SCENARIO_STEPS.length) {
      onStepChange(currentStep + 1);
      onRunSimulationStep();
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      onStepChange(currentStep - 1);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-base">🎬</span>
          <h2 className="text-sm font-bold text-slate-100">14-Step Magic Demo Scenario Controller</h2>
          <span className="text-xs px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800 font-mono">
            Step {currentStep} of {DEMO_SCENARIO_STEPS.length}
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={onResetSimulation}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition"
          >
            Reset
          </button>
          <button
            onClick={handlePrev}
            disabled={currentStep === 1}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 rounded text-xs transition"
          >
            ← Prev
          </button>
          <button
            onClick={handleNext}
            disabled={currentStep === DEMO_SCENARIO_STEPS.length}
            className="px-3 py-1 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white font-semibold rounded text-xs transition shadow"
          >
            Advance Step →
          </button>
        </div>
      </div>

      {/* Current Step Description Card */}
      <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-100 text-sm">{activeStep.title}</span>
            <span className="text-slate-400 font-mono">({activeStep.time} • {activeStep.temp}°C)</span>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
            Phase Step #{activeStep.step}
          </span>
        </div>
        <p className="text-slate-300 mt-1">{activeStep.description}</p>
        <div className="mt-2 text-[11px] text-sky-300 font-mono bg-sky-950/40 p-1.5 rounded border border-sky-900/60">
          🎯 Expected Outcome: {activeStep.expectedOutcome}
        </div>
      </div>

      {/* Step Progress Dots */}
      <div className="flex items-center justify-between pt-1">
        {DEMO_SCENARIO_STEPS.map((s) => {
          const isPassed = s.step < currentStep;
          const isCurrent = s.step === currentStep;
          return (
            <button
              key={s.step}
              onClick={() => onStepChange(s.step)}
              title={`Step ${s.step}: ${s.title}`}
              className={`w-5 h-5 rounded-full text-[10px] font-mono font-bold flex items-center justify-center transition ${
                isCurrent
                  ? 'bg-sky-500 text-white ring-2 ring-sky-400/50 scale-110'
                  : isPassed
                  ? 'bg-emerald-800 text-emerald-200'
                  : 'bg-slate-800 text-slate-500 hover:bg-slate-700 hover:text-slate-300'
              }`}
            >
              {s.step}
            </button>
          );
        })}
      </div>
    </div>
  );
};
