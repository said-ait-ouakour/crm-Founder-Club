// ElevenLabs Conversational AI Agent for Leads Page
'use client';

import { useConversation } from '@elevenlabs/react';
import { useCallback, useState, useRef } from 'react';
import { FiPhone, FiPhoneOff } from 'react-icons/fi';

const AGENT_AVATAR = '/public/alex.jpeg'; // You can replace this with your own image

export function LeadAIAgent() {
  const [open, setOpen] = useState(false);
  const [ringing, setRinging] = useState(false);
  const [callAccepted, setCallAccepted] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const conversation = useConversation({
    onConnect: () => {
      setCallAccepted(true);
      setRinging(false);
    },
    onDisconnect: () => {
      setCallAccepted(false);
      setRinging(false);
    },
    onMessage: (message) => console.log('Message:', message),
    onError: (error) => console.error('Error:', error),
  });

  const getSignedUrl = async (): Promise<string> => {
    const response = await fetch('/api/get-signed-url');
    if (!response.ok) {
      throw new Error(`Failed to get signed url: ${response.statusText}`);
    }
    const { signedUrl } = await response.json();
    return signedUrl;
  };

  const startConversation = useCallback(async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const signedUrl = await getSignedUrl();
      await conversation.startSession({ signedUrl });
    } catch (error) {
      console.error('Failed to start conversation:', error);
    }
  }, [conversation]);

  const stopConversation = useCallback(async () => {
    await conversation.endSession();
  }, [conversation]);

  // Animated AI wave for speaking/listening (improved design)
  const AIWave = ({ active, speaking }: { active: boolean; speaking?: boolean }) => (
    <div className={`ai-wave-modern ${active ? 'active' : ''} ${speaking ? 'speaking' : ''}`} aria-label={active ? (speaking ? 'AI is speaking' : 'AI is listening') : 'AI is idle'}>
      <span className="ai-wave-bar" />
      <span className="ai-wave-bar" />
      <span className="ai-wave-bar" />
      <span className="ai-wave-bar" />
    </div>
  );

  // Mobile full-screen call mode
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 600;

  // Play ringing sound when AI button is clicked
  const handleOpen = () => {
    setOpen(true);
    setRinging(true);
    setCallAccepted(false);
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
    }, 100);
  };

  // Stop ringing when call is accepted or closed
  const stopRinging = () => {
    setRinging(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  // Accept call (simulate answering)
  const acceptCall = async () => {
    stopRinging();
    await startConversation();
    setCallAccepted(true);
  };

  if (isMobile && open) {
    const isConnected = conversation.status === 'connected';
    const isSpeaking = conversation.isSpeaking;
    return (
      <div className="ai-call-fullscreen ai-call-fullscreen-avatar-bg">
        <audio ref={audioRef} src="/public/song.mp3" loop style={{ display: 'none' }} />
        <div className="ai-call-avatar-bg">
          <img src={AGENT_AVATAR} alt="Agent" className="ai-call-avatar-bg-img" />
        </div>
        <button className="ai-call-close-btn" aria-label="Close" onClick={() => { setOpen(false); stopRinging(); }}>
          <svg width="32" height="32" fill="none" viewBox="0 0 24 24"><path stroke="#fff" strokeWidth="2" d="M6 6l12 12M6 18L18 6"/></svg>
        </button>
        {/* Ringing state: show answer button with animation */}
        {ringing && !callAccepted && (
          <div className="ai-call-action-center">
            <div className="ai-call-avatar-fg">
              <img src={AGENT_AVATAR} alt="Agent" className="ai-call-avatar-fg-img" />
            </div>
            <div className="ai-call-caller-name">Charlotte CRM</div>
            <div className="ai-call-caller-label">Incoming Call...</div>
            <button className="ai-call-btn ai-call-btn-answer ai-call-btn-animate" onClick={acceptCall} aria-label="Answer">
              <span className="ai-btn-glow" />
              <FiPhone size={32} />
            </button>
          </div>
        )}
        {/* Call accepted: show hangup at bottom, avatar full screen */}
        {callAccepted && (
          <div className="ai-call-in-progress">
            <div className="ai-call-caller-name ai-call-caller-name-inprogress">Charlotte CRM</div>
            <div className="ai-call-timer">{isConnected ? new Date().toLocaleTimeString([], { minute: '2-digit', second: '2-digit' }) : ''}</div>
            <div className="ai-call-controls-bottom">
              <button
                onClick={stopConversation}
                className="ai-call-btn ai-call-btn-red ai-call-btn-bottom"
                aria-label="Hang Up"
              >
                <span className="ai-btn-glow" />
                <FiPhoneOff size={32} />
              </button>
            </div>
          </div>
        )}
        <style jsx>{`
          .ai-call-fullscreen-avatar-bg {
            position: fixed;
            inset: 0;
            z-index: 2000;
            background: #000;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }
          .ai-call-avatar-bg {
            position: absolute;
            inset: 0;
            z-index: 1;
            width: 100vw;
            height: 100vh;
            overflow: hidden;
          }
          .ai-call-avatar-bg-img {
            width: 100vw;
            height: 100vh;
            object-fit: cover;
            filter: blur(0.5px) brightness(0.92);
          }
          .ai-call-close-btn {
            position: absolute;
            top: 24px;
            right: 24px;
            z-index: 10;
            background: rgba(0,0,0,0.18);
            border: none;
            border-radius: 50%;
            padding: 0.3rem;
            cursor: pointer;
            transition: background 0.15s;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .ai-call-close-btn:hover {
            background: rgba(0,0,0,0.32);
          }
          .ai-call-action-center {
            z-index: 2;
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }
          .ai-call-avatar-fg {
            width: 160px;
            height: 160px;
            border-radius: 50%;
            overflow: hidden;
            box-shadow: 0 0 32px 4px #0008, 0 0 0 8px #fff2;
            margin-bottom: 2.2rem;
            background: #fff;
          }
          .ai-call-avatar-fg-img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 50%;
          }
          .ai-call-caller-name {
            font-size: 2.1rem;
            font-weight: 700;
            color: #fff;
            text-shadow: 0 2px 16px #000a;
            margin-bottom: 0.5rem;
            letter-spacing: 0.01em;
            text-align: center;
          }
          .ai-call-caller-label {
            font-size: 1.1rem;
            color: #f3f4f6;
            margin-bottom: 2.2rem;
            text-align: center;
            font-weight: 500;
            letter-spacing: 0.01em;
          }
          .ai-call-btn-answer {
            background: linear-gradient(90deg, #22c55e 60%, #3b82f6 100%);
            color: #fff;
            border-radius: 50%;
            min-width: 80px;
            min-height: 80px;
            font-size: 2.2rem;
            display: flex;
            align-items: center;
            justify-content: center;
            border: none;
            box-shadow: 0 2px 24px #22c55e33;
            transition: transform 0.18s;
            animation: ai-pickup-animate 0.7s cubic-bezier(.5,1.8,.5,1);
          }
          .ai-call-btn-animate {
            animation: ai-pickup-animate 0.7s cubic-bezier(.5,1.8,.5,1);
          }
          @keyframes ai-pickup-animate {
            0% { transform: scale(0.7) translateY(60px); opacity: 0; }
            80% { transform: scale(1.1) translateY(-10px); opacity: 1; }
            100% { transform: scale(1) translateY(0); opacity: 1; }
          }
          .ai-btn-glow {
            position: absolute;
            left: 0; top: 0; right: 0; bottom: 0;
            border-radius: 50%;
            box-shadow: 0 0 32px 4px #22c55e55, 0 0 0 8px #fff2;
            opacity: 0.18;
            pointer-events: none;
          }
          .ai-call-in-progress {
            z-index: 2;
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-end;
            padding-bottom: 3.5rem;
          }
          .ai-call-caller-name-inprogress {
            margin-top: 2.5rem;
            font-size: 2.1rem;
            font-weight: 700;
            color: #fff;
            text-shadow: 0 2px 16px #000a;
            margin-bottom: 0.2rem;
            letter-spacing: 0.01em;
            text-align: center;
          }
          .ai-call-timer {
            font-size: 1.1rem;
            color: #f3f4f6;
            margin-bottom: 2.2rem;
            text-align: center;
            font-weight: 500;
            letter-spacing: 0.01em;
          }
          .ai-call-controls-bottom {
            width: 100vw;
            display: flex;
            justify-content: center;
            align-items: center;
            position: absolute;
            left: 0;
            bottom: 0;
            padding-bottom: 2.2rem;
            background: linear-gradient(180deg, transparent 60%, #000 100%);
          }
          .ai-call-btn-bottom {
            background: #000;
            color: #fff;
            border-radius: 50%;
            min-width: 80px;
            min-height: 80px;
            font-size: 2.2rem;
            display: flex;
            align-items: center;
            justify-content: center;
            border: none;
            box-shadow: 0 2px 24px #000a;
            margin-bottom: 0;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="ai-agent-floating-root">
      {/* Collapsed: Floating AI button */}
      {!open && (
        <button
          className="ai-agent-fab"
          onClick={handleOpen}
          aria-label="Open AI Agent Chat"
        >
          <span className="ai-avatar-glow">
            <img src={AGENT_AVATAR} alt="AI Agent" className="ai-avatar" />
            <span className="ai-badge-pulse" />
          </span>
          <span className="ai-fab-wave">
            <AIWave active={false} />
          </span>
        </button>
      )}
      {/* Expanded: Glassmorphic chat panel */}
      {open && (
        <div className="ai-agent-panel animate-fade-in">
          <div className="ai-agent-header">
            <div className="ai-header-avatar">
              <span className="ai-avatar-glow">
                <img src={AGENT_AVATAR} alt="AI Agent" className="ai-avatar" />
                <span className="ai-badge-pulse" />
              </span>
              <span className="ai-agent-title">Charlotte CRM</span>
            </div>
            <button onClick={() => setOpen(false)} className="ai-close-btn" aria-label="Close">
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" d="M6 6l12 12M6 18L18 6"/></svg>
            </button>
          </div>
          <div className="ai-agent-body">
            <div className="ai-agent-wave-outer">
              <AIWave active={conversation.isSpeaking || conversation.status === 'connected'} />
            </div>
            <div className="ai-agent-controls">
              <button
                onClick={startConversation}
                disabled={conversation.status === 'connected'}
                className="ai-btn ai-btn-start"
              >
                <span className="ai-btn-glow" />
                <span>Start Conversation</span>
              </button>
              <button
                onClick={stopConversation}
                disabled={conversation.status !== 'connected'}
                className="ai-btn ai-btn-stop"
              >
                <span className="ai-btn-glow" />
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FiPhoneOff size={18} style={{ marginRight: 4 }} />
                </span>
                {/* <span>Stop Conversation</span> */}
              </button>
            </div>
            <div className="ai-agent-status">
              <span className="ai-status-label">Status:</span> <span className="ai-status-value">{conversation.status}</span>
              <span className="ai-status-dot" data-active={conversation.status === 'connected'} />
            </div>
            <div className="ai-agent-status ai-agent-speaking">
              <span className="ai-status-label">Agent is</span> <span className="ai-status-value">{conversation.isSpeaking ? 'speaking' : 'listening'}</span>
            </div>
          </div>
        </div>
      )}
      <style jsx>{`
        .ai-agent-floating-root {
          position: fixed;
          bottom: 32px;
          right: 32px;
          z-index: 1000;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }
        .ai-agent-fab {
          background: rgba(255,255,255,0.15);
          box-shadow: 0 8px 32px 0 rgba(31,38,135,0.25);
          backdrop-filter: blur(12px);
          border-radius: 50%;
          border: 1.5px solid rgba(255,255,255,0.25);
          width: 72px;
          height: 72px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: box-shadow 0.2s, background 0.2s;
          position: relative;
          overflow: visible;
          animation: ai-fab-pop 0.7s cubic-bezier(.5,1.8,.5,1) 1;
        }
        .ai-agent-fab:hover {
          box-shadow: 0 0 0 4px #60a5fa44, 0 8px 32px 0 rgba(31,38,135,0.25);
          background: rgba(255,255,255,0.25);
        }
        @keyframes ai-fab-pop {
          0% { transform: scale(0.7); opacity: 0; }
          80% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); }
        }
        .ai-avatar-glow {
          position: relative;
          display: inline-block;
        }
        .ai-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          object-fit: cover;
          border: 2.5px solid #60a5fa;
          box-shadow: 0 0 16px 2px #60a5fa88, 0 0 0 4px #fff2;
          background: #fff;
          z-index: 2;
        }
        .ai-badge-pulse {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 16px;
          height: 16px;
          background: linear-gradient(135deg, #60a5fa, #a78bfa);
          border-radius: 50%;
          box-shadow: 0 0 8px 2px #60a5fa88;
          border: 2px solid #fff;
          z-index: 3;
          animation: ai-badge-pulse 1.5s infinite;
        }
        @keyframes ai-badge-pulse {
          0% { transform: scale(1); opacity: 1; }
          60% { transform: scale(1.4); opacity: 0.6; }
          100% { transform: scale(1); opacity: 1; }
        }
        .ai-fab-wave {
          position: absolute;
          left: 50%;
          top: 100%;
          transform: translate(-50%, 0);
          margin-top: 2px;
        }
        .ai-agent-panel {
          width: 370px;
          max-width: 95vw;
          min-height: 420px;
          background: rgba(255,255,255,0.22);
          box-shadow: 0 8px 32px 0 rgba(31,38,135,0.25);
          border-radius: 2rem;
          border: 1.5px solid rgba(255,255,255,0.25);
          backdrop-filter: blur(18px);
          display: flex;
          flex-direction: column;
          animation: ai-panel-in 0.5s cubic-bezier(.5,1.8,.5,1);
        }
        @keyframes ai-panel-in {
          0% { transform: translateY(40px) scale(0.95); opacity: 0; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        .ai-agent-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.1rem 1.5rem 1.1rem 1.2rem;
          border-bottom: 1.5px solid #e0e7ef44;
          background: rgba(255,255,255,0.12);
          border-top-left-radius: 2rem;
          border-top-right-radius: 2rem;
        }
        .ai-header-avatar {
          display: flex;
          align-items: center;
          gap: 0.7rem;
        }
        .ai-agent-title {
          font-weight: 700;
          font-size: 1.18rem;
          color: #2563eb;
          letter-spacing: 0.01em;
          text-shadow: 0 2px 8px #60a5fa22;
        }
        .ai-close-btn {
          background: none;
          border: none;
          color: #64748b;
          border-radius: 50%;
          padding: 0.3rem;
          transition: background 0.15s;
          cursor: pointer;
        }
        .ai-close-btn:hover {
          background: #e0e7ef33;
          color: #1e293b;
        }
        .ai-agent-body {
          flex: 1;
          padding: 1.5rem 1.2rem 1.2rem 1.2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.2rem;
        }
        .ai-agent-wave-outer {
          margin-bottom: 0.5rem;
        }
        .ai-wave {
          display: flex;
          gap: 0.18rem;
          height: 18px;
          align-items: flex-end;
        }
        .ai-wave span {
          display: block;
          width: 5px;
          height: 8px;
          border-radius: 3px;
          background: linear-gradient(135deg, #60a5fa 60%, #a78bfa 100%);
          opacity: 0.7;
          animation: ai-wave-idle 1.2s infinite ease-in-out;
        }
        .ai-wave span:nth-child(2) { animation-delay: 0.2s; }
        .ai-wave span:nth-child(3) { animation-delay: 0.4s; }
        .ai-wave span:nth-child(4) { animation-delay: 0.6s; }
        .ai-wave.active span {
          animation: ai-wave-active 0.7s infinite cubic-bezier(.5,1.8,.5,1);
        }
        @keyframes ai-wave-idle {
          0%,100% { height: 8px; }
          50% { height: 13px; }
        }
        @keyframes ai-wave-active {
          0%,100% { height: 8px; }
          30% { height: 18px; }
          60% { height: 10px; }
        }
        .ai-agent-controls {
          display: flex;
          gap: 1.1rem;
          margin-bottom: 0.5rem;
        }
        .ai-btn {
          position: relative;
          padding: 0.7rem 1.3rem;
          border-radius: 1.5rem;
          font-weight: 600;
          font-size: 1rem;
          border: none;
          outline: none;
          cursor: pointer;
          overflow: hidden;
          background: linear-gradient(90deg, #60a5fa 60%, #a78bfa 100%);
          color: #fff;
          box-shadow: 0 2px 12px #60a5fa22;
          transition: background 0.18s, box-shadow 0.18s, transform 0.12s;
        }
        .ai-btn:disabled {
          background: #e0e7ef;
          color: #a1a1aa;
          cursor: not-allowed;
          box-shadow: none;
        }
        .ai-btn-start:not(:disabled):hover {
          background: linear-gradient(90deg, #2563eb 60%, #a78bfa 100%);
          transform: scale(1.04);
        }
        .ai-btn-stop:not(:disabled) {
          background: linear-gradient(90deg, #f87171 60%, #a78bfa 100%);
        }
        .ai-btn-stop:not(:disabled):hover {
          background: linear-gradient(90deg, #dc2626 60%, #a78bfa 100%);
          transform: scale(1.04);
        }
        .ai-btn-glow {
          position: absolute;
          left: 0; top: 0; right: 0; bottom: 0;
          border-radius: 1.5rem;
          box-shadow: 0 0 16px 2px #60a5fa55, 0 0 0 4px #fff2;
          opacity: 0.18;
          pointer-events: none;
        }
        .ai-agent-status {
          font-size: 0.98rem;
          color: #334155;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .ai-status-label {
          font-weight: 500;
          color: #64748b;
        }
        .ai-status-value {
          font-weight: 600;
          color: #2563eb;
        }
        .ai-status-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #e0e7ef;
          margin-left: 0.5rem;
          box-shadow: 0 0 8px #60a5fa44;
          transition: background 0.2s;
        }
        .ai-status-dot[data-active='true'] {
          background: #60a5fa;
        }
        .ai-agent-speaking {
          margin-top: -0.3rem;
        }
        @media (max-width: 600px) {
          .ai-agent-panel { width: 98vw; min-width: 0; border-radius: 1.2rem; }
          .ai-agent-floating-root { right: 2vw; bottom: 2vw; }
        }
      `}</style>
    </div>
  );
}
