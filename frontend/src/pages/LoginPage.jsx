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
            <div className="auth-logo animate-float">
              <Recycle size={32} strokeWidth={1.5} />
            </div>
            <span className="auth-brand-name">EcoCampus</span>
          </div>
          <div className="auth-hero-text">
            <h1>Keep Your<br /><span className="gradient-text">Campus Clean.</span></h1>
            <p>Smart garbage monitoring &amp; real-time reporting system for a healthier, greener campus.</p>
          </div>
          <div className="auth-features">
            {[
              { icon: '🔑', text: 'Google Sign-In for Students' },
              { icon: '🔒', text: 'Secure Staff Dashboard' },
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

            {/* Tab switcher */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
              <button
                type="button"
                onClick={() => { setLoginType('student'); setError(''); }}
                className={`btn ${loginType === 'student' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ flex: 1 }}
                id="tab-student"
              >
                Student
              </button>
              <button
                type="button"
                onClick={() => { setLoginType('staff'); setError(''); }}
                className={`btn ${loginType === 'staff' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ flex: 1 }}
                id="tab-staff"
              >
                Staff Access
              </button>
            </div>

            <div className="auth-form-header" style={{ marginBottom: '20px' }}>
              <h2>Welcome Back</h2>
              <p>
                {loginType === 'student'
                  ? 'Sign in with your Google account'
                  : 'Sign in to access the staff portal'}
              </p>
            </div>

            {error && (
              <div className="auth-error" style={{ marginBottom: '16px' }}>
                <AlertTriangle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* ── STUDENT: Google login only ──────────────────────────────── */}
            {loginType === 'student' && (
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
                    navigate('/student');
                  }}
                  onError={(message) => setError(message)}
                />
              </div>
            )}

            {/* ── STAFF: Email + Password ─────────────────────────────────── */}
            {loginType === 'staff' && (
              <form onSubmit={handleStaffLogin} className="auth-form">
                <div style={{
                  padding: '10px 14px',
                  background: 'rgba(59,130,246,0.08)',
                  color: '#60a5fa',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  fontSize: '0.82rem',
                  textAlign: 'center',
                }}>
                  Demo: <strong>admin@campus.edu</strong> or <strong>coordinator@campus.edu</strong>
                  &nbsp;· password: <strong>demo1234</strong>
                </div>

                <div className="input-group">
                  <label className="input-label">Staff Email</label>
                  <div className="input-icon-wrap">
                    <Mail size={16} className="input-icon" />
                    <input
                      type="email"
                      className="input-field input-with-icon"
                      placeholder="admin@campus.edu"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      id="staff-email"
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">Password</label>
                  <div className="input-icon-wrap" style={{ position: 'relative' }}>
                    <Lock size={16} className="input-icon" />
                    <input
                      type={showPwd ? 'text' : 'password'}
                      className="input-field input-with-icon"
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      id="staff-password"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(p => !p)}
                      style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                    >
                      {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className={`btn btn-primary btn-full btn-lg auth-submit ${loading ? 'loading' : ''}`}
                  id="staff-login-btn"
                  disabled={loading}
                >
                  {loading ? <><span className="spinner" /> Signing In...</> : <>Staff Log In <ArrowRight size={18} /></>}
                </button>
              </form>
            )}

            <p className="auth-switch" style={{ marginTop: '24px' }}>
              By logging in, you agree to our Terms &amp; Privacy Policy
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
