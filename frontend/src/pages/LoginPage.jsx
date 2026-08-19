import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowRight, Recycle, AlertTriangle, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import './AuthPages.css';
import GoogleLoginButton from '../components/GoogleLoginButton';

export default function LoginPage() {
  const [loginType, setLoginType] = useState('student'); // 'student' or 'staff'

  // Staff state
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPwd,  setShowPwd]  = useState(false);

  // General state
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const { loginStaff, googleLogin } = useAuth();
  const navigate = useNavigate();

  const handleStaffLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Please fill in both email and password.'); return; }

    setLoading(true);
    const result = await loginStaff(email, password);
    setLoading(false);

    if (result.success) {
      const paths = { coordinator: '/coordinator', admin: '/admin' };
      navigate(paths[result.role] || '/admin');
    } else {
      setError(result.error || 'Invalid email or password.');
    }
  };

  return (
    <div className="auth-root">
      <div className="auth-bg">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
      </div>

      <div className="auth-container">
        {/* Left panel */}
        <div className="auth-left">
          <div className="auth-brand">
            <div className="auth-logo"><Recycle size={32} /></div>
            <div className="auth-brand-text">
              <span className="auth-brand-name">CleanGuard Campus</span>
            </div>
          </div>
          <h1>Welcome Back! 👋</h1>
          <div className="auth-hero-text">
            <h1>Keep Your<br /><span className="gradient-text">Campus Clean.</span></h1>
            <p>Smart garbage monitoring &amp; real-time reporting system for a healthier, greener campus.</p>
          </div>
          <div className="auth-features">
            {[
              { icon: '🔑', text: 'Google Sign-In for Students' },
              { icon: '🔒', text: 'Secure Dashboards' },
              { icon: '📸', text: 'Upload photos, earn points' },
              { icon: '🤖', text: 'AI-powered waste detection' },
            ].map((f, i) => (
              <div key={i} className="auth-feature-item">
                <span className="auth-feature-icon">{f.icon}</span>
                <span>{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel */}
        <div className="auth-right">
          <div className="glass-card auth-form-card">

            <div className="auth-form-header" style={{ marginBottom: '20px' }}>
              <h2>Welcome Back</h2>
              <p>Sign in with your Google account</p>
            </div>

            {error && (
              <div className="auth-error" style={{ marginBottom: '16px' }}>
                <AlertTriangle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* ── Google login only ──────────────────────────────── */}
            <div>
              <div style={{
                padding: '16px',
                background: 'rgba(16,185,129,0.06)',
                border: '1px solid rgba(16,185,129,0.2)',
                borderRadius: '10px',
                marginBottom: '20px',
                fontSize: '0.85rem',
                color: 'var(--text-secondary)',
                textAlign: 'center',
                lineHeight: 1.6,
              }}>
                🔑 Use your <strong>Google account</strong> to sign in.<br />
                Any Gmail account is accepted.
              </div>

              <GoogleLoginButton
                onSuccess={(data) => {
                  googleLogin(data.user, data.token);
                  // Optionally redirect based on role if needed, but default to student dashboard
                  const paths = { coordinator: '/coordinator', admin: '/admin', student: '/student' };
                  navigate(paths[data.user.role] || '/student');
                }}
                onError={(message) => setError(message)}
              />
            </div>

            <p className="auth-switch" style={{ marginTop: '24px' }}>
              By logging in, you agree to our Terms &amp; Privacy Policy
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
