import { useState, useEffect } from 'react';
import { Volume2, VolumeX, Globe } from 'lucide-react';
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

  const handleToggleLang = (e) => {
    e.stopPropagation();
    stopSpeaking();
    setIsPlaying(false);
    const nextLang = currentLang === 'te' ? 'en' : 'te';
    setCurrentLang(nextLang);

    // Automatically speak the new language when user switches
    const textToSpeak = nextLang === 'te' ? (textTe || textEn) : (textEn || textTe);
    if (textToSpeak) {
      speakText(
        textToSpeak,
        nextLang,
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
        background: isPlaying ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.06)',
        border: `1px solid ${isPlaying ? '#3b82f6' : 'rgba(255, 255, 255, 0.12)'}`,
        borderRadius: '20px',
        padding: '2px 8px 2px 6px',
        gap: '6px',
        fontSize: '0.75rem',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        userSelect: 'none'
      }}
      title="Tap to listen to this task hands-free"
    >
      {/* Voice Play/Stop Button */}
      <button
        type="button"
        onClick={handleTogglePlay}
        style={{
          background: 'none',
          border: 'none',
          color: isPlaying ? '#60a5fa' : 'var(--text-primary)',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          cursor: 'pointer',
          padding: 0
        }}
      >
        {isPlaying ? (
          <>
            <VolumeX size={14} color="#60a5fa" />
            <span style={{ color: '#60a5fa', fontWeight: 600 }}>ఆపండి (Stop)</span>
            <span className="speaking-wave" style={{
              display: 'inline-block',
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: '#60a5fa',
              animation: 'pulse 1s infinite'
            }} />
          </>
        ) : (
          <>
            <Volume2 size={14} color="#10b981" />
            <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
          </>
        )}
      </button>

      {/* Language Switcher Pill */}
      <button
        type="button"
        onClick={handleToggleLang}
        style={{
          background: 'rgba(255,255,255,0.1)',
          border: 'none',
          borderRadius: '10px',
          padding: '1px 6px',
          color: '#fbbf24',
          fontSize: '0.68rem',
          fontWeight: 700,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '2px'
        }}
        title="Switch between Telugu and English voice"
      >
        <Globe size={10} />
        {currentLang === 'te' ? 'తెలుగు' : 'EN'}
      </button>
    </div>
  );
}
