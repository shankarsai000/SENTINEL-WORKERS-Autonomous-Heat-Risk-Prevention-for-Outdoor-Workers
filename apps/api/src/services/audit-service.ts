import crypto from 'crypto';
import { AuditEvent, DecisionEvent } from '@sentinel/schemas';
import Database from 'better-sqlite3';

export class AuditService {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  public recordAuditEvent(
    eventType: AuditEvent['event_type'],
    payloadRef: string,
    details: Record<string, unknown>
  ): AuditEvent {
    const payloadStr = JSON.stringify(details);
    const payloadHash = crypto.createHash('sha256').update(payloadStr).digest('hex');
    const eventId = `aud_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const createdAt = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO audit_events (event_id, event_type, payload_hash, payload_ref, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(eventId, eventType, payloadHash, payloadRef, payloadStr, createdAt);

    return {
      event_id: eventId,
      event_type: eventType,
      payload_hash: payloadHash,
      payload_ref: payloadRef,
      details,
      created_at: createdAt,
    };
  }

  public recordDecisionEvent(decision: Omit<DecisionEvent, 'event_id' | 'timestamp'>): DecisionEvent {
    const eventId = `dec_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const timestamp = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO decision_events (event_id, actor, input_refs, decision, explanation, policy_version, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      eventId,
      decision.actor,
      JSON.stringify(decision.input_refs),
      decision.decision,
      decision.explanation,
      decision.policy_version,
      timestamp
    );

    // Also record an audit event for this decision
    this.recordAuditEvent('ACTION_ISSUED', eventId, {
      actor: decision.actor,
      decision: decision.decision,
      policy_version: decision.policy_version,
      input_refs: decision.input_refs,
    });

    return {
      event_id: eventId,
      actor: decision.actor,
      input_refs: decision.input_refs,
      decision: decision.decision,
      explanation: decision.explanation,
      policy_version: decision.policy_version,
      timestamp,
    };
  }

  public getRecentAuditEvents(limit: number = 50): AuditEvent[] {
    const stmt = this.db.prepare(`
      SELECT event_id, event_type, payload_hash, payload_ref, details, created_at
      FROM audit_events
      ORDER BY created_at DESC
      LIMIT ?
    `);

    const rows = stmt.all(limit) as Array<{
      event_id: string;
      event_type: AuditEvent['event_type'];
      payload_hash: string;
      payload_ref: string;
      details: string;
      created_at: string;
    }>;

    return rows.map((r) => ({
      ...r,
      details: JSON.parse(r.details),
    }));
  }
}
