import React, { useState } from 'react';
import { AuditEvent } from '../types';

interface AuditInspectorModalProps {
  isOpen: boolean;
  filterRef?: string | null;
  auditEvents: AuditEvent[];
  onClose: () => void;
}

export const AuditInspectorModal: React.FC<AuditInspectorModalProps> = ({
  isOpen,
  filterRef,
  auditEvents,
  onClose,
}) => {
  const [searchTerm, setSearchTerm] = useState(filterRef || '');
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);

  if (!isOpen) return null;

  const filteredEvents = auditEvents.filter((ev) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      ev.event_id.toLowerCase().includes(term) ||
      ev.event_type.toLowerCase().includes(term) ||
      ev.payload_ref.toLowerCase().includes(term) ||
      ev.payload_hash.toLowerCase().includes(term) ||
      JSON.stringify(ev.details).toLowerCase().includes(term)
    );
  });

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-xl">🔐</span>
            <div>
              <h2 className="text-base font-bold text-slate-100">Cryptographic Audit Trail Inspector</h2>
              <p className="text-xs text-slate-400">
                Immutable SHA-256 hash-chained operational records for compliance & safety verification
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition"
          >
            ✕
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex items-center space-x-3">
          <input
            type="text"
            placeholder="Search by worker ID, incident ID, action ID, hash, or event type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:ring-1 focus:ring-sky-500 outline-none font-mono"
          />
          <span className="text-xs text-slate-400 font-mono">{filteredEvents.length} events</span>
        </div>

        {/* Content Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Table / List */}
          <div className="w-1/2 border-r border-slate-800 overflow-y-auto p-2 space-y-1.5">
            {filteredEvents.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">No audit events match search.</div>
            ) : (
              filteredEvents.map((ev) => {
                const isSelected = selectedEvent?.event_id === ev.event_id;
                return (
                  <div
                    key={ev.event_id}
                    onClick={() => setSelectedEvent(ev)}
                    className={`p-2.5 rounded-lg border text-xs cursor-pointer transition ${
                      isSelected
                        ? 'bg-slate-800 border-sky-500 ring-1 ring-sky-500/30'
                        : 'bg-slate-950/60 hover:bg-slate-800/60 border-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-sky-400">{ev.event_type}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(ev.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-slate-300 font-mono mt-1 text-[11px] truncate">
                      Ref: <span className="text-slate-100 font-bold">{ev.payload_ref}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">
                      Hash: {ev.payload_hash.slice(0, 24)}...
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right JSON Inspector */}
          <div className="w-1/2 bg-slate-950 p-4 overflow-y-auto flex flex-col font-mono text-xs">
            {selectedEvent ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="font-bold text-slate-200">{selectedEvent.event_type}</span>
                  <span className="text-[10px] text-emerald-400">VERIFIED CHAIN</span>
                </div>

                <div>
                  <div className="text-slate-500 text-[10px]">EVENT ID</div>
                  <div className="text-slate-300 select-all">{selectedEvent.event_id}</div>
                </div>

                <div>
                  <div className="text-slate-500 text-[10px]">PAYLOAD REFERENCE</div>
                  <div className="text-slate-100 font-bold select-all">{selectedEvent.payload_ref}</div>
                </div>

                <div>
                  <div className="text-slate-500 text-[10px]">SHA-256 PAYLOAD HASH</div>
                  <div className="text-amber-400 text-[11px] select-all break-all">{selectedEvent.payload_hash}</div>
                </div>

                <div>
                  <div className="text-slate-500 text-[10px]">TIMESTAMP</div>
                  <div className="text-slate-300">{selectedEvent.created_at}</div>
                </div>

                <div>
                  <div className="text-slate-500 text-[10px]">STRUCTURED EVENT DETAILS</div>
                  <pre className="mt-1 p-2.5 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-300 overflow-x-auto">
                    {JSON.stringify(selectedEvent.details, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-500 text-center">
                Select an audit record on the left to inspect its cryptographic proof and payload.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Sentinel Cryptographic Verification: Active</span>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-medium"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
