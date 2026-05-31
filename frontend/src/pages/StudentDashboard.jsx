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
import usePoints from '../hooks/usePoints';
import './Dashboard.css';

// Removed mock MY_REPORTS and NOTIFICATIONS

export default function StudentDashboard() {
  const { user }  = useAuth();
  const navigate  = useNavigate();
  const { unreadCount, showToast } = useNotifications();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [loading, setLoading] = useState(true);
  const [myReports, setMyReports] = useState([]);
  const token = localStorage.getItem('eco_token');
  const { points } = usePoints(token);

  useEffect(() => {
    const fetchMyReports = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/reports/my', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          const mapped = data.reports.map(r => ({
            ...r,
            id: `RPT-00${r.id}`,
            zone: r.zone_name,
            desc: r.description,
            type: r.waste_type,
            date: new Date(r.created_at).toLocaleDateString(),
            status: r.status === 'resolved' ? 'Resolved' : r.status === 'reported' ? 'Reported' : r.status,
            photoUrl: r.photo_url ? `http://localhost:8000${r.photo_url}` : null
          }));
          setMyReports(mapped);
        }
      } catch (err) {
        console.error('Failed to fetch real reports', err);
      }
    };
    fetchMyReports();
    const t = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(t);
  }, [token]);

  const dynamicNotifications = myReports.slice(0, 3).map(r => ({
    id: r.id,
    message: `Your report ${r.id} status is now: ${r.status}`,
    time: r.date,
    read: true
  }));

  // Welcome toast on first load
  useEffect(() => {
    if (loading) return;
    const key = `welcomed_${user?.id}`;
    if (!sessionStorage.getItem(key)) {
      showToast({
        type: 'info',
        title: `Welcome back, ${user?.name?.split(' ')[0] || 'Student'}! 👋`,
        message: 'You have ' + (myReports.filter(r => r.status !== 'Resolved').length) + ' pending reports.',
        duration: 5000,
      });
      sessionStorage.setItem(key, '1');
    }
  }, [user, showToast, myReports, loading]);

  const filtered = myReports.filter(r => {
    const matchSearch = r.id.toLowerCase().includes(search.toLowerCase()) || r.zone.toLowerCase().includes(search.toLowerCase()) || r.desc.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'All' || r.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const latestReport = myReports[0];
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

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="glass-card" style={{ height: '180px', animation: 'pulse-glow 1.5s infinite' }} />
            <div className="grid-2" style={{ alignItems: 'start', gap: '24px' }}>
               <div className="glass-card" style={{ height: '240px', animation: 'pulse-glow 1.5s infinite' }} />
               <div className="glass-card" style={{ height: '240px', animation: 'pulse-glow 1.5s infinite' }} />
            </div>
            <div className="glass-card" style={{ height: '300px', animation: 'pulse-glow 1.5s infinite' }} />
          </div>
        ) : (
          <>
            {/* Gamification Stats */}
            <div className="glass-card mb-6" style={{ padding: '24px', background: 'linear-gradient(145deg, rgba(16,185,129,0.1), rgba(16,185,129,0.02))', border: '1px solid rgba(16,185,129,0.2)' }}>
           <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2"><Award className="text-accent" /> Achievement Dashboard</h3>
              <span className="badge badge-primary">Total Points: {points.total_points}</span>
           </div>
           <div className="grid-2 gap-4">
              {/* Daily Progress */}
              <div className="glass-card" style={{ padding: '16px', border: '1px solid rgba(59,130,246,0.3)' }}>
                 <div className="flex justify-between mb-2">
                    <span className="font-semibold flex items-center gap-2 text-sm"><Target size={14} className="text-blue" /> Daily Goal</span>
                    <span className="text-sm font-bold text-blue">{points.daily_earned} / {points.daily_limit} pts</span>
                 </div>
                 <div className="w-full bg-slate-800 rounded-full h-2.5 mb-2">
                   <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${(points.daily_earned / points.daily_limit) * 100}%`, background: 'var(--accent-blue)' }}></div>
                 </div>
                 <p className="text-xs text-muted text-right">{Math.max(0, points.daily_limit - points.daily_earned)} pts remaining today</p>
              </div>

              {/* Monthly Progress */}
              <div className="glass-card" style={{ padding: '16px', border: '1px solid rgba(139,92,246,0.3)' }}>
                 <div className="flex justify-between mb-2">
                    <span className="font-semibold flex items-center gap-2 text-sm"><Star size={14} className="text-purple" /> Monthly Goal</span>
                    <span className="text-sm font-bold text-purple">{points.monthly_earned} / {points.monthly_limit} pts</span>
                 </div>
                 <div className="w-full bg-slate-800 rounded-full h-2.5 mb-2">
                   <div className="bg-purple-600 h-2.5 rounded-full" style={{ width: `${(points.monthly_earned / points.monthly_limit) * 100}%`, background: 'var(--accent-purple)' }}></div>
                 </div>
                 <p className="text-xs text-muted text-right">{Math.max(0, points.monthly_limit - points.monthly_earned)} pts remaining this month</p>
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
                  {latestReport.photoUrl && (
                    <div style={{ marginTop: '12px' }}>
                      <a href={latestReport.photoUrl} target="_blank" rel="noreferrer">
                        <img src={latestReport.photoUrl} alt="Latest upload" style={{ width: '100px', height: '60px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--glass-border)' }} />
                      </a>
                    </div>
                  )}
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
              {dynamicNotifications.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No notifications yet</div>
              ) : dynamicNotifications.map(n => (
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
                  <th>ID</th><th>Photo</th><th>Zone</th><th>Type</th><th>Description</th><th>Status</th><th>Priority</th><th>Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px' }}>No uploads found</td></tr>
                ) : filtered.map(r => (
                  <tr key={r.id}>
                    <td>{r.id}</td>
                    <td>
                      {r.photoUrl ? (
                        <a href={r.photoUrl} target="_blank" rel="noreferrer">
                          <img src={r.photoUrl} alt="Waste" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--glass-border)' }} />
                        </a>
                      ) : (
                        <div style={{ width: '40px', height: '40px', background: 'var(--bg-secondary)', borderRadius: '4px', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: 'var(--text-muted)' }}>No photo</div>
                      )}
                    </td>
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
          </>
        )}
      </main>
    </div>
  );
}
