import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Recycle, User, Mail, Lock, Eye, EyeOff, ArrowRight, Phone, BookOpen } from 'lucide-react';
import './AuthPages.css';

const ZONES = ['Hostel Area', 'Academic Block', 'Library', 'Canteen', 'Parking Area'];

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', zone: '', role: 'student', password: '', confirm: '' });
  const [showPwd, setShowPwd]   = useState(false);
  const [errors, setErrors]     = useState({});
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(false);
  const navigate                = useNavigate();

  const validate = () => {
    const e = {};
    if (!form.name.trim())    e.name     = 'Name is required';
    if (!form.email.includes('@')) e.email = 'Valid email required';
    if (!form.zone)           e.zone     = 'Please select a zone';
    if (form.password.length < 6) e.password = 'Password must be 6+ characters';
    if (form.password !== form.confirm) e.confirm = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    setLoading(false);
    setSuccess(true);
    setTimeout(() => navigate('/login'), 2000);
  };

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  if (success) return (
    <div className="auth-root">
      <div className="auth-bg"><div className="blob blob-1" /><div className="blob blob-2" /></div>
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🎉</div>
        <h2 style={{ fontFamily: 'Space Grotesk', fontSize: '2rem', fontWeight: 800, color: 'var(--accent-green-light)' }}>Account Created!</h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>Redirecting you to login...</p>
      </div>
    </div>
  );

  return (
    <div className="auth-root">
      <div className="auth-bg">
        <div className="blob blob-1" /><div className="blob blob-2" /><div className="blob blob-3" />
      </div>
      <div className="auth-container" style={{ maxWidth: 1000 }}>
        <div className="auth-left">
          <div className="auth-brand">
            <div className="auth-logo animate-float"><Recycle size={32} strokeWidth={1.5} /></div>
            <span className="auth-brand-name">EcoCampus</span>
          </div>
          <div className="auth-hero-text">
            <h1>Join the<br /><span className="gradient-text">Green Movement.</span></h1>
            <p>Create your account and start contributing to a cleaner, smarter campus today.</p>
          </div>
          <div className="auth-features">
            {[
              { icon: '🌱', text: 'Report issues in seconds' },
              { icon: '📡', text: 'Real-time status updates' },
              { icon: '🏆', text: 'Earn eco-points for reports' },
              { icon: '🤝', text: 'Community-driven cleanliness' },
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
            <div className="auth-form-header">
              <h2>Create Account</h2>
              <p>Fill in your details to get started</p>
            </div>

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="grid-2" style={{ gap: '14px' }}>
                <div className="input-group">
                  <label className="input-label">Full Name</label>
                  <div className="input-icon-wrap">
                    <User size={16} className="input-icon" />
                    <input id="reg-name" type="text" className="input-field input-with-icon" placeholder="Your full name" value={form.name} onChange={set('name')} />
                  </div>
                  {errors.name && <span style={{ color: '#f87171', fontSize: '0.75rem' }}>{errors.name}</span>}
                </div>
                <div className="input-group">
                  <label className="input-label">Email Address</label>
                  <div className="input-icon-wrap">
                    <Mail size={16} className="input-icon" />
                    <input id="reg-email" type="email" className="input-field input-with-icon" placeholder="you@campus.edu" value={form.email} onChange={set('email')} />
                  </div>
                  {errors.email && <span style={{ color: '#f87171', fontSize: '0.75rem' }}>{errors.email}</span>}
                </div>
              </div>

              <div className="grid-2" style={{ gap: '14px' }}>
                <div className="input-group">
                  <label className="input-label">Phone Number</label>
                  <div className="input-icon-wrap">
                    <Phone size={16} className="input-icon" />
                    <input id="reg-phone" type="tel" className="input-field input-with-icon" placeholder="+91 9876543210" value={form.phone} onChange={set('phone')} />
                  </div>
                </div>
                <div className="input-group">
                  <label className="input-label">Role</label>
                  <div className="input-icon-wrap">
                    <BookOpen size={16} className="input-icon" />
                    <select id="reg-role" className="input-field input-with-icon gender-select" value={form.role} onChange={set('role')}>
                      <option value="student">Student</option>
                      <option value="coordinator">Zone Coordinator</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Campus Zone</label>
                <select id="reg-zone" className="input-field gender-select" value={form.zone} onChange={set('zone')}>
                  <option value="">Select your zone...</option>
                  {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
                </select>
                {errors.zone && <span style={{ color: '#f87171', fontSize: '0.75rem' }}>{errors.zone}</span>}
              </div>

              <div className="grid-2" style={{ gap: '14px' }}>
                <div className="input-group">
                  <label className="input-label">Password</label>
                  <div className="input-icon-wrap">
                    <Lock size={16} className="input-icon" />
                    <input id="reg-password" type={showPwd ? 'text' : 'password'} className="input-field input-with-icon input-with-toggle" placeholder="Min. 6 characters" value={form.password} onChange={set('password')} />
                    <button type="button" className="pwd-toggle" onClick={() => setShowPwd(!showPwd)}>
                      {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.password && <span style={{ color: '#f87171', fontSize: '0.75rem' }}>{errors.password}</span>}
                </div>
                <div className="input-group">
                  <label className="input-label">Confirm Password</label>
                  <div className="input-icon-wrap">
                    <Lock size={16} className="input-icon" />
                    <input id="reg-confirm" type="password" className="input-field input-with-icon" placeholder="Repeat password" value={form.confirm} onChange={set('confirm')} />
                  </div>
                  {errors.confirm && <span style={{ color: '#f87171', fontSize: '0.75rem' }}>{errors.confirm}</span>}
                </div>
              </div>

              <button type="submit" id="reg-submit" className={`btn btn-primary btn-full btn-lg auth-submit ${loading ? 'loading' : ''}`}>
                {loading ? <><span className="spinner" />Creating Account...</> : <>Create Account <ArrowRight size={18} /></>}
              </button>
            </form>

            <p className="auth-switch">
              Already have an account? <Link to="/login" className="auth-link">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
