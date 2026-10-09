import React from 'react';
import { PhoneCall, ShieldCheck, Activity, Sparkles, Database, ExternalLink } from 'lucide-react';

export default function Header({ health, bitrixConfig, onOpenBitrixModal }) {
  const isHealthy = health?.status === 'healthy';
  const isBitrixMock = bitrixConfig?.is_mock_mode ?? true;

  return (
    <header className="glass-panel" style={{ padding: '16px 28px', marginBottom: '28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        
        {/* Brand & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(99, 102, 241, 0.4)'
          }}>
            <PhoneCall size={24} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '1.4rem', fontWeight: '800', letterSpacing: '-0.02em', color: '#f8fafc' }}>
                VoiceSync <span style={{ color: '#06b6d4' }}>AI</span>
              </h1>
              <span className="badge badge-purple" style={{ fontSize: '0.65rem' }}>
                <Sparkles size={11} /> Production Ready
              </span>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
              Autonomous Inbound Voice Telephony &bull; OpenAI GPT-4o-mini &bull; Bitrix24 CRM Sync
            </p>
          </div>
        </div>

        {/* Status Indicators & Action Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          
          {/* Health Badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: '10px',
            background: 'rgba(15, 23, 42, 0.8)',
            border: '1px solid var(--border-color)',
            fontSize: '0.82rem'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isHealthy ? '#10b981' : '#f59e0b',
              boxShadow: isHealthy ? '0 0 10px #10b981' : '0 0 10px #f59e0b'
            }} />
            <span style={{ color: '#cbd5e1' }}>API Engine:</span>
            <strong style={{ color: isHealthy ? '#34d399' : '#fbbf24' }}>
              {isHealthy ? 'Online' : 'Degraded'}
            </strong>
          </div>

          {/* Bitrix24 Mode Badge */}
          <button 
            onClick={onOpenBitrixModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: '10px',
              background: isBitrixMock ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
              border: `1px solid ${isBitrixMock ? 'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
              cursor: 'pointer',
              color: isBitrixMock ? '#fbbf24' : '#34d399',
              fontSize: '0.82rem',
              fontWeight: '600'
            }}
          >
            <Database size={14} />
            <span>Bitrix24: {isBitrixMock ? 'Mock Mode (Click to connect)' : 'Live Webhook Active'}</span>
          </button>

          {/* OpenAI LLM Status Badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            borderRadius: '10px',
            background: 'rgba(6, 182, 212, 0.1)',
            border: '1px solid rgba(6, 182, 212, 0.25)',
            fontSize: '0.82rem',
            color: '#38bdf8'
          }}>
            <Sparkles size={14} />
            <span>OpenAI: <strong>GPT-4o-mini</strong></span>
          </div>

          {/* Telephony Status */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            borderRadius: '10px',
            background: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            fontSize: '0.82rem',
            color: '#a5b4fc'
          }}>
            <Activity size={14} />
            <span>Twilio & WebRTC</span>
          </div>

        </div>

      </div>
    </header>
  );
}
