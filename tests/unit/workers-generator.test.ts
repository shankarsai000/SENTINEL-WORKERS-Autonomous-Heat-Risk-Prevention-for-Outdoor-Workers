import { describe, it, expect } from 'vitest';
import { generateSyntheticWorkers } from '../../packages/simulation/src/worker-generator.js';
import { WorkerSchema } from '../../packages/schemas/src/validators.js';

describe('Synthetic Workers Determinism & Compliance', () => {
  it('generates exactly 500 synthetic workers by default', () => {
    const workers = generateSyntheticWorkers();
    expect(workers).toHaveLength(500);
  });

  it('produces 100% deterministic output for the same seed', () => {
    const runA = generateSyntheticWorkers({ seed: 42 });
    const runB = generateSyntheticWorkers({ seed: 42 });
    expect(runA).toEqual(runB);

    // Verify first and last worker IDs
    expect(runA[0].worker_id).toBe('WRK-0001');
    expect(runA[499].worker_id).toBe('WRK-0500');
  });

  it('produces different output for different seeds', () => {
    const runA = generateSyntheticWorkers({ seed: 42 });
    const runB = generateSyntheticWorkers({ seed: 999 });
    expect(runA[0]).not.toEqual(runB[0]);
  });

  it('validates every worker against WorkerSchema', () => {
    const workers = generateSyntheticWorkers({ seed: 42 });
    for (const w of workers) {
      const parsed = WorkerSchema.safeParse(w);
      expect(parsed.success).toBe(true);
    }
  });

  it('distributes roles, task intensities, and abstract risk modifiers safely without PII', () => {
    const workers = generateSyntheticWorkers({ seed: 42 });
    const roles = new Set(workers.map((w) => w.role));
    const intensities = new Set(workers.map((w) => w.task_intensity));
    const modifiers = new Set(workers.map((w) => w.risk_modifier));

    expect(roles).toContain('Laborer');
    expect(roles).toContain('Carpenter');
    expect(roles).toContain('Electrician');
    expect(roles).toContain('Welder');
    expect(roles).toContain('Supervisor');

    expect(intensities).toContain('LIGHT');
    expect(intensities).toContain('MODERATE');
    expect(intensities).toContain('HEAVY');

    expect(modifiers).toContain('baseline');
    expect(modifiers).toContain('elevated');
    expect(modifiers).toContain('acclimatizing');

    // Verify no real health/medical PII fields exist
    for (const w of workers) {
      expect((w as any).medical_history).toBeUndefined();
      expect((w as any).ssn).toBeUndefined();
      expect((w as any).phone_number).toBeUndefined();
      expect((w as any).heart_rate).toBeUndefined();
    }
  });
});
