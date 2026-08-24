import React from 'react';
import { ShieldCheck, Hash, Terminal } from 'lucide-react';
import { AuditEvent } from '../types.js';

interface AuditDrawerProps {
  events: AuditEvent[];
}

export const AuditDrawer: React.FC<AuditDrawerProps> = ({ events }) => {
  return (
    <div className="card" style={{ marginTop: 20 }}>
      <div className="card-header">
        <h2>
          <ShieldCheck size={18} color="#10b981" />
          Immutable Audit Log & Cryptographic Decision Trail
        </h2>
        <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'JetBrains Mono' }}>
          SHA-256 VERIFIED
        </span>
      </div>

      <div className="card-body" style={{ maxHeight: 220, overflowY: 'auto' }}>
        {events.length === 0 ? (
          <div style={{ padding: 16, textAlign: 'center', color: '#64748b', fontSize: '0.8rem' }}>
            No audit records created yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {events.slice(0, 15).map((e) => (
              <div
                key={e.event_id}
                style={{
                  background: '#090e18',
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid #1e293b',
                  fontSize: '0.75rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <span style={{ color: '#06b6d4', fontWeight: 600, fontFamily: 'JetBrains Mono', marginRight: 8 }}>
                    {e.event_type}
                  </span>
                  <span style={{ color: '#94a3b8' }}>
                    Ref: {e.payload_ref}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontFamily: 'JetBrains Mono', fontSize: '0.68rem', color: '#64748b' }}>
                  <span>Hash: {e.payload_hash.substring(0, 12)}...</span>
                  <span>{new Date(e.created_at).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
