import { useState, useEffect } from 'react';
import { Volume2, Square, Globe } from 'lucide-react';
import { speakText, stopSpeaking } from '../utils/voiceAssistant';

export default function VoiceAssistantButton({ 
  textEn = '', 
  textTe = '', 
  label = 'Voice', 
  defaultLang = 'te',
  className = ''
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentLang, setCurrentLang] = useState(defaultLang); // 'te' or 'en'

  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  const handleTogglePlay = (e) => {
    e.stopPropagation();
    if (isPlaying) {
      stopSpeaking();
      setIsPlaying(false);
      return;
    }

    const textToSpeak = currentLang === 'te' ? (textTe || textEn) : (textEn || textTe);
    if (!textToSpeak) return;

    speakText(
      textToSpeak,
      currentLang,
      () => setIsPlaying(true),
      () => setIsPlaying(false)
    );
  };

  const handleSelectLang = (e, lang) => {
    e.stopPropagation();
    if (currentLang === lang && isPlaying) return;

    stopSpeaking();
    setIsPlaying(false);
    setCurrentLang(lang);

    // Automatically speak in the selected language
    const textToSpeak = lang === 'te' ? (textTe || textEn) : (textEn || textTe);
    if (textToSpeak) {
      speakText(
        textToSpeak,
        lang,
        () => setIsPlaying(true),
        () => setIsPlaying(false)
      );
    }
  };

  return (
    <div 
      className={`voice-assistant-badge-btn ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: isPlaying ? 'rgba(16, 185, 129, 0.12)' : 'rgba(15, 23, 42, 0.75)',
        border: `1.5px solid ${isPlaying ? 'var(--accent-green, #10b981)' : 'rgba(255, 255, 255, 0.14)'}`,
        borderRadius: '24px',
        padding: '3px 4px 3px 10px',
        gap: '8px',
        fontSize: '0.78rem',
        boxShadow: isPlaying ? '0 0 16px rgba(16, 185, 129, 0.35)' : '0 2px 6px rgba(0,0,0,0.25)',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        userSelect: 'none',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)'
      }}
      title="Bilingual Voice Assistant (తెలుగు / English)"
    >
      {/* Voice Play / Stop Trigger */}
      <button
        type="button"
        onClick={handleTogglePlay}
        aria-label={isPlaying ? "Stop voice guidance" : "Listen in selected language"}
        style={{
          background: 'none',
          border: 'none',
          color: isPlaying ? '#34d399' : 'var(--text-primary, #f0fdf4)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          cursor: 'pointer',
          padding: '3px 0',
          fontWeight: 600,
          fontSize: '0.78rem'
        }}
      >
        {isPlaying ? (
          <>
            <Square size={13} fill="#ef4444" color="#ef4444" />
            <span style={{ color: '#f87171', fontWeight: 700 }}>
              {currentLang === 'te' ? 'ఆపండి (Stop)' : 'Stop'}
            </span>
            <span style={{
              display: 'inline-flex',
              gap: '2px',
              alignItems: 'center',
              marginLeft: '2px'
            }}>
              <span style={{ width: '3px', height: '10px', background: '#34d399', borderRadius: '2px', animation: 'voice-pulse 0.6s infinite alternate' }} />
              <span style={{ width: '3px', height: '16px', background: '#34d399', borderRadius: '2px', animation: 'voice-pulse 0.8s 0.2s infinite alternate' }} />
              <span style={{ width: '3px', height: '8px', background: '#34d399', borderRadius: '2px', animation: 'voice-pulse 0.5s 0.1s infinite alternate' }} />
            </span>
          </>
        ) : (
          <>
            <Volume2 size={15} color="#10b981" />
            <span style={{ color: 'var(--text-primary, #f0fdf4)' }}>{label}</span>
          </>
        )}
      </button>

      {/* Language Switcher Segmented Control */}
      <div 
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          background: 'rgba(0, 0, 0, 0.45)',
          borderRadius: '16px',
          padding: '2px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          gap: '2px'
        }}
      >
        {/* Telugu Option */}
        <button
          type="button"
          onClick={(e) => handleSelectLang(e, 'te')}
          title="Switch voice to Telugu (తెలుగు)"
          style={{
            background: currentLang === 'te' 
              ? 'linear-gradient(135deg, #10b981, #059669)' 
              : 'transparent',
            color: currentLang === 'te' ? '#ffffff' : 'rgba(240, 253, 244, 0.65)',
            border: 'none',
            borderRadius: '12px',
            padding: '2px 8px',
            fontSize: '0.72rem',
            fontWeight: currentLang === 'te' ? 700 : 500,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: currentLang === 'te' ? '0 1px 4px rgba(0,0,0,0.3)' : 'none'
          }}
        >
          తెలుగు
        </button>

        {/* English Option */}
        <button
          type="button"
          onClick={(e) => handleSelectLang(e, 'en')}
          title="Switch voice to English"
          style={{
            background: currentLang === 'en' 
              ? 'linear-gradient(135deg, #3b82f6, #2563eb)' 
              : 'transparent',
            color: currentLang === 'en' ? '#ffffff' : 'rgba(240, 253, 244, 0.65)',
            border: 'none',
            borderRadius: '12px',
            padding: '2px 8px',
            fontSize: '0.72rem',
            fontWeight: currentLang === 'en' ? 700 : 500,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: currentLang === 'en' ? '0 1px 4px rgba(0,0,0,0.3)' : 'none'
          }}
        >
          EN
        </button>
      </div>
    </div>
  );
}
