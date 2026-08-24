import { Worker, WorkerRole, TaskIntensity, RiskModifier, CommunicationChannel } from '@sentinel/schemas';
import { DeterministicPRNG } from './prng.js';
import { PHOENIX_CONSTRUCTION_SITES } from './sites-config.js';

export interface WorkerGenerationOptions {
  count?: number;
  seed?: number;
  sites?: typeof PHOENIX_CONSTRUCTION_SITES;
}

export function generateSyntheticWorkers(options: WorkerGenerationOptions = {}): Worker[] {
  const count = options.count ?? 500;
  const seed = options.seed ?? 42;
  const sites = options.sites ?? PHOENIX_CONSTRUCTION_SITES;
  const prng = new DeterministicPRNG(seed);

  const workers: Worker[] = [];

  const roleDistribution: Array<{ item: WorkerRole; weight: number }> = [
    { item: 'Laborer', weight: 50 },
    { item: 'Carpenter', weight: 20 },
    { item: 'Electrician', weight: 15 },
    { item: 'Welder', weight: 10 },
    { item: 'Supervisor', weight: 5 },
  ];

  const intensityByRole: Record<WorkerRole, Array<{ item: TaskIntensity; weight: number }>> = {
    Laborer: [
      { item: 'HEAVY', weight: 70 },
      { item: 'MODERATE', weight: 25 },
      { item: 'LIGHT', weight: 5 },
    ],
    Carpenter: [
      { item: 'HEAVY', weight: 40 },
      { item: 'MODERATE', weight: 50 },
      { item: 'LIGHT', weight: 10 },
    ],
    Electrician: [
      { item: 'HEAVY', weight: 20 },
      { item: 'MODERATE', weight: 60 },
      { item: 'LIGHT', weight: 20 },
    ],
    Welder: [
      { item: 'HEAVY', weight: 60 },
      { item: 'MODERATE', weight: 35 },
      { item: 'LIGHT', weight: 5 },
    ],
    Supervisor: [
      { item: 'HEAVY', weight: 5 },
      { item: 'MODERATE', weight: 35 },
      { item: 'LIGHT', weight: 60 },
    ],
  };

  const riskModifierDistribution: Array<{ item: RiskModifier; weight: number }> = [
    { item: 'baseline', weight: 80 },
    { item: 'elevated', weight: 15 },
    { item: 'acclimatizing', weight: 5 },
  ];

  const channelDistribution: Array<{ item: CommunicationChannel; weight: number }> = [
    { item: 'SMS_SIMULATED', weight: 85 },
    { item: 'CONSOLE', weight: 10 },
    { item: 'RADIO_SIMULATED', weight: 5 },
  ];

  const shifts: Array<{ item: { start: string; end: string }; weight: number }> = [
    { item: { start: '06:00', end: '14:30' }, weight: 60 },
    { item: { start: '07:00', end: '15:30' }, weight: 30 },
    { item: { start: '09:00', end: '17:30' }, weight: 10 },
  ];

  for (let i = 1; i <= count; i++) {
    const workerId = `WRK-${String(i).padStart(4, '0')}`;
    const site = prng.pick(sites);
    const role = prng.pickWeighted(roleDistribution);
    const intensity = prng.pickWeighted(intensityByRole[role]);
    const riskModifier = prng.pickWeighted(riskModifierDistribution);
    const channel = prng.pickWeighted(channelDistribution);
    const shift = prng.pickWeighted(shifts);

    workers.push({
      worker_id: workerId,
      site_id: site.site_id,
      role,
      shift_start: shift.start,
      shift_end: shift.end,
      task_intensity: intensity,
      channel,
      consent_flags: {
        data_processing: true,
        notification_consent: true,
      },
      risk_modifier: riskModifier,
    });
  }

  return workers;
}
