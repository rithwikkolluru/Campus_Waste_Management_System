import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { REPORTS, STATUS_COLOR, PRIORITY_COLOR, ZONES, STATUS_FLOW } from '../data/mockData';
import {
  AlertTriangle, CheckCircle2, Clock, TrendingUp,
  Plus, Bell, Search, ChevronRight, Star, Award, Target
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

const MY_REPORTS = REPORTS.filter(r => r.reporter === 'Arjun Sharma');

const NOTIFICATIONS = [
  { id: 1, message: 'Your report RPT-001 has been resolved ✅', time: '2h ago', read: false },
  { id: 2, message: 'Coordinator assigned staff to RPT-006',       time: '5h ago', read: false },
  { id: 3, message: 'Campus clean drive on Sat, 22 March',        time: '1d ago', read: true  },
];

export default function StudentDashboard() {
  const { user }  = useAuth();
  const navigate  = useNavigate();
  const { unreadCount, showToast } = useNotifications();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [userStats, setUserStats] = useState({
    total_points: 0, daily_points: 0, monthly_points: 0, max_daily: 50, max_monthly: 500
  });

  useEffect(() => {
    // Fetch Gamification stats
    const fetchStats = async () => {
      if(!user?.id) return;
      try {
        const res = await fetch(`http://localhost:8000/api/auth/stats/${user.id}`);
        const data = await res.json();
        if(data.status === 'success' && data.stats) {
          setUserStats(data.stats);
        }
      } catch(e) {
        console.warn('Failed to fetch stats, using mock', e);
        // Fallback for demo
        setUserStats({
          total_points: user.total_points || 15,
          daily_points: 15,
          monthly_points: 45,
          max_daily: 50,
          max_monthly: 500
        });
      }
    };
    fetchStats();
  }, [user]);

  // Welcome toast on first load
  useEffect(() => {
    const key = `welcomed_${user?.id}`;
    if (!sessionStorage.getItem(key)) {
      showToast({
        type: 'info',
        title: `Welcome back, ${user?.name?.split(' ')[0] || 'Student'}! 👋`,
        message: 'You have ' + (MY_REPORTS.filter(r => r.status !== 'Resolved').length) + ' pending reports.',
        duration: 5000,
      });
      sessionStorage.setItem(key, '1');
    }
  }, [user, showToast]);

  const filtered = MY_REPORTS.filter(r => {
    const matchSearch = r.id.toLowerCase().includes(search.toLowerCase()) || r.zone.toLowerCase().includes(search.toLowerCase()) || r.desc.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'All' || r.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const latestReport = MY_REPORTS[0];
  const statusIndex  = latestReport ? STATUS_FLOW.indexOf(latestReport.status) : 0;

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        {/* Header */}
        <div className="page-header flex justify-between items-center">
          <div>
            <h1>👋 Hello, {user?.name?.split(' ')[0] || 'Student'}!</h1>
            <p>Upload garbage photos to earn points and keep campus clean.</p>
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/report')} id="quick-report-btn">
            <Plus size={18} /> Upload Photo (+5 pts)
          </button>
        </div>

        {/* Gamification Stats */}
        <div className="glass-card mb-6" style={{ padding: '24px', background: 'linear-gradient(145deg, rgba(16,185,129,0.1), rgba(16,185,129,0.02))', border: '1px solid rgba(16,185,129,0.2)' }}>
           <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2"><Award className="text-accent" /> Achievement Dashboard</h3>
              <span className="badge badge-primary">Total Points: {userStats.total_points}</span>
           </div>
           <div className="grid-2 gap-4">
              {/* Daily Progress */}
              <div className="glass-card" style={{ padding: '16px', border: '1px solid rgba(59,130,246,0.3)' }}>
                 <div className="flex justify-between mb-2">
                    <span className="font-semibold flex items-center gap-2 text-sm"><Target size={14} className="text-blue" /> Daily Goal</span>
                    <span className="text-sm font-bold text-blue">{userStats.daily_points} / {userStats.max_daily} pts</span>
                 </div>
                 <div className="w-full bg-slate-800 rounded-full h-2.5 mb-2">
                   <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${(userStats.daily_points / userStats.max_daily) * 100}%`, background: 'var(--accent-blue)' }}></div>
                 </div>
                 <p className="text-xs text-muted text-right">{userStats.max_daily - userStats.daily_points} pts remaining today</p>
              </div>

              {/* Monthly Progress */}
              <div className="glass-card" style={{ padding: '16px', border: '1px solid rgba(139,92,246,0.3)' }}>
                 <div className="flex justify-between mb-2">
                    <span className="font-semibold flex items-center gap-2 text-sm"><Star size={14} className="text-purple" /> Monthly Goal</span>
                    <span className="text-sm font-bold text-purple">{userStats.monthly_points} / {userStats.max_monthly} pts</span>
                 </div>
                 <div className="w-full bg-slate-800 rounded-full h-2.5 mb-2">
                   <div className="bg-purple-600 h-2.5 rounded-full" style={{ width: `${(userStats.monthly_points / userStats.max_monthly) * 100}%`, background: 'var(--accent-purple)' }}></div>
                 </div>
                 <p className="text-xs text-muted text-right">{userStats.max_monthly - userStats.monthly_points} pts remaining this month</p>
              </div>
           </div>
        </div>

        <div className="grid-2 mb-6" style={{ alignItems: 'start' }}>
          {/* Complaint tracker */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Latest Upload Tracker</h3>
              <span className={`badge ${latestReport ? STATUS_COLOR[latestReport.status] : ''}`}>
                {latestReport?.status || 'No uploads'}
              </span>
            </div>
            {latestReport && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                  {STATUS_FLOW.map((step, i) => (
                    <div key={step} className="status-step">
                      <div className={`dot ${i < statusIndex ? 'done' : i === statusIndex ? 'active' : 'pending'}`}>
                        {i < statusIndex ? '✓' : i + 1}
                      </div>
                      <span style={{ fontSize: '0.65rem', maxWidth: '52px', lineHeight: 1.3 }}>{step}</span>
                      {i < STATUS_FLOW.length - 1 && (
                        <div style={{
                          position: 'absolute',
                          top: '18px',
                          left: '50%',
                          width: 'calc(100% - 36px)',
                          height: '2px',
                          background: i < statusIndex ? 'var(--accent-green)' : 'var(--glass-border)',
                          zIndex: 0
                        }} />
                      )}
                    </div>
                  ))}
                </div>
                <div className="report-mini-card">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">{latestReport.id}</span>
                    <span className={`badge ${PRIORITY_COLOR[latestReport.priority]}`}>{latestReport.priority}</span>
                  </div>
                  <p className="text-sm text-secondary" style={{ marginTop: '6px' }}>{latestReport.desc}</p>
                  <div className="flex gap-3 text-xs text-muted" style={{ marginTop: '8px' }}>
                    <span>📍 {latestReport.zone}</span>
                    <span>📅 {latestReport.date}</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Notifications */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Notifications</h3>
              <span className="badge badge-red">{unreadCount > 0 ? `${unreadCount} New` : 'Up to date'}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {NOTIFICATIONS.map(n => (
                <div key={n.id} className={`notif-item ${!n.read ? 'unread' : ''}`}>
                  <div className={`notif-dot ${!n.read ? 'notif-dot-active' : ''}`} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '0.85rem', lineHeight: 1.5 }}>{n.message}</p>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{n.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Complaint history */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">My Uploads</h3>
            <div className="flex gap-3 items-center">
              <div className="search-wrap">
                <Search size={14} className="search-icon" />
                <input
                  className="input-field search-input"
                  placeholder="Search uploads..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  id="report-search"
                />
              </div>
              <select className="input-field" style={{ width: 'auto', padding: '8px 12px', fontSize: '0.85rem' }}
                value={filterStatus} onChange={e => setFilterStatus(e.target.value)} id="status-filter">
                <option value="All">All Status</option>
                {STATUS_FLOW.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th><th>Zone</th><th>Type</th><th>Description</th><th>Status</th><th>Priority</th><th>Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px' }}>No uploads found</td></tr>
                ) : filtered.map(r => (
                  <tr key={r.id}>
                    <td>{r.id}</td>
                    <td>📍 {r.zone}</td>
                    <td>{r.type}</td>
                    <td style={{ maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.desc}</td>
                    <td><span className={`badge ${STATUS_COLOR[r.status]}`}>{r.status}</span></td>
                    <td><span className={`badge ${PRIORITY_COLOR[r.priority]}`}>{r.priority}</span></td>
                    <td>{r.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
