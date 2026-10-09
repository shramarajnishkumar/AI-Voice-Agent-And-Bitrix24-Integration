import React from 'react';
import { PhoneIncoming, UserCheck, Sparkles, Zap } from 'lucide-react';

export default function MetricsOverview({ calls = [], leads = [], health = null }) {
  const totalCalls = calls.length;
  const totalLeads = leads.length;
  const completedCalls = calls.filter(c => c.status === 'completed').length;
  const bitrixSynced = calls.filter(c => c.bitrix_status === 'synced' || c.bitrix_status === 'mock_synced').length;
  const syncRate = totalCalls > 0 ? Math.round((bitrixSynced / totalCalls) * 100) : 100;

  const modelLabel = health?.openai_model ? `OpenAI ${health.openai_model}` : 'OpenAI GPT-4o-mini';

  const cards = [
    {
      title: 'Total Inbound Calls',
      value: totalCalls,
      sub: `${completedCalls} successfully completed`,
      icon: PhoneIncoming,
      color: '#6366f1',
      bgGlow: 'rgba(99, 102, 241, 0.15)',
    },
    {
      title: 'Bitrix24 Leads Synced',
      value: bitrixSynced,
      sub: `${syncRate}% automated delivery rate`,
      icon: UserCheck,
      color: '#10b981',
      bgGlow: 'rgba(16, 185, 129, 0.15)',
    },
    {
      title: 'AI Dialogue & NLP Engine',
      value: modelLabel,
      sub: 'Real-time LLM dialogue & lead extraction',
      icon: Sparkles,
      color: '#06b6d4',
      bgGlow: 'rgba(6, 182, 212, 0.15)',
    },
    {
      title: 'Human-in-the-Loop',
      value: '0% Required',
      sub: '100% Fully autonomous journey',
      icon: Zap,
      color: '#f59e0b',
      bgGlow: 'rgba(245, 158, 11, 0.15)',
    },
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
      gap: '20px',
      marginBottom: '28px'
    }}>
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div key={idx} className="glass-panel" style={{
            padding: '20px 24px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Background Glow */}
            <div style={{
              position: 'absolute',
              top: '-20px',
              right: '-20px',
              width: '90px',
              height: '90px',
              borderRadius: '50%',
              background: card.bgGlow,
              filter: 'blur(30px)',
              pointerEvents: 'none'
            }} />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: '500', color: '#94a3b8' }}>
                {card.title}
              </span>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: `rgba(${card.color === '#6366f1' ? '99,102,241' : card.color === '#10b981' ? '16,185,129' : card.color === '#06b6d4' ? '6,182,212' : '245,158,11'}, 0.15)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: card.color
              }}>
                <Icon size={18} />
              </div>
            </div>

            <div style={{ fontSize: '1.65rem', fontWeight: '800', color: '#f8fafc', marginBottom: '4px' }}>
              {card.value}
            </div>

            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
              {card.sub}
            </div>
          </div>
        );
      })}
    </div>
  );
}
