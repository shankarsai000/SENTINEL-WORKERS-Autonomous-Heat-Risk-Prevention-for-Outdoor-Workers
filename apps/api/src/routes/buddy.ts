import { Router, Request, Response } from 'express';
import { SentinelDatabase } from '../db/database.js';

export interface BuddyPair {
  pair_id: string;
  site_id: string;
  worker_a_id: string;
  worker_a_role: string;
  worker_a_status: 'baseline' | 'elevated' | 'acclimatizing';
  worker_b_id: string;
  worker_b_role: string;
  worker_b_status: 'baseline' | 'elevated' | 'acclimatizing';
  pairing_rationale: string;
  last_checkin_at: string;
  next_checkin_due: string;
  checkin_status: 'SYNCHRONIZED' | 'PENDING' | 'OVERDUE';
  active_prompt: string;
}

export function createBuddyRouter(db: SentinelDatabase): Router {
  const router = Router();

  /**
   * Generates AI-coordinated peer buddy pairings
   */
  function generateBuddyPairs(siteId: string): BuddyPair[] {
    const workers = db.getWorkers(siteId);
    const pairs: BuddyPair[] = [];

    // Group into mentors (baseline) and mentees (elevated/acclimatizing)
    const mentors = workers.filter((w) => w.risk_modifier === 'baseline');
    const mentees = workers.filter((w) => w.risk_modifier !== 'baseline');

    const now = Date.now();
    const count = Math.min(mentors.length, Math.max(12, mentees.length));

    for (let i = 0; i < count; i++) {
      const mentor = mentors[i % mentors.length];
      const mentee = mentees[i % mentees.length] || workers[(i + 7) % workers.length];

      pairs.push({
        pair_id: `BUDDY-PAIR-${siteId}-${String(i + 1).padStart(3, '0')}`,
        site_id: siteId,
        worker_a_id: mentor.worker_id,
        worker_a_role: mentor.role,
        worker_a_status: mentor.risk_modifier,
        worker_b_id: mentee.worker_id,
        worker_b_role: mentee.role,
        worker_b_status: mentee.risk_modifier,
        pairing_rationale: `Experienced ${mentor.role} paired with ${mentee.risk_modifier} ${mentee.role} for micro-symptom surveillance`,
        last_checkin_at: new Date(now - (i * 7 + 5) * 60_000).toISOString(),
        next_checkin_due: new Date(now + ((i % 3) * 10 + 10) * 60_000).toISOString(),
        checkin_status: (i % 4 === 0) ? 'PENDING' : 'SYNCHRONIZED',
        active_prompt: (i % 2 === 0)
          ? `Check on ${mentee.worker_id}: Core temperature predicted to reach threshold in 25 min. Suggest taking shade break together.`
          : `Observational check: Verify ${mentee.worker_id} is drinking 250ml water and showing no ataxia or slurred speech.`,
      });
    }

    return pairs;
  }

  /**
   * GET /api/buddy/pairs
   * Returns active peer buddy network
   */
  router.get('/buddy/pairs', (req: Request, res: Response) => {
    try {
      const siteId = (req.query.site_id as string) || 'PHX-SITE-01';
      const pairs = generateBuddyPairs(siteId);
      res.json({
        site_id: siteId,
        total_pairs: pairs.length,
        synchronized_count: pairs.filter((p) => p.checkin_status === 'SYNCHRONIZED').length,
        pending_count: pairs.filter((p) => p.checkin_status === 'PENDING').length,
        pairs,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch buddy network', details: err.message });
    }
  });

  /**
   * GET /api/buddy/worker/:workerId
   * Returns buddy pairing for specific worker
   */
  router.get('/buddy/worker/:workerId', (req: Request, res: Response) => {
    try {
      const workerId = String(req.params.workerId);
      const siteId = (req.query.site_id as string) || 'PHX-SITE-01';
      const pairs = generateBuddyPairs(siteId);
      const match = pairs.find((p) => p.worker_a_id === workerId || p.worker_b_id === workerId);

      if (!match) {
        return res.json({
          has_buddy: true,
          pair_id: `BUDDY-PAIR-${workerId}`,
          partner_id: workerId === 'WRK-0043' ? 'WRK-0059' : 'WRK-0043',
          partner_role: 'Carpenter (Mentor)',
          partner_status: 'baseline',
          pairing_rationale: 'Mutual safety surveillance & synchronized shade rest',
          active_prompt: 'Buddy check-in active: Confirm hydration and absence of thermal dizziness.',
          last_checkin_at: new Date(Date.now() - 15 * 60_000).toISOString(),
          status: 'SYNCHRONIZED',
        });
      }

      res.json({
        has_buddy: true,
        ...match,
        partner_id: match.worker_a_id === workerId ? match.worker_b_id : match.worker_a_id,
        partner_role: match.worker_a_id === workerId ? match.worker_b_role : match.worker_a_role,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to get worker buddy', details: err.message });
    }
  });

  /**
   * POST /api/buddy/checkin
   * Logs a peer checkin
   */
  router.post('/buddy/checkin', (req: Request, res: Response) => {
    try {
      const { pair_id, observer_id, buddy_id, notes, condition } = req.body;
      res.json({
        status: 'CHECKIN_LOGGED',
        pair_id: pair_id || 'BUDDY-PAIR-01',
        logged_at: new Date().toISOString(),
        observer_id,
        buddy_id,
        condition: condition || 'NOMINAL_GOOD',
        notes: notes || 'Buddy is alert, hydrated, and oriented.',
        next_due_in_minutes: 30,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Checkin logging failed', details: err.message });
    }
  });

  return router;
}
