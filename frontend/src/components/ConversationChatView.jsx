import React, { useEffect, useRef } from 'react';
import { Bot, User, Sparkles, Mic, Volume2, Copy, Check, Radio } from 'lucide-react';

/**
 * Parses raw transcript lines into structured chat dialogue messages.
 */
export function parseTranscriptToMessages(transcriptText) {
  if (!transcriptText || typeof transcriptText !== 'string') return [];
  const lines = transcriptText.split('\n');
  const messages = [];
  let currentSpeaker = null;
  let currentText = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Detect speaker markers
    const botMatch = line.match(/^(?:Bot|Aura|AI Agent):\s*(.*)$/i);
    const callerMatch = line.match(/^(?:Caller|User|Human)(?:\s*\(Q\d+\))?:\s*(.*)$/i);

    if (botMatch) {
      if (currentSpeaker && currentText.length > 0) {
        messages.push({
          id: messages.length,
          sender: currentSpeaker,
          text: currentText.join(' '),
        });
        currentText = [];
      }
      currentSpeaker = 'bot';
      if (botMatch[1]) currentText.push(botMatch[1]);
    } else if (callerMatch) {
      if (currentSpeaker && currentText.length > 0) {
        messages.push({
          id: messages.length,
          sender: currentSpeaker,
          text: currentText.join(' '),
        });
        currentText = [];
      }
      currentSpeaker = 'caller';
      if (callerMatch[1]) currentText.push(callerMatch[1]);
    } else {
      if (currentSpeaker) {
        currentText.push(line);
      } else {
        currentSpeaker = 'bot';
        currentText.push(line);
      }
    }
  }

  if (currentSpeaker && currentText.length > 0) {
    messages.push({
      id: messages.length,
      sender: currentSpeaker,
      text: currentText.join(' '),
    });
  }

  return messages;
}

export default function ConversationChatView({
  transcript = '',
  isListening = false,
  isProcessing = false,
  callStatus = 'idle', // 'idle', 'active', 'processing', 'completed'
  maxHeight = '320px',
  title = 'Live Voice Dialogue',
}) {
  const messagesEndRef = useRef(null);
  const [copied, setCopied] = React.useState(false);

  const messages = parseTranscriptToMessages(transcript);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, isListening, isProcessing]);

  const handleCopy = () => {
    if (!transcript) return;
    navigator.clipboard.writeText(transcript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      background: 'rgba(15, 23, 42, 0.75)',
      border: '1px solid var(--border-color)',
      borderRadius: '14px',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Chat Header Bar */}
      <div style={{
        padding: '12px 16px',
        background: 'rgba(30, 41, 59, 0.6)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: callStatus === 'active' ? '#10b981' : callStatus === 'processing' ? '#f59e0b' : '#64748b',
            boxShadow: callStatus === 'active' ? '0 0 8px #10b981' : 'none'
          }} />
          <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {title}
          </span>
          <span style={{
            fontSize: '0.7rem',
            padding: '2px 8px',
            borderRadius: '10px',
            background: 'rgba(99, 102, 241, 0.15)',
            color: '#a5b4fc',
            border: '1px solid rgba(99, 102, 241, 0.3)'
          }}>
            {messages.length} {messages.length === 1 ? 'turn' : 'turns'}
          </span>
        </div>

        {transcript && (
          <button
            onClick={handleCopy}
            style={{
              background: 'transparent',
              border: 'none',
              color: copied ? '#34d399' : '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.75rem',
              padding: '4px 8px',
              borderRadius: '6px',
              transition: 'all 0.2s'
            }}
            title="Copy Transcript"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div style={{
        padding: '16px',
        maxHeight: maxHeight,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        background: 'radial-gradient(ellipse at top, rgba(30, 41, 59, 0.3) 0%, rgba(15, 23, 42, 0.8) 100%)',
      }}>
        {messages.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '30px 16px',
            color: '#64748b',
            fontSize: '0.85rem'
          }}>
            <Radio size={28} style={{ margin: '0 auto 10px', opacity: 0.5, color: '#38bdf8' }} />
            <div>Voice audio dialogue stream will appear here in real time.</div>
            <div style={{ fontSize: '0.75rem', marginTop: '4px', color: '#475569' }}>
              Connect call to begin speaking with Aura.
            </div>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isBot = msg.sender === 'bot';
            return (
              <div
                key={index}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isBot ? 'flex-start' : 'flex-end',
                  width: '100%',
                }}
              >
                {/* Sender Tag */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginBottom: '4px',
                  paddingLeft: isBot ? '4px' : '0',
                  paddingRight: isBot ? '0' : '4px',
                }}>
                  {isBot ? (
                    <>
                      <div style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '6px',
                        background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff'
                      }}>
                        <Sparkles size={11} />
                      </div>
                      <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#38bdf8' }}>
                        Aura (AI Voice Agent)
                      </span>
                    </>
                  ) : (
                    <>
                      <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#34d399' }}>
                        Caller (You)
                      </span>
                      <div style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '6px',
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff'
                      }}>
                        <User size={11} />
                      </div>
                    </>
                  )}
                </div>

                {/* Message Bubble */}
                <div style={{
                  maxWidth: '85%',
                  padding: '12px 16px',
                  borderRadius: isBot ? '4px 16px 16px 16px' : '16px 4px 16px 16px',
                  background: isBot
                    ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)'
                    : 'linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(5, 150, 105, 0.35) 100%)',
                  border: isBot
                    ? '1px solid rgba(56, 189, 248, 0.25)'
                    : '1px solid rgba(16, 185, 129, 0.45)',
                  boxShadow: isBot
                    ? '0 4px 14px rgba(0, 0, 0, 0.25)'
                    : '0 4px 14px rgba(16, 185, 129, 0.1)',
                  color: '#f8fafc',
                  fontSize: '0.88rem',
                  lineHeight: '1.45',
                  wordBreak: 'break-word',
                }}>
                  {msg.text}
                </div>
              </div>
            );
          })
        )}

        {/* Live Speaking / Listening Indicators */}
        {isListening && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', alignSelf: 'flex-end' }}>
            <span style={{ fontSize: '0.75rem', color: '#f43f5e', fontWeight: '600' }}>
              Listening to speech...
            </span>
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: 'rgba(244, 63, 94, 0.2)',
              border: '1px solid #f43f5e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f43f5e'
            }}>
              <Mic size={13} className="animate-pulse" />
            </div>
          </div>
        )}

        {isProcessing && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', alignSelf: 'flex-start' }}>
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: 'rgba(6, 182, 212, 0.2)',
              border: '1px solid #06b6d4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#06b6d4'
            }}>
              <Volume2 size={13} className="animate-pulse" />
            </div>
            <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: '600' }}>
              Aura is thinking & speaking...
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
