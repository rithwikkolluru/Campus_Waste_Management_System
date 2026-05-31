import { useEffect, useRef, useState } from 'react';

const GoogleLoginButton = ({ onSuccess, onError }) => {
  const buttonRef = useRef(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    // Check if already loaded
    if (window.google) {
      initGoogle();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => {
      setScriptLoaded(true);
      initGoogle();
    };
    script.onerror = () => {
      onError('Failed to load Google login. Check your internet connection.');
    };
    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  const initGoogle = () => {
    if (!window.google || !buttonRef.current) return;

    window.google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      callback: handleCredentialResponse,
      auto_select: false,
      cancel_on_tap_outside: false,
    });

    window.google.accounts.id.renderButton(buttonRef.current, {
      theme: 'outline',
      size: 'large',
      width: buttonRef.current.offsetWidth || 320,
      text: 'signin_with',
      shape: 'rectangular',
      logo_alignment: 'left',
    });
  };

  const handleCredentialResponse = async (response) => {
    try {
      const res = await fetch('http://localhost:8000/api/auth/google/student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
      });

      const data = await res.json();

      if (!res.ok) {
        onError(data.error || 'Login failed. Please try again.');
        return;
      }

      onSuccess(data);
    } catch (err) {
      console.error('Google login network error:', err);
      onError('Network error. Please check your connection and try again.');
    }
  };

  return (
    <div style={{ width: '100%', minHeight: '44px' }}>
      <div ref={buttonRef} style={{ display: 'flex', justifyContent: 'center' }} />
      {!scriptLoaded && (
        <div style={{
          textAlign: 'center',
          padding: '10px',
          fontSize: '14px',
          color: 'gray'
        }}>
          Loading Google login...
        </div>
      )}
    </div>
  );
};

export default GoogleLoginButton;
