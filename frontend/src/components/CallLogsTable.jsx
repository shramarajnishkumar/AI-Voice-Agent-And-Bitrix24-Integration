import React, { useState } from 'react';
import { 
  FileText, Search, RefreshCw, ExternalLink, Trash2, 
  ChevronRight, CheckCircle2, AlertTriangle, User, Building, 
  Phone, Mail, ArrowUpRight, X
} from 'lucide-react';
import ConversationChatView from './ConversationChatView';

export default function CallLogsTable({ calls = [], onRefresh, onResync, onDelete }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCall, setSelectedCall] = useState(null);
  const [resyncingId, setResyncingId] = useState(null);

  const filteredCalls = calls.filter((c) => {
    const s = searchTerm.toLowerCase();
    const phone = (c.caller_phone || '').toLowerCase();
    const sid = (c.session_id || '').toLowerCase();
    const company = (c.extracted_data?.company_name || '').toLowerCase();
    const name = (c.extracted_data?.caller_name || '').toLowerCase();
    return phone.includes(s) || sid.includes(s) || company.includes(s) || name.includes(s);
  });

  const handleResync = async (sessionId) => {
    setResyncingId(sessionId);
    try {
      await onResync(sessionId);
    } finally {
      setResyncingId(null);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '28px', marginBottom: '32px' }}>
      
      {/* Table Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#f8fafc' }}>
            Inbound Call Logs & CRM Records
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
            Real-time telemetry of all incoming calls, conversation transcripts, and Bitrix24 lead push statuses.
          </p>
        </div>

        {/* Search & Refresh Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search by phone, company, or session..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                background: 'rgba(15, 23, 42, 0.7)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '8px 12px 8px 36px',
                color: '#f8fafc',
                fontSize: '0.85rem',
                outline: 'none',
                width: '260px'
              }}
            />
          </div>

          <button
            onClick={onRefresh}
            className="btn-secondary"
            style={{ padding: '8px 14px', fontSize: '0.85rem' }}
            title="Refresh Table"
          >
            <RefreshCw size={15} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', color: '#94a3b8', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <th style={{ padding: '12px 16px' }}>Session / Caller</th>
              <th style={{ padding: '12px 16px' }}>Company & Contact</th>
              <th style={{ padding: '12px 16px' }}>Desired Service</th>
              <th style={{ padding: '12px 16px' }}>Call Status</th>
              <th style={{ padding: '12px 16px' }}>Bitrix24 Lead</th>
              <th style={{ padding: '12px 16px' }}>Created</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCalls.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  No inbound call sessions found. Start a call above or send a Twilio webhook!
                </td>
              </tr>
            ) : (
              filteredCalls.map((call) => {
                const extracted = call.extracted_data || {};
                const isSynced = call.bitrix_status === 'synced';
                const isMock = call.bitrix_status === 'mock_synced';
                const isFailed = call.bitrix_status === 'failed';

                return (
                  <tr
                    key={call.id || call.session_id}
                    onClick={() => setSelectedCall(call)}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    {/* Session / Caller */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: '600', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{call.caller_phone || 'Unknown Phone'}</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: '#64748b' }}>
                        {call.session_id} &bull; {call.source}
                      </div>
                    </td>

                    {/* Company & Contact */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: '600', color: '#e2e8f0' }}>
                        {extracted.company_name || '—'}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                        {extracted.caller_name || 'Anonymous'}
                      </div>
                    </td>

                    {/* Desired Service */}
                    <td style={{ padding: '14px 16px', maxWidth: '200px' }}>
                      <div style={{
                        color: '#cbd5e1',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {extracted.desired_service || 'General Voice Inquiry'}
                      </div>
                    </td>

                    {/* Call Status */}
                    <td style={{ padding: '14px 16px' }}>
                      <span className={`badge ${call.status === 'completed' ? 'badge-green' : call.status === 'in_progress' ? 'badge-blue' : 'badge-amber'}`}>
                        {call.status}
                      </span>
                    </td>

                    {/* Bitrix24 Lead */}
                    <td style={{ padding: '14px 16px' }}>
                      {isSynced ? (
                        <span className="badge badge-green" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle2 size={12} /> #{call.bitrix_lead_id} (Live)
                        </span>
                      ) : isMock ? (
                        <span className="badge badge-purple" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle2 size={12} /> #{call.bitrix_lead_id} (Mock)
                        </span>
                      ) : isFailed ? (
                        <span className="badge badge-red" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <AlertTriangle size={12} /> Failed
                        </span>
                      ) : (
                        <span className="badge badge-amber">Pending</span>
                      )}
                    </td>

                    {/* Created */}
                    <td style={{ padding: '14px 16px', color: '#94a3b8', fontSize: '0.8rem' }}>
                      {call.created_at ? new Date(call.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleResync(call.session_id)}
                          disabled={resyncingId === call.session_id}
                          className="btn-secondary"
                          style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                          title="Resync lead into Bitrix24"
                        >
                          <RefreshCw size={13} className={resyncingId === call.session_id ? 'animate-spin' : ''} />
                          <span>Resync</span>
                        </button>
                        <button
                          onClick={() => setSelectedCall(call)}
                          className="btn-secondary"
                          style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                          title="Inspect Call Details"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Slide-Over Drawer for Call Transcript & Extracted Payload */}
      {selectedCall && (
        <div style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '560px',
          maxWidth: '100vw',
          background: '#0d1322',
          borderLeft: '1px solid var(--border-color)',
          boxShadow: '-10px 0 40px rgba(0,0,0,0.8)',
          zIndex: 999,
          padding: '28px',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto'
        }}>
          {/* Drawer Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
            <div>
              <div style={{ fontSize: '1.15rem', fontWeight: '700', color: '#f8fafc' }}>
                Call Session Intelligence
              </div>
              <div style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', color: '#6366f1' }}>
                {selectedCall.session_id}
              </div>
            </div>
            <button
              onClick={() => setSelectedCall(null)}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
            >
              <X size={22} />
            </button>
          </div>

          {/* Lead Summary Card */}
          <div style={{
            background: 'rgba(30, 41, 59, 0.5)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <div style={{ fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', color: '#38bdf8', marginBottom: '10px' }}>
              Extracted Lead Fields
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.85rem' }}>
              <div>
                <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.75rem' }}>Caller Name:</span>
                <strong style={{ color: '#f8fafc' }}>{selectedCall.extracted_data?.caller_name || 'N/A'}</strong>
              </div>
              <div>
                <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.75rem' }}>Company Name:</span>
                <strong style={{ color: '#f8fafc' }}>{selectedCall.extracted_data?.company_name || 'N/A'}</strong>
              </div>
              <div>
                <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.75rem' }}>Desired Service:</span>
                <strong style={{ color: '#f8fafc' }}>{selectedCall.extracted_data?.desired_service || 'N/A'}</strong>
              </div>
              <div>
                <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.75rem' }}>Contact Channel:</span>
                <strong style={{ color: '#f8fafc' }}>{selectedCall.extracted_data?.contact_channel || 'N/A'}</strong>
              </div>
            </div>

            {selectedCall.extracted_data?.summary && (
              <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-color)', fontSize: '0.8rem', color: '#cbd5e1' }}>
                <span style={{ color: '#94a3b8' }}>Summary: </span>
                {selectedCall.extracted_data.summary}
              </div>
            )}
          </div>

          {/* Bitrix24 Status Section */}
          <div style={{
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', color: '#34d399' }}>
                Bitrix24 CRM Sync
              </div>
              <span className={`badge ${selectedCall.bitrix_status === 'synced' ? 'badge-green' : selectedCall.bitrix_status === 'mock_synced' ? 'badge-purple' : 'badge-red'}`}>
                {selectedCall.bitrix_status}
              </span>
            </div>
            <div style={{ fontSize: '0.85rem', color: '#f8fafc', marginBottom: '8px' }}>
              CRM Lead ID: <strong>{selectedCall.bitrix_lead_id || 'Not Assigned'}</strong>
            </div>
            {selectedCall.error_message && (
              <div style={{ fontSize: '0.78rem', color: '#f87171' }}>
                Error: {selectedCall.error_message}
              </div>
            )}
          </div>

          {/* Verbatim Dialogue in Chat Format */}
          <div style={{ marginBottom: '20px' }}>
            <ConversationChatView
              transcript={selectedCall.transcript || ''}
              callStatus={selectedCall.status || 'completed'}
              title="Call Dialogue Transcript"
              maxHeight="260px"
            />
          </div>

          {/* Raw Answers JSON */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '8px' }}>
              Raw Intake Responses
            </div>
            <pre style={{
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              padding: '14px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              color: '#38bdf8',
              overflowX: 'auto'
            }}>
              {JSON.stringify(selectedCall.raw_answers, null, 2)}
            </pre>
          </div>

          {/* Drawer Actions */}
          <div style={{ marginTop: 'auto', display: 'flex', gap: '10px' }}>
            <button
              onClick={() => handleResync(selectedCall.session_id)}
              disabled={resyncingId === selectedCall.session_id}
              className="btn-primary"
              style={{ flex: 1, justifyContent: 'center' }}
            >
              <RefreshCw size={15} className={resyncingId === selectedCall.session_id ? 'animate-spin' : ''} />
              <span>Resync Lead to Bitrix24</span>
            </button>
            <button
              onClick={() => {
                onDelete(selectedCall.session_id);
                setSelectedCall(null);
              }}
              className="btn-danger"
              style={{ padding: '10px 14px' }}
              title="Delete Record"
            >
              <Trash2 size={16} />
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
