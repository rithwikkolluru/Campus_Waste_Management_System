import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Recycle, AlertTriangle, GraduationCap, Shield, UserCheck, ArrowRight } from 'lucide-react';
import './AuthPages.css';

export default function LoginPage() {
  const [error, setError] = useState('');
  const [loadingRole, setLoadingRole] = useState(null); // 'student', 'coordinator', 'admin'

  const { loginStaff } = useAuth();
  const navigate = useNavigate();

  const handleQuickLogin = async (role) => {
    setError('');
    setLoadingRole(role);

    const credentials = {
      student: { email: 'student@campus.edu', password: 'demo1234' },
      coordinator: { email: 'coordinator@campus.edu', password: 'demo1234' },
      admin: { email: 'admin@campus.edu', password: 'demo1234' },
    };

    const target = credentials[role];
    if (!target) return;

    // Direct background staff login
    const result = await loginStaff(target.email, target.password);
    
    if (result.success) {
      const paths = { 
        student: '/student',
        coordinator: '/coordinator', 
        admin: '/admin' 
      };
      // Delay navigation slightly to let the loading animation look polished
      setTimeout(() => {
        setLoadingRole(null);
        navigate(paths[result.role] || '/student');
      }, 600);
    } else {
      setLoadingRole(null);
      setError(result.error || `Failed to log in as ${role}. Please ensure the backend is running.`);
    }
  };

  const rolesConfig = [
    {
      id: 'student',
      title: 'Student Portal',
      description: 'Report garbage issues, earn points, track achievements, and view leaderboard rankings.',
      icon: GraduationCap,
      colorClass: 'role-student-card',
      glowColor: '#34d399',
    },
    {
      id: 'coordinator',
      title: 'Zone Coordinator',
      description: 'Verify reports, manage dustbins, assign workers, and monitor specific campus zones.',
      icon: UserCheck,
      colorClass: 'role-coordinator-card',
      glowColor: '#60a5fa',
    },
    {
      id: 'admin',
      title: 'Administrator',
      description: 'Oversee entire campus, manage system alerts, add notifications, and control all users.',
      icon: Shield,
      colorClass: 'role-admin-card',
      glowColor: '#a78bfa',
    },
  ];

  return (
    <div className="auth-root">
      <div className="auth-bg">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
      </div>

      <div className="auth-container" style={{ gridTemplateColumns: '1fr', maxWidth: '900px', padding: '40px 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px', animation: 'fadeInUp 0.6s ease' }}>
          <div className="auth-brand" style={{ justifyContent: 'center', marginBottom: '16px' }}>
            <div className="auth-logo"><Recycle size={32} /></div>
            <div className="auth-brand-text">
              <span className="auth-brand-name">CleanGuard Campus</span>
            </div>
          </div>
          <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            System <span className="gradient-text">Quick Access Portal</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px', fontSize: '1rem', maxWidth: '600px', margin: '8px auto 0' }}>
            Select your desired role to log in instantly. The system will automatically configure a demo session and redirect you to the appropriate dashboard.
          </p>
        </div>

        {error && (
          <div className="auth-error" style={{ maxWidth: '600px', margin: '0 auto 24px', justifyContent: 'center' }}>
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', 
          gap: '24px', 
          width: '100%', 
          animation: 'fadeInUp 0.6s ease 0.15s both' 
        }}>
          {rolesConfig.map((role) => {
            const IconComponent = role.icon;
            const isThisLoading = loadingRole === role.id;
            const isAnyLoading = loadingRole !== null;

            return (
              <div
                key={role.id}
                onClick={() => !isAnyLoading && handleQuickLogin(role.id)}
                className={`glass-card role-card-item ${role.colorClass} ${isThisLoading ? 'active-loading' : ''} ${isAnyLoading && !isThisLoading ? 'disabled' : ''}`}
                style={{
                  padding: '30px 24px',
                  borderRadius: '20px',
                  cursor: isAnyLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'between',
                  height: '100%',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div className="role-icon-container" style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '20px',
                    background: `rgba(255, 255, 255, 0.03)`,
                    border: `1px solid rgba(255, 255, 255, 0.08)`,
                    transition: 'all 0.3s',
                  }}>
                    <IconComponent size={28} style={{ color: role.glowColor }} />
                  </div>

                  <h3 style={{ 
                    fontFamily: 'Space Grotesk, sans-serif', 
                    fontSize: '1.3rem', 
                    fontWeight: 700, 
                    marginBottom: '12px',
                    color: 'var(--text-primary)'
                  }}>
                    {role.title}
                  </h3>
                  
                  <p style={{ 
                    color: 'var(--text-secondary)', 
                    fontSize: '0.88rem', 
                    lineHeight: '1.6',
                    marginBottom: '24px'
                  }}>
                    {role.description}
                  </p>
                </div>

                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  fontWeight: 600, 
                  fontSize: '0.9rem',
                  color: role.glowColor,
                  marginTop: 'auto'
                }}>
                  {isThisLoading ? (
                    <>
                      <span className="spinner" style={{ borderTopColor: role.glowColor, width: '14px', height: '14px', marginRight: '6px' }} />
                      Logging in...
                    </>
                  ) : (
                    <>
                      Enter Dashboard <ArrowRight size={16} className="arrow-icon" style={{ transition: 'transform 0.2s' }} />
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
