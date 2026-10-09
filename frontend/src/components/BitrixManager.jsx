import React, { useState } from 'react';
import { 
  Database, CheckCircle, AlertCircle, Send, Key, 
  ExternalLink, Code, Sparkles, RefreshCw, Layers
} from 'lucide-react';

export default function BitrixManager({ bitrixConfig, onRefreshConfig }) {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [testStatus, setTestStatus] = useState(null);
  const [isTesting, setIsTesting] = useState(false);
  const [leadResult, setLeadResult] = useState(null);
  const [isSendingLead, setIsSendingLead] = useState(false);

  // Form for sample lead test
  const [testLeadName, setTestLeadName] = useState('Michael Vance');
  const [testCompany, setTestCompany] = useState('Vance Enterprises');
  const [testService, setTestService] = useState('AI Telephony & CRM Workflow Integration');
  const [testPhone, setTestPhone] = useState('+1 (555) 392-1084');
  const [testEmail, setTestEmail] = useState('mvance@vance-ent.com');

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestStatus(null);
    try {
      const res = await fetch('/api/bitrix/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhook_url: webhookUrl || undefined }),
      });
      const data = await res.json();
      setTestStatus(data);
    } catch (err) {
      setTestStatus({ success: false, message: `Network Error: ${err.message}` });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSendTestLead = async () => {
    setIsSendingLead(true);
    setLeadResult(null);
    try {
      const res = await fetch('/api/bitrix/test-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhook_url: webhookUrl || undefined,
          test_lead_name: testLeadName,
          test_company: testCompany,
          test_service: testService,
          test_phone: testPhone,
          test_email: testEmail,
        }),
      });
      const data = await res.json();
      setLeadResult(data);
      if (onRefreshConfig) onRefreshConfig();
    } catch (err) {
      setLeadResult({ success: false, message: `Error sending lead: ${err.message}` });
    } finally {
      setIsSendingLead(false);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '28px', marginBottom: '32px' }}>
      
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#f8fafc' }}>
              Bitrix24 REST API Webhook Center
            </h2>
            <span className={`badge ${bitrixConfig?.is_mock_mode ? 'badge-amber' : 'badge-green'}`}>
              {bitrixConfig?.is_mock_mode ? 'Mock Simulator Mode' : 'Live Bitrix24 Connected'}
            </span>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
            Direct integration with Bitrix24's Inbound Webhook (<code style={{ color: '#06b6d4', fontFamily: 'var(--font-mono)' }}>crm.lead.add</code>).
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        
        {/* Left Card: Webhook Configuration & Health Ping */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.65)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          padding: '24px'
        }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#f8fafc', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Key size={16} color="#6366f1" />
            <span>Webhook Credentials & Verification</span>
          </h3>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '6px' }}>
              Bitrix24 Inbound Webhook URL (from .env or custom test URL)
            </label>
            <input
              type="text"
              placeholder={bitrixConfig?.webhook_url_masked || "https://b24-xyz.bitrix24.com/rest/1/abc123xyz/"}
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(30, 41, 59, 0.7)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                padding: '10px 14px',
                color: '#f8fafc',
                fontSize: '0.85rem',
                fontFamily: 'var(--font-mono)',
                outline: 'none',
              }}
            />
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '6px' }}>
              Current configured status: {bitrixConfig?.is_configured ? 'Active in backend .env' : 'No live credentials configured yet (Running in Mock Simulator mode)'}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <button
              onClick={handleTestConnection}
              disabled={isTesting}
              className="btn-primary"
              style={{ flex: 1, justifyContent: 'center', fontSize: '0.85rem' }}
            >
              <RefreshCw size={14} className={isTesting ? 'animate-spin' : ''} />
              <span>{isTesting ? 'Pinging Bitrix24...' : 'Test Webhook Connection'}</span>
            </button>
          </div>

          {testStatus && (
            <div style={{
              background: testStatus.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${testStatus.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              borderRadius: '10px',
              padding: '12px',
              fontSize: '0.82rem',
              color: testStatus.success ? '#34d399' : '#f87171',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px'
            }}>
              {testStatus.success ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
              <div>
                <div style={{ fontWeight: '600' }}>{testStatus.message}</div>
                {testStatus.is_mock && (
                  <div style={{ fontSize: '0.75rem', color: '#fbbf24', marginTop: '4px' }}>
                    System operates in Mock Simulator Mode: calls flow end-to-end and generate verified lead structures without requiring a paid CRM account.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick Setup Guide */}
          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-color)', fontSize: '0.78rem', color: '#94a3b8' }}>
            <strong style={{ color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
              How to get your Bitrix24 Webhook URL:
            </strong>
            <ol style={{ paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <li>Open your Bitrix24 portal &rarr; Go to <b>Developer / Applications</b>.</li>
              <li>Click <b>Inbound Webhook</b>.</li>
              <li>Under Permissions, check <b>CRM (crm)</b>.</li>
              <li>Copy the generated Webhook URL and paste into <code style={{ color: '#38bdf8' }}>backend/.env</code> as <code style={{ color: '#38bdf8' }}>BITRIX24_WEBHOOK_URL</code>.</li>
            </ol>
          </div>
        </div>

        {/* Right Card: Manual Lead Dispatcher & Payload Preview */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.65)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          padding: '24px'
        }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#f8fafc', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Send size={16} color="#10b981" />
            <span>Instant CRM Lead Creation Test</span>
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Caller Name</label>
              <input
                type="text"
                value={testLeadName}
                onChange={(e) => setTestLeadName(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(30, 41, 59, 0.7)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '8px 10px',
                  color: '#f8fafc',
                  fontSize: '0.82rem',
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Company</label>
              <input
                type="text"
                value={testCompany}
                onChange={(e) => setTestCompany(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(30, 41, 59, 0.7)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '8px 10px',
                  color: '#f8fafc',
                  fontSize: '0.82rem',
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Desired Service</label>
            <input
              type="text"
              value={testService}
              onChange={(e) => setTestService(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(30, 41, 59, 0.7)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '8px 10px',
                color: '#f8fafc',
                fontSize: '0.82rem',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Phone</label>
              <input
                type="text"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(30, 41, 59, 0.7)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '8px 10px',
                  color: '#f8fafc',
                  fontSize: '0.82rem',
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Email</label>
              <input
                type="text"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(30, 41, 59, 0.7)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '8px 10px',
                  color: '#f8fafc',
                  fontSize: '0.82rem',
                }}
              />
            </div>
          </div>

          <button
            onClick={handleSendTestLead}
            disabled={isSendingLead}
            className="btn-emerald"
            style={{ width: '100%', justifyContent: 'center', fontSize: '0.85rem', marginBottom: '14px' }}
          >
            <Send size={15} />
            <span>{isSendingLead ? 'Pushing to Bitrix24...' : 'Push Sample Lead into Bitrix24'}</span>
          </button>

          {leadResult && (
            <div style={{
              background: 'rgba(15, 23, 42, 0.8)',
              border: `1px solid ${leadResult.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              borderRadius: '10px',
              padding: '12px',
              fontSize: '0.78rem',
            }}>
              <div style={{ fontWeight: '700', color: leadResult.success ? '#34d399' : '#f87171', marginBottom: '6px' }}>
                {leadResult.message}
              </div>
              <pre style={{
                fontFamily: 'var(--font-mono)',
                color: '#38bdf8',
                background: 'rgba(0, 0, 0, 0.4)',
                padding: '8px',
                borderRadius: '6px',
                maxHeight: '120px',
                overflowY: 'auto'
              }}>
                {JSON.stringify(leadResult.raw_response, null, 2)}
              </pre>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
