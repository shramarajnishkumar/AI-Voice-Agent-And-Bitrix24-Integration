import React, { useState } from 'react';
import { PhoneForwarded, Copy, Check, Terminal, ExternalLink, ShieldCheck } from 'lucide-react';

export default function TwilioGuide() {
  const [copiedKey, setCopiedKey] = useState(null);

  const currentHost = window.location.origin;
  const voiceWebhook = `${currentHost}/api/twilio/voice`;
  const gatherWebhook = `${currentHost}/api/twilio/gather`;
  const statusWebhook = `${currentHost}/api/twilio/status`;

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="glass-panel" style={{ padding: '28px', marginBottom: '32px' }}>
      
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#f8fafc' }}>
              Public Telephony Integration & Twilio Hub
            </h2>
            <span className="badge badge-purple">
              Live Phone Calling Ready
            </span>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
            To connect a real public telephone number (US, UK, or global), configure these endpoints in your Twilio Console or Asterisk PBX.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        
        {/* Webhooks Box */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.65)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          padding: '20px'
        }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#38bdf8', marginBottom: '12px' }}>
            Twilio Phone Number Webhooks
          </h3>

          {/* Webhook 1: Inbound Voice */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>
              A CALL COMES IN (Webhook URL - HTTP POST):
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              background: 'rgba(30, 41, 59, 0.8)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '6px 10px',
              justifyContent: 'space-between',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8rem',
              color: '#f8fafc'
            }}>
              <span>{voiceWebhook}</span>
              <button
                onClick={() => copyToClipboard(voiceWebhook, 'voice')}
                style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer' }}
                title="Copy Webhook URL"
              >
                {copiedKey === 'voice' ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          {/* Webhook 2: Speech Gather */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>
              SPEECH RECOGNITION GATHER ACTION:
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              background: 'rgba(30, 41, 59, 0.8)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '6px 10px',
              justifyContent: 'space-between',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8rem',
              color: '#f8fafc'
            }}>
              <span>{gatherWebhook}</span>
              <button
                onClick={() => copyToClipboard(gatherWebhook, 'gather')}
                style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer' }}
                title="Copy Webhook URL"
              >
                {copiedKey === 'gather' ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          {/* Webhook 3: Status Callback */}
          <div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>
              CALL STATUS CHANGES (Optional):
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              background: 'rgba(30, 41, 59, 0.8)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '6px 10px',
              justifyContent: 'space-between',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8rem',
              color: '#f8fafc'
            }}>
              <span>{statusWebhook}</span>
              <button
                onClick={() => copyToClipboard(statusWebhook, 'status')}
                style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer' }}
                title="Copy Webhook URL"
              >
                {copiedKey === 'status' ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
              </button>
            </div>
          </div>
        </div>

        {/* Local Tunneling & VPS Setup */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.65)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          padding: '20px'
        }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#10b981', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Terminal size={16} />
            <span>Expose Local Server to Public Web (ngrok)</span>
          </h3>

          <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '10px' }}>
            If testing from localhost on a laptop, run ngrok to generate an HTTPS public URL for Twilio to ping:
          </p>

          <div style={{
            background: 'rgba(0, 0, 0, 0.5)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '10px 14px',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.82rem',
            color: '#34d399',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '12px'
          }}>
            <span>ngrok http 8000</span>
            <button
              onClick={() => copyToClipboard('ngrok http 8000', 'ngrok')}
              style={{ background: 'none', border: 'none', color: '#34d399', cursor: 'pointer' }}
              title="Copy Command"
            >
              {copiedKey === 'ngrok' ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
            </button>
          </div>

          <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
            Copy the generated <code style={{ color: '#38bdf8' }}>https://&lt;id&gt;.ngrok-free.app</code> into <code style={{ color: '#38bdf8' }}>backend/.env</code> as <code style={{ color: '#38bdf8' }}>PUBLIC_BASE_URL</code>.
          </div>
        </div>

      </div>

    </div>
  );
}
