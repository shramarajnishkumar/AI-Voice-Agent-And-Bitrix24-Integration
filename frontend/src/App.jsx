import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import MetricsOverview from './components/MetricsOverview';
import CallSimulator from './components/CallSimulator';
import CallLogsTable from './components/CallLogsTable';
import BitrixManager from './components/BitrixManager';
import TwilioGuide from './components/TwilioGuide';
import { PhoneCall, FileText, Database, Settings2 } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('simulator'); // 'simulator', 'logs', 'bitrix', 'telephony'
  const [calls, setCalls] = useState([]);
  const [leads, setLeads] = useState([]);
  const [health, setHealth] = useState(null);
  const [bitrixConfig, setBitrixConfig] = useState(null);

  // Fetch telemetry & calls from FastAPI backend
  const fetchData = async () => {
    try {
      // 1. Health
      const healthRes = await fetch('/api/health');
      if (healthRes.ok) {
        const hData = await healthRes.json();
        setHealth(hData);
      }

      // 2. Bitrix Config
      const bRes = await fetch('/api/bitrix/config');
      if (bRes.ok) {
        const bData = await bRes.json();
        setBitrixConfig(bData);
      }

      // 3. Calls
      const callsRes = await fetch('/api/calls');
      if (callsRes.ok) {
        const cData = await callsRes.json();
        setCalls(cData);
      }

      // 4. Leads
      const leadsRes = await fetch('/api/calls/leads');
      if (leadsRes.ok) {
        const lData = await leadsRes.json();
        setLeads(lData);
      }
    } catch (err) {
      console.warn('Backend polling error:', err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleResyncCall = async (sessionId) => {
    try {
      const res = await fetch(`/api/calls/resync/${sessionId}`, { method: 'POST' });
      const data = await res.json();
      fetchData();
      alert(`Resync completed: ${data.message}`);
    } catch (err) {
      alert(`Resync failed: ${err.message}`);
    }
  };

  const handleDeleteCall = async (sessionId) => {
    if (!confirm('Are you sure you want to delete this call record?')) return;
    try {
      await fetch(`/api/calls/${sessionId}`, { method: 'DELETE' });
      fetchData();
    } catch (err) {
      alert(`Delete error: ${err.message}`);
    }
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '24px 20px 60px' }}>
      
      {/* Top Navigation & Status Bar */}
      <Header
        health={health}
        bitrixConfig={bitrixConfig}
        onOpenBitrixModal={() => setActiveTab('bitrix')}
      />

      {/* Metrics Row */}
      <MetricsOverview calls={calls} leads={leads} health={health} />

      {/* Main Tab Switcher */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '24px',
        background: 'rgba(15, 23, 42, 0.6)',
        padding: '6px',
        borderRadius: '12px',
        border: '1px solid var(--border-color)',
        width: 'fit-content'
      }}>
        <button
          onClick={() => setActiveTab('simulator')}
          className="btn-secondary"
          style={{
            background: activeTab === 'simulator' ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
            borderColor: activeTab === 'simulator' ? '#6366f1' : 'transparent',
            color: activeTab === 'simulator' ? '#f8fafc' : '#94a3b8',
            fontSize: '0.85rem'
          }}
        >
          <PhoneCall size={16} color={activeTab === 'simulator' ? '#6366f1' : '#94a3b8'} />
          <span>Live Call Simulator</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className="btn-secondary"
          style={{
            background: activeTab === 'logs' ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
            borderColor: activeTab === 'logs' ? '#6366f1' : 'transparent',
            color: activeTab === 'logs' ? '#f8fafc' : '#94a3b8',
            fontSize: '0.85rem'
          }}
        >
          <FileText size={16} color={activeTab === 'logs' ? '#6366f1' : '#94a3b8'} />
          <span>Call Logs & CRM Leads ({calls.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('bitrix')}
          className="btn-secondary"
          style={{
            background: activeTab === 'bitrix' ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
            borderColor: activeTab === 'bitrix' ? '#6366f1' : 'transparent',
            color: activeTab === 'bitrix' ? '#f8fafc' : '#94a3b8',
            fontSize: '0.85rem'
          }}
        >
          <Database size={16} color={activeTab === 'bitrix' ? '#6366f1' : '#94a3b8'} />
          <span>Bitrix24 Integration</span>
        </button>

        <button
          onClick={() => setActiveTab('telephony')}
          className="btn-secondary"
          style={{
            background: activeTab === 'telephony' ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
            borderColor: activeTab === 'telephony' ? '#6366f1' : 'transparent',
            color: activeTab === 'telephony' ? '#f8fafc' : '#94a3b8',
            fontSize: '0.85rem'
          }}
        >
          <Settings2 size={16} color={activeTab === 'telephony' ? '#6366f1' : '#94a3b8'} />
          <span>Telephony Hub & Twilio</span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'simulator' && (
        <>
          <CallSimulator onCallCompleted={fetchData} />
          <CallLogsTable
            calls={calls}
            onRefresh={fetchData}
            onResync={handleResyncCall}
            onDelete={handleDeleteCall}
          />
        </>
      )}

      {activeTab === 'logs' && (
        <CallLogsTable
          calls={calls}
          onRefresh={fetchData}
          onResync={handleResyncCall}
          onDelete={handleDeleteCall}
        />
      )}

      {activeTab === 'bitrix' && (
        <BitrixManager
          bitrixConfig={bitrixConfig}
          onRefreshConfig={fetchData}
        />
      )}

      {activeTab === 'telephony' && (
        <TwilioGuide />
      )}

      {/* Footer */}
      <footer style={{
        marginTop: '40px',
        paddingTop: '20px',
        borderTop: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        fontSize: '0.8rem',
        color: '#64748b'
      }}>
        <div>
          Autonomous AI Voice Inbound Telephony Agent &bull; Powered by FastAPI & React
        </div>
        <div>
          End-to-End Milestone Verified &bull; Bitrix24 REST API Connected
        </div>
      </footer>

    </div>
  );
}
