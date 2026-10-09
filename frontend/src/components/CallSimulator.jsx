import React, { useState, useEffect, useRef } from 'react';
import {
  Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, CheckCircle,
  ArrowRight, Sparkles, Building2, User, Wrench, Mail, Clock,
  Send, RefreshCw, AlertCircle, FileText, Smartphone, Radio, ExternalLink
} from 'lucide-react';
import ConversationChatView from './ConversationChatView';

const PRESETS = [
  {
    label: 'Nexus Technologies (Cloud Migration)',
    company: 'Nexus Technologies',
    q1: 'My name is Alex Mercer and my company is Nexus Technologies',
    q2: 'We are looking for cloud migration and voice AI agents for customer service',
    q3: 'You can email me at alex@nexustech.io or call me at 555-019-8833',
  },
  {
    label: 'Miller Freightways (Logistics CRM)',
    company: 'Miller Freightways',
    q1: 'I am David Miller from Miller Freightways',
    q2: 'We need automated inbound CRM telephony for our dispatch team',
    q3: 'Reach me at david@millerfreight.com',
  },
  {
    label: 'CarePoint Systems (Health AI)',
    company: 'CarePoint Systems',
    q1: 'Dr. Emily Chen with CarePoint Systems',
    q2: 'Looking for conversational patient intake telephony integrated with our CRM',
    q3: 'Please call me at +1-555-772-9100 or email emily@carepoint.health',
  },
];

export default function CallSimulator({ onCallCompleted }) {
  // Mode: 'mobile' (real Twilio call to user's phone) or 'browser' (laptop mic/speaker simulator)
  const [callMode, setCallMode] = useState('mobile');

  // Phone Call (Twilio Outbound) state
  const [mobileNumber, setMobileNumber] = useState('+919097603646');
  const [isCallingPhone, setIsCallingPhone] = useState(false);
  const [phoneCallFeedback, setPhoneCallFeedback] = useState(null);
  const [phoneCallSid, setPhoneCallSid] = useState(null);
  const [phoneCallSession, setPhoneCallSession] = useState(null);

  // Browser Simulator state
  const [callerPhone, setCallerPhone] = useState('+1 (555) 019-2834');
  const [callStatus, setCallStatus] = useState('idle'); // idle, connecting, active, processing, completed
  const [currentStep, setCurrentStep] = useState(0); // 0, 1, 2, 3
  const [sessionId, setSessionId] = useState(null);
  const [botPrompt, setBotPrompt] = useState('');
  const [transcript, setTranscript] = useState('');
  const [userSpeechInput, setUserSpeechInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [extractedData, setExtractedData] = useState(null);
  const [bitrixLeadId, setBitrixLeadId] = useState(null);
  const [bitrixStatus, setBitrixStatus] = useState(null);
  const [callDuration, setCallDuration] = useState(0);
  const [activePresetIndex, setActivePresetIndex] = useState(0);

  const recognitionRef = useRef(null);
  const timerRef = useRef(null);
  const pollIntervalRef = useRef(null);

  // Poll phone call session status when an outbound call is active
  useEffect(() => {
    if (phoneCallSid) {
      pollIntervalRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/calls/${phoneCallSid}`);
          if (res.ok) {
            const data = await res.json();
            setPhoneCallSession(data);
            if (data.status === 'completed' || data.status === 'failed') {
              clearInterval(pollIntervalRef.current);
              setIsCallingPhone(false);
              if (onCallCompleted) onCallCompleted();
            }
          }
        } catch (err) {
          console.warn('Error polling phone call status:', err);
        }
      }, 3000);
    }
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [phoneCallSid, onCallCompleted]);

  // Trigger Real Outbound Call via Twilio
  const handleTriggerMobileCall = async () => {
    if (!mobileNumber.trim()) {
      alert('Please enter a valid phone number (e.g. +919097603646)');
      return;
    }

    setIsCallingPhone(true);
    setPhoneCallFeedback(null);
    setPhoneCallSession(null);

    try {
      const res = await fetch('/api/twilio/outbound-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to_phone: mobileNumber.trim() }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setPhoneCallSid(data.call_sid);
        setPhoneCallFeedback({
          success: true,
          message: data.message,
          callSid: data.call_sid,
        });
      } else {
        setIsCallingPhone(false);
        setPhoneCallFeedback({
          success: false,
          message: data.detail || data.message || 'Twilio failed to dispatch call.',
        });
      }
    } catch (err) {
      setIsCallingPhone(false);
      setPhoneCallFeedback({
        success: false,
        message: `Network error connecting to backend: ${err.message}`,
      });
    }
  };

  // Browser Call timer effect
  useEffect(() => {
    if (callStatus === 'active') {
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callStatus]);

  // Text to Speech playback for Browser Simulator
  const speakText = (text) => {
    if (!ttsEnabled || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      const voices = window.speechSynthesis.getVoices();
      const naturalVoice = voices.find(v => v.lang.includes('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Zira') || v.name.includes('Samantha')));
      if (naturalVoice) utterance.voice = naturalVoice;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('TTS playback error:', e);
    }
  };

  // Browser Speech Recognition Setup (Web Speech API)
  const toggleSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported by your current browser. You can type or select preset answers.');
      return;
    }

    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        const transcriptText = Array.from(event.results)
          .map((r) => r[0].transcript)
          .join('');
        setUserSpeechInput(transcriptText);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setIsListening(false);
    }
  };

  // Start Browser Simulator Call Handler
  const handleStartBrowserCall = async () => {
    setCallStatus('connecting');
    setCallDuration(0);
    setTranscript('');
    setExtractedData(null);
    setBitrixLeadId(null);
    setBitrixStatus(null);
    setUserSpeechInput('');

    try {
      const res = await fetch('/api/calls/simulator/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caller_phone: callerPhone }),
      });
      const data = await res.json();

      setSessionId(data.session_id);
      setCurrentStep(0);
      setBotPrompt(data.bot_prompt);
      setTranscript(data.transcript);
      setCallStatus('active');

      speakText(data.bot_prompt);

      const currentPreset = PRESETS[activePresetIndex];
      setUserSpeechInput(currentPreset.q1);
    } catch (err) {
      console.error('Error starting call:', err);
      alert('Failed to connect to backend server. Ensure backend is running.');
      setCallStatus('idle');
    }
  };

  // Submit Caller Speech Answer (Browser Mode)
  const handleAnswerStep = async (overrideSpeech) => {
    const speechToSend = (overrideSpeech || userSpeechInput).trim();
    if (!speechToSend) {
      alert('Please speak into the microphone or enter a response to proceed.');
      return;
    }

    const nextStep = currentStep + 1;
    setCallStatus(nextStep >= 3 ? 'processing' : 'active');

    try {
      const res = await fetch('/api/calls/simulator/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          step: nextStep,
          user_speech: speechToSend,
        }),
      });
      const data = await res.json();

      setBotPrompt(data.bot_prompt);
      setTranscript(data.transcript);
      setCurrentStep(data.step);

      speakText(data.bot_prompt);

      if (data.is_completed) {
        setCallStatus('completed');
        setExtractedData(data.extracted_data);
        setBitrixLeadId(data.bitrix_lead_id);
        setBitrixStatus(data.bitrix_status);
        if (onCallCompleted) onCallCompleted();
      } else {
        const currentPreset = PRESETS[activePresetIndex];
        if (data.step === 1) {
          setUserSpeechInput(currentPreset.q2);
        } else if (data.step === 2) {
          setUserSpeechInput(currentPreset.q3);
        }
      }
    } catch (err) {
      console.error('Error submitting answer:', err);
      alert('Failed to process response. Please try again.');
      setCallStatus('active');
    }
  };

  const handleHangUp = () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (isListening && recognitionRef.current) recognitionRef.current.stop();
    setCallStatus('idle');
    setCurrentStep(0);
    setSessionId(null);
  };

  const formatDuration = (secs) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  };

  return (
    <div className="glass-panel" style={{ padding: '28px', marginBottom: '32px' }}>

      {/* Top Mode Selector Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#f8fafc' }}>
              Voice Intake Calling Console
            </h2>
            <span className={`badge ${callMode === 'mobile' ? 'badge-green' : 'badge-blue'}`}>
              {callMode === 'mobile' ? 'Real Phone Call (Twilio)' : 'In-Browser Mic Mode'}
            </span>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
            Choose whether to ring your real mobile phone via Twilio or test in your web browser.
          </p>
        </div>

        {/* Mode Switcher Buttons */}
        <div style={{
          display: 'flex',
          background: 'rgba(15, 23, 42, 0.8)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '4px',
          gap: '4px'
        }}>
          <button
            onClick={() => setCallMode('mobile')}
            className="btn-secondary"
            style={{
              background: callMode === 'mobile' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'transparent',
              color: callMode === 'mobile' ? '#ffffff' : '#94a3b8',
              border: 'none',
              padding: '8px 16px',
              fontSize: '0.82rem',
              fontWeight: '600'
            }}
          >
            <Smartphone size={15} />
            <span>Real Phone Call (Twilio)</span>
          </button>

          <button
            onClick={() => setCallMode('browser')}
            className="btn-secondary"
            style={{
              background: callMode === 'browser' ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' : 'transparent',
              color: callMode === 'browser' ? '#ffffff' : '#94a3b8',
              border: 'none',
              padding: '8px 16px',
              fontSize: '0.82rem',
              fontWeight: '600'
            }}
          >
            <Radio size={15} />
            <span>Browser Mic / Speaker</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODE 1: REAL TWILIO PHONE CALL TO USER'S MOBILE               */}
      {/* ============================================================== */}
      {callMode === 'mobile' && (
        <div style={{
          background: 'rgba(15, 23, 42, 0.7)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: '16px',
          padding: '28px',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '28px' }}>

            {/* Left Box: Trigger Phone Call */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#10b981'
                }}>
                  <Phone size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#f8fafc' }}>
                    Dial Your Mobile Phone
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                    The AI bot will call your phone, dynamically converse using OpenAI, and push the lead to Bitrix24!
                  </p>
                </div>
              </div>

              {/* Mobile Number Input */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', fontWeight: '600', marginBottom: '6px' }}>
                  Target Phone Number (with Country Code)
                </label>
                <input
                  type="text"
                  placeholder="+919097603646"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(30, 41, 59, 0.8)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    padding: '12px 16px',
                    color: '#f8fafc',
                    fontSize: '1.1rem',
                    fontFamily: 'var(--font-mono)',
                    outline: 'none',
                    letterSpacing: '0.04em'
                  }}
                />
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '6px' }}>
                  Calling from Twilio configured number: <strong style={{ color: '#38bdf8' }}>+1 (737) 250-8034</strong>
                </div>
              </div>

              {/* Call Action Button */}
              <button
                onClick={handleTriggerMobileCall}
                disabled={isCallingPhone}
                className="btn-emerald"
                style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '1rem', fontWeight: '700' }}
              >
                {isCallingPhone ? <RefreshCw size={18} className="animate-spin" /> : <Phone size={18} />}
                <span>{isCallingPhone ? 'Calling Your Phone Right Now...' : '📞 Ring My Mobile Phone'}</span>
              </button>

              {/* Feedback Alert */}
              {phoneCallFeedback && (
                <div style={{
                  marginTop: '16px',
                  padding: '14px',
                  borderRadius: '10px',
                  background: phoneCallFeedback.success ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                  border: `1px solid ${phoneCallFeedback.success ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
                  fontSize: '0.85rem',
                  color: phoneCallFeedback.success ? '#34d399' : '#f87171'
                }}>
                  <div style={{ fontWeight: '700', marginBottom: '4px' }}>
                    {phoneCallFeedback.success ? 'Call Dispatched Successfully!' : 'Call Dispatch Notice:'}
                  </div>
                  <div>{phoneCallFeedback.message}</div>
                  {phoneCallFeedback.callSid && (
                    <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: '#94a3b8', marginTop: '6px' }}>
                      Twilio CallSid: {phoneCallFeedback.callSid}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Box: Live Phone Call Telemetry & Step Tracking */}
            <div style={{
              background: 'rgba(30, 41, 59, 0.5)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: '700', textTransform: 'uppercase', color: '#38bdf8' }}>
                    Live Call Telemetry
                  </span>
                  {phoneCallSession && (
                    <span className={`badge ${phoneCallSession.status === 'completed' ? 'badge-green' : 'badge-blue'}`}>
                      {phoneCallSession.status}
                    </span>
                  )}
                </div>

                {phoneCallSession ? (
                  <div>
                    {/* Live Transcript from Phone in Chat Format */}
                    <div style={{ marginBottom: '14px' }}>
                      <ConversationChatView
                        transcript={phoneCallSession.transcript || ''}
                        callStatus={phoneCallSession.status || 'in_progress'}
                        title="Live Mobile Call Dialogue (Twilio)"
                        maxHeight="220px"
                      />
                    </div>

                    {/* Extracted Data if completed */}
                    {phoneCallSession.extracted_data && (
                      <div style={{
                        background: 'rgba(16, 185, 129, 0.1)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        borderRadius: '8px',
                        padding: '12px',
                        fontSize: '0.82rem'
                      }}>
                        <div style={{ fontWeight: '700', color: '#34d399', marginBottom: '6px' }}>
                          Bitrix24 Lead Created! (#{phoneCallSession.bitrix_lead_id || 'MOCK'})
                        </div>
                        <div style={{ color: '#e2e8f0' }}>
                          Company: <strong>{phoneCallSession.extracted_data.company_name}</strong> &bull; Service: <strong>{phoneCallSession.extracted_data.desired_service}</strong>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: '1.6' }}>
                    <p style={{ marginBottom: '10px' }}>
                      <strong>How the mobile call works:</strong>
                    </p>
                    <ol style={{ paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <li>Click the green button to trigger Twilio.</li>
                      <li>Your mobile phone (+919097603646) will start ringing.</li>
                      <li>Pick up and listen to the AI greeting.</li>
                      <li>Speak naturally to the AI bot as it dynamically asks questions based on what you say.</li>
                      <li>When you hang up, the lead is automatically created in Bitrix24!</li>
                    </ol>
                  </div>
                )}
              </div>

              {/* Requirement reminder regarding ngrok */}
              <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-color)', fontSize: '0.75rem', color: '#64748b' }}>
                Note: Ensure <code style={{ color: '#38bdf8' }}>ngrok http 8000</code> is running and <code style={{ color: '#38bdf8' }}>PUBLIC_BASE_URL</code> is set in <code style={{ color: '#38bdf8' }}>backend/.env</code> so Twilio can reach your webhook.
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODE 2: BROWSER MIC / SPEAKER SIMULATOR                        */}
      {/* ============================================================== */}
      {callMode === 'browser' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>

          {/* Left Column: Phone Console */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.65)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '420px',
          }}>

            {/* Top Status & Phone Number Display */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: callStatus === 'active' ? '#10b981' : callStatus === 'processing' ? '#f59e0b' : '#64748b',
                    boxShadow: callStatus === 'active' ? '0 0 12px #10b981' : 'none'
                  }} />
                  <span style={{ fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#cbd5e1' }}>
                    {callStatus === 'idle' ? 'Ready to Call' : callStatus === 'connecting' ? 'Connecting...' : callStatus === 'active' ? 'Call In Progress' : callStatus === 'processing' ? 'Syncing to Bitrix24...' : 'Call Completed'}
                  </span>
                </div>
                {sessionId && (
                  <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: '#6366f1' }}>
                    {sessionId}
                  </span>
                )}
              </div>

              {/* Caller ID Input */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '6px' }}>
                  Simulated Caller Phone Number
                </label>
                <input
                  type="text"
                  disabled={callStatus !== 'idle'}
                  value={callerPhone}
                  onChange={(e) => setCallerPhone(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(30, 41, 59, 0.7)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    color: '#f8fafc',
                    fontSize: '0.95rem',
                    fontFamily: 'var(--font-mono)',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Dynamic Waveform Visualizer */}
              {callStatus === 'active' && (
                <div style={{
                  background: 'rgba(99, 102, 241, 0.08)',
                  border: '1px solid rgba(99, 102, 241, 0.25)',
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  height: '70px',
                }}>
                  <div className="wave-bar" />
                  <div className="wave-bar" />
                  <div className="wave-bar" />
                  <div className="wave-bar" />
                  <div className="wave-bar" />
                  <div className="wave-bar" />
                  <div className="wave-bar" />
                  <span style={{ fontSize: '0.8rem', color: '#a5b4fc', marginLeft: '12px', fontWeight: '500' }}>
                    AI Voice Channel Active
                  </span>
                </div>
              )}

              {/* Bot Prompt Speech Bubble */}
              {callStatus !== 'idle' && (
                <div style={{
                  background: 'rgba(30, 41, 59, 0.9)',
                  borderLeft: '4px solid #06b6d4',
                  borderRadius: '8px',
                  padding: '14px 16px',
                  marginBottom: '20px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <Sparkles size={14} color="#06b6d4" />
                    <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: '#06b6d4' }}>
                      AI Voice Agent (Aura)
                    </span>
                  </div>
                  <p style={{ fontSize: '0.9rem', color: '#f1f5f9', fontStyle: 'italic', lineHeight: '1.4' }}>
                    "{botPrompt || 'Dialing system...'}"
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Call Action Controls */}
            <div>
              {callStatus === 'idle' ? (
                <div>
                  <button
                    onClick={handleStartBrowserCall}
                    className="btn-primary"
                    style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '1rem' }}
                  >
                    <Radio size={20} />
                    <span>Start Browser Voice Simulation</span>
                  </button>

                  {/* Preset Scenarios Selector */}
                  <div style={{ marginTop: '16px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Quick Test Personas
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {PRESETS.map((preset, idx) => (
                        <button
                          key={idx}
                          onClick={() => setActivePresetIndex(idx)}
                          style={{
                            textAlign: 'left',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            background: activePresetIndex === idx ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                            border: `1px solid ${activePresetIndex === idx ? '#6366f1' : 'transparent'}`,
                            color: activePresetIndex === idx ? '#f8fafc' : '#94a3b8',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <span>{preset.label}</span>
                          {activePresetIndex === idx && <CheckCircle size={14} color="#6366f1" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : callStatus === 'active' ? (
                <div>
                  {/* Caller Speech Input */}
                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <label style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                        Caller Response (Speech or Text)
                      </label>
                      <button
                        onClick={toggleSpeechRecognition}
                        style={{
                          background: isListening ? '#f43f5e' : 'rgba(99, 102, 241, 0.2)',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '4px 10px',
                          color: '#ffffff',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        {isListening ? <MicOff size={14} /> : <Mic size={14} />}
                        <span>{isListening ? 'Stop Mic' : 'Speak with Mic'}</span>
                      </button>
                    </div>

                    <div style={{ position: 'relative' }}>
                      <textarea
                        rows={2}
                        value={userSpeechInput}
                        onChange={(e) => setUserSpeechInput(e.target.value)}
                        placeholder="Type caller response or click 'Speak with Mic'..."
                        style={{
                          width: '100%',
                          background: 'rgba(30, 41, 59, 0.7)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '10px',
                          padding: '10px 14px',
                          color: '#f8fafc',
                          fontSize: '0.9rem',
                          outline: 'none',
                          resize: 'none',
                        }}
                      />
                    </div>
                  </div>

                  {/* Action Buttons: Submit Speech & Hang Up */}
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => handleAnswerStep()}
                      className="btn-primary"
                      style={{ flex: 1, justifyContent: 'center' }}
                    >
                      <Send size={16} />
                      <span>Send Answer (Step {currentStep + 1}/3)</span>
                    </button>
                    <button
                      onClick={handleHangUp}
                      className="btn-danger"
                      style={{ padding: '10px 16px' }}
                      title="End Call"
                    >
                      <PhoneOff size={18} />
                    </button>
                  </div>
                </div>
              ) : callStatus === 'processing' ? (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <RefreshCw size={28} className="animate-spin" color="#06b6d4" style={{ margin: '0 auto 12px' }} />
                  <p style={{ fontSize: '0.9rem', color: '#cbd5e1', fontWeight: '600' }}>
                    Analyzing Dialogue & Creating Lead in Bitrix24...
                  </p>
                </div>
              ) : (
                <div>
                  <div style={{
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: '10px',
                    padding: '14px',
                    marginBottom: '16px',
                    textAlign: 'center'
                  }}>
                    <CheckCircle size={24} color="#10b981" style={{ margin: '0 auto 6px' }} />
                    <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#34d399' }}>
                      Call Completed & Lead Created!
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#a7f3d0' }}>
                      Lead ID: <strong>{bitrixLeadId || 'MOCK-LEAD'}</strong> ({bitrixStatus === 'mock_synced' ? 'Mock Mode' : 'Bitrix24 CRM'})
                    </div>
                  </div>

                  <button
                    onClick={handleStartBrowserCall}
                    className="btn-primary"
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    <Radio size={18} />
                    <span>Start New Browser Simulation</span>
                  </button>
                </div>
              )}
            </div>

          </div>

          {/* Right Column: Step Journey & Extraction Inspector */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.65)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#f8fafc', marginBottom: '16px' }}>
                Intake Flow & NLP Extraction Monitor
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                {/* Question 1 */}
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  background: currentStep >= 1 ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                  border: `1px solid ${currentStep === 0 && callStatus === 'active' ? '#6366f1' : currentStep >= 1 ? 'rgba(99, 102, 241, 0.4)' : 'var(--border-color)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      background: currentStep >= 1 ? '#6366f1' : 'rgba(255,255,255,0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.8rem',
                      fontWeight: '700'
                    }}>
                      {currentStep >= 1 ? '✓' : '1'}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#f8fafc' }}>
                        Question 1: Name & Company
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        Identifies caller identity and target organization
                      </div>
                    </div>
                  </div>
                  <span className={`badge ${currentStep >= 1 ? 'badge-green' : currentStep === 0 && callStatus === 'active' ? 'badge-blue' : 'badge-amber'}`} style={{ fontSize: '0.7rem' }}>
                    {currentStep >= 1 ? 'Answered' : currentStep === 0 && callStatus === 'active' ? 'Current' : 'Pending'}
                  </span>
                </div>

                {/* Question 2 */}
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  background: currentStep >= 2 ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                  border: `1px solid ${currentStep === 1 && callStatus === 'active' ? '#6366f1' : currentStep >= 2 ? 'rgba(99, 102, 241, 0.4)' : 'var(--border-color)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      background: currentStep >= 2 ? '#6366f1' : 'rgba(255,255,255,0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.8rem',
                      fontWeight: '700'
                    }}>
                      {currentStep >= 2 ? '✓' : '2'}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#f8fafc' }}>
                        Question 2: Desired Service
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        Categorizes customer intent and requirement
                      </div>
                    </div>
                  </div>
                  <span className={`badge ${currentStep >= 2 ? 'badge-green' : currentStep === 1 && callStatus === 'active' ? 'badge-blue' : 'badge-amber'}`} style={{ fontSize: '0.7rem' }}>
                    {currentStep >= 2 ? 'Answered' : currentStep === 1 && callStatus === 'active' ? 'Current' : 'Pending'}
                  </span>
                </div>

                {/* Question 3 */}
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  background: currentStep >= 3 ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                  border: `1px solid ${currentStep === 2 && callStatus === 'active' ? '#6366f1' : currentStep >= 3 ? 'rgba(99, 102, 241, 0.4)' : 'var(--border-color)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      background: currentStep >= 3 ? '#6366f1' : 'rgba(255,255,255,0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.8rem',
                      fontWeight: '700'
                    }}>
                      {currentStep >= 3 ? '✓' : '3'}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#f8fafc' }}>
                        Question 3: Contact Channel
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        Extracts phone number, email or callback preference
                      </div>
                    </div>
                  </div>
                  <span className={`badge ${currentStep >= 3 ? 'badge-green' : currentStep === 2 && callStatus === 'active' ? 'badge-blue' : 'badge-amber'}`} style={{ fontSize: '0.7rem' }}>
                    {currentStep >= 3 ? 'Answered' : currentStep === 2 && callStatus === 'active' ? 'Current' : 'Pending'}
                  </span>
                </div>
              </div>

              {/* Real-time Call Chat Dialogue Stream */}
              <div style={{ marginBottom: extractedData ? '16px' : '0' }}>
                <ConversationChatView
                  transcript={transcript}
                  isListening={isListening}
                  isProcessing={callStatus === 'processing'}
                  callStatus={callStatus}
                  title="Live AI Call Dialogue (Real-time Chat)"
                  maxHeight={extractedData ? '220px' : '300px'}
                />
              </div>

              {/* Extracted Entity Card */}
              {extractedData && (
                <div style={{
                  background: 'rgba(30, 41, 59, 0.8)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  borderRadius: '12px',
                  padding: '16px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Sparkles size={16} color="#10b981" />
                      <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#34d399' }}>
                        Extracted Bitrix24 Lead Payload
                      </span>
                    </div>
                    <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>
                      Confidence: {Math.round(extractedData.confidence_score * 100)}%
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.82rem', marginBottom: '12px' }}>
                    <div>
                      <span style={{ color: '#94a3b8' }}>Caller Name:</span>
                      <div style={{ fontWeight: '600', color: '#f8fafc' }}>{extractedData.caller_name || 'N/A'}</div>
                    </div>
                    <div>
                      <span style={{ color: '#94a3b8' }}>Company:</span>
                      <div style={{ fontWeight: '600', color: '#f8fafc' }}>{extractedData.company_name || 'N/A'}</div>
                    </div>
                    <div>
                      <span style={{ color: '#94a3b8' }}>Desired Service:</span>
                      <div style={{ fontWeight: '600', color: '#f8fafc' }}>{extractedData.desired_service || 'N/A'}</div>
                    </div>
                    <div>
                      <span style={{ color: '#94a3b8' }}>Contact Channel:</span>
                      <div style={{ fontWeight: '600', color: '#f8fafc' }}>{extractedData.contact_channel || 'N/A'}</div>
                    </div>
                  </div>

                  <div style={{
                    background: 'rgba(15, 23, 42, 0.7)',
                    borderRadius: '8px',
                    padding: '10px',
                    fontSize: '0.78rem',
                    color: '#cbd5e1',
                    border: '1px solid var(--border-color)'
                  }}>
                    <strong style={{ color: '#38bdf8' }}>AI Executive Summary: </strong>
                    {extractedData.summary}
                  </div>
                </div>
              )}
            </div>

            <div style={{ marginTop: '16px', fontSize: '0.75rem', color: '#64748b' }}>
              Powered by Twilio TwiML Voice Engine &bull; OpenAI GPT-4o-mini Dialogue &amp; NLP &bull; Bitrix24 REST API (crm.lead.add)
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
