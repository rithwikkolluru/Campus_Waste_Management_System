import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Phone, CheckCircle, ArrowRight, Recycle, AlertTriangle, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import './AuthPages.css';

export default function LoginPage() {
  const [loginType, setLoginType] = useState('student'); // 'student' or 'staff'
  
  // Student State
  const [phone, setPhone]         = useState('');
  const [otp, setOtp]             = useState('');
  const [step, setStep]           = useState(1); // 1 = Phone, 2 = OTP
  const [sentOtpHint, setSentOtpHint] = useState('');
  const [isMock, setIsMock]       = useState(false);

  // Staff State
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPwd, setShowPwd]     = useState(false);

  // General State
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  const { requestOtp, login, loginStaff } = useAuth();
  const navigate                  = useNavigate();

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    
    // Exact 10 digit validation
    if (!phone || !/^\d{10}$/.test(phone)) { 
      setError('Please enter a valid 10-digit phone number.'); 
      return; 
    }
    
    setLoading(true);
    const result = await requestOtp(phone);
    setLoading(false);

    if (result.success) {
      setStep(2);
      setSentOtpHint(result.otpHint);
      setIsMock(result.mock || false);
    } else {
      setError(result.error || 'Failed to send OTP. Try again.');
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    if (!otp || otp.length < 4) { setError('Please enter the 4-digit OTP.'); return; }
    
    setLoading(true);
    const result = await login(phone, otp, isMock, sentOtpHint);
    setLoading(false);

    if (result.success) {
      const paths = { student: '/student', coordinator: '/coordinator', admin: '/admin' };
      navigate(paths[result.role] || '/student');
    } else {
      setError(result.error || 'Invalid OTP. Redirecting to phone entry...');
      // Reset after a tiny delay so the user sees the error gracefully, or immediately
      setOtp('');
      setTimeout(() => {
        setStep(1);
        setError('Please request a new OTP and try again.');
      }, 2000);
    }
  };

  const handleStaffLogin = async (e) => {
    e.preventDefault();
    setError('');
    if(!email || !password) { setError('Please fill in both email and password.'); return; }

    setLoading(true);
    const result = await loginStaff(email, password);
    setLoading(false);

    if (result.success) {
      const paths = { student: '/student', coordinator: '/coordinator', admin: '/admin' };
      navigate(paths[result.role] || '/student');
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
        <div className="auth-left">
          <div className="auth-brand">
            <div className="auth-logo animate-float">
              <Recycle size={32} strokeWidth={1.5} />
            </div>
            <span className="auth-brand-name">EcoCampus</span>
          </div>
          <div className="auth-hero-text">
            <h1>Keep Your<br /><span className="gradient-text">Campus Clean.</span></h1>
            <p>Smart garbage monitoring & real-time reporting system for a healthier, greener campus.</p>
          </div>
          <div className="auth-features">
            {[
              { icon: '📱', text: 'OTP Mobile Login (Students)' },
              { icon: '🔒', text: 'Secure Staff Dashboard' },
              { icon: '📸', text: 'Upload photos, earn points' },
              { icon: '🏆', text: 'Gamification & Rewards' },
            ].map((f, i) => (
              <div key={i} className="auth-feature-item">
                <span className="auth-feature-icon">{f.icon}</span>
                <span>{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="auth-right">
          <div className="glass-card auth-form-card">
            
            <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
              <button 
                type="button" 
                onClick={() => { setLoginType('student'); setError(''); setStep(1); }} 
                className={`btn ${loginType === 'student' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ flex: 1 }}
              >
                Student
              </button>
              <button 
                type="button" 
                onClick={() => { setLoginType('staff'); setError(''); }} 
                className={`btn ${loginType === 'staff' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ flex: 1 }}
              >
                Staff Access
              </button>
            </div>

            <div className="auth-form-header" style={{ marginBottom: '16px' }}>
              <h2>Welcome Back</h2>
              <p>
                {loginType === 'student' 
                  ? (step === 1 ? 'Sign in with your phone number' : 'Enter the OTP sent to your phone')
                  : 'Sign in to access the staff portal'
                }
              </p>
            </div>

            {error && (
              <div className="auth-error" style={{ marginBottom: '16px' }}>
                <AlertTriangle size={16} />
                <span>{error}</span>
              </div>
            )}

            {loginType === 'student' ? (
              <>
                {step === 2 && sentOtpHint && (
                  <div style={{ padding: '10px', background: 'rgba(0,255,0,0.1)', color: '#4ade80', borderRadius: '8px', marginBottom: '15px', fontSize: '0.9rem', textAlign: 'center' }}>
                    For demo purposes, your OTP is: <strong>{sentOtpHint}</strong>
                  </div>
                )}

                {step === 1 ? (
                  <form onSubmit={handleRequestOtp} className="auth-form">
                    <div className="input-group">
                      <label className="input-label">Phone Number</label>
                      <div className="input-icon-wrap">
                        <Phone size={16} className="input-icon" />
                        <input
                          type="tel"
                          maxLength="10"
                          className="input-field input-with-icon"
                          placeholder="Enter 10-digit mobile number"
                          value={phone}
                          onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                        />
                      </div>
                    </div>

                    <button type="submit" className={`btn btn-primary btn-full btn-lg auth-submit ${loading ? 'loading' : ''}`}>
                      {loading ? <><span className="spinner" />Sending...</> : <>Send OTP <ArrowRight size={18} /></>}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtp} className="auth-form">
                    <div className="input-group">
                      <label className="input-label">Enter 4-Digit OTP</label>
                      <div className="input-icon-wrap">
                        <CheckCircle size={16} className="input-icon" />
                        <input
                          type="text"
                          maxLength="4"
                          className="input-field input-with-icon"
                          placeholder="••••"
                          value={otp}
                          onChange={e => setOtp(e.target.value)}
                          style={{ letterSpacing: '0.5em', fontWeight: 'bold' }}
                        />
                      </div>
                    </div>

                    <button type="submit" className={`btn btn-primary btn-full btn-lg auth-submit ${loading ? 'loading' : ''}`}>
                      {loading ? <><span className="spinner" />Verifying...</> : <>Verify & Log In <ArrowRight size={18} /></>}
                    </button>
                    <div style={{marginTop: '1rem', textAlign: 'center'}}>
                      <button type="button" onClick={() => setStep(1)} style={{background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer'}}>
                        Change Phone Number
                      </button>
                    </div>
                  </form>
                )}
              </>
            ) : (
              <form onSubmit={handleStaffLogin} className="auth-form">
                <div style={{ padding: '10px', background: 'rgba(59,130,246,0.1)', color: '#60a5fa', borderRadius: '8px', marginBottom: '15px', fontSize: '0.85rem', textAlign: 'center' }}>
                  Demo: Use <strong>admin@campus.edu</strong> or <strong>coordinator@campus.edu</strong> with password <strong>demo1234</strong>
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
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">Password</label>
                  <div className="input-icon-wrap">
                    <Lock size={16} className="input-icon" />
                    <input
                      type={showPwd ? 'text' : 'password'}
                      className="input-field input-with-icon"
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                    />
                    <button type="button" className="pwd-toggle" onClick={() => setShowPwd(!showPwd)} style={{position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer'}}>
                      {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button type="submit" className={`btn btn-primary btn-full btn-lg auth-submit ${loading ? 'loading' : ''}`}>
                  {loading ? <><span className="spinner" />Signing In...</> : <>Staff Log In <ArrowRight size={18} /></>}
                </button>
              </form>
            )}

            <p className="auth-switch" style={{ marginTop: '24px' }}>
              By logging in, you agree to our Terms & Privacy Policy
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
