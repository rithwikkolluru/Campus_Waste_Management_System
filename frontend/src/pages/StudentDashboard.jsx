import { useState, useEffect, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config';
import { useNotifications } from '../contexts/NotificationContext';
import { STATUS_COLOR, PRIORITY_COLOR, STATUS_FLOW } from '../data/mockData';
import {
  AlertTriangle, CheckCircle2, Clock, TrendingUp,
  Plus, Bell, Search, ChevronRight, Star, Award, Target, ImageOff
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import usePoints from '../hooks/usePoints';
import NotificationBell from '../components/NotificationBell';
import './Dashboard.css';



export default function StudentDashboard() {
  const { user }  = useAuth();
  const navigate  = useNavigate();
  const { unreadCount, showToast, notifications } = useNotifications();
  const [campusAnnouncements, setCampusAnnouncements] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('ecocampus_token');
  const API_BASE = API_BASE_URL;
  const { points } = usePoints(token);

  const [myReports, setMyReports] = useState([]);

  const formatStatus = (status) => {
    const map = {
      resolved: 'Resolved',
      reported: 'Reported',
      under_review: 'Under Review',
      assigned: 'Assigned',
      in_progress: 'In Progress',
    };
    return map[status] || status;
  };

  const resolvePhotoUrl = (photoUrl, photos) => {
    const url = photoUrl || photos?.[0]?.url;
    if (!url) return null;
    return url.startsWith('http') ? url : `${API_BASE}${url}`;
  };

  const fetchMyReports = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/reports/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const mapped = data.reports.map(r => ({
          id: `RPT-00${r.id}`,
          dbId: r.id,
          zone: r.location || r.zone_name || 'General Ward',
          state: r.state || 'Telangana',
          district: r.district || 'Hyderabad',
          ward: r.ward_number || 'Ward 1',
          desc: r.description,
          type: r.waste_type,
          status: formatStatus(r.status),
          priority: r.priority ? r.priority.charAt(0).toUpperCase() + r.priority.slice(1) : 'Low',
          date: new Date(r.created_at).toLocaleDateString(),
          photoUrl: resolvePhotoUrl(r.photo_url, r.photos),
        }));
        setMyReports(mapped);
      }
    } catch (err) {
      console.error('Failed to fetch reports', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchMyReports();
    const interval = setInterval(fetchMyReports, 30000);
    return () => clearInterval(interval);
  }, [fetchMyReports]);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/announcements/active`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setCampusAnnouncements(data.announcements || []);
        }
      } catch (err) {
        console.error('Failed to fetch announcements', err);
      }
    };
    fetchAnnouncements();
    const interval = setInterval(fetchAnnouncements, 30000);
    return () => clearInterval(interval);
  }, [token]);

  // Welcome toast on first load
  useEffect(() => {
    const key = `welcomed_${user?.id}`;
    if (!sessionStorage.getItem(key)) {
      showToast({
        type: 'info',
        title: `Welcome back, ${user?.name?.split(' ')[0] || 'Citizen'}! 👋`,
        message: `You have ${myReports.filter(r => r.status !== 'Resolved').length} active reports in your district.`,
        duration: 5000,
      });
      sessionStorage.setItem(key, '1');
    }
  }, [user, showToast, myReports.length]);

  const filtered = myReports.filter(r => {
    const matchSearch = r.id.toLowerCase().includes(search.toLowerCase()) || 
      r.zone.toLowerCase().includes(search.toLowerCase()) || 
      (r.district && r.district.toLowerCase().includes(search.toLowerCase())) ||
      r.desc.toLowerCase().includes(search.toLowerCase());
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
        <div className="page-header page-header-mobile">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="badge badge-primary" style={{ fontSize: '0.72rem', padding: '3px 10px' }}>
                📍 {user?.district || 'Hyderabad'} District
              </span>
              <span className="badge" style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa', fontSize: '0.72rem', padding: '3px 10px' }}>
                🏛️ Citizen Portal
              </span>
            </div>
            <h1>👋 Hello, {user?.name?.split(' ')[0] || 'Citizen'}!</h1>
            <p>Report civic garbage spots to earn rewards &amp; keep your municipal ward clean.</p>
          </div>
          <div className="page-header-actions">
            <NotificationBell />
            <button className="btn btn-primary" onClick={() => navigate('/report')} id="quick-report-btn">
              <Plus size={18} /> Report Garbage (+15 pts)
            </button>
          </div>
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
              <div className="flex items-center gap-3">
                <span className="badge badge-primary">Total Points: {points.total_points}</span>
                <button className="btn btn-outline btn-sm" onClick={() => navigate('/achievements')}>View Rewards & Badges <ChevronRight size={14}/></button>
              </div>
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
                  <div className="flex justify-between items-center gap-3">
                    <div className="flex items-center gap-3">
                      {latestReport.photoUrl ? (
                        <img src={latestReport.photoUrl} alt="Report" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--glass-border)' }} />
                      ) : (
                        <div style={{ width: 40, height: 40, borderRadius: 6, background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--glass-border)' }}>
                          <ImageOff size={16} color="var(--text-muted)" />
                        </div>
                      )}
                      <span className="font-semibold">{latestReport.id}</span>
                    </div>
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
            {notifications.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No notifications yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {notifications.slice(0, 4).map(n => (
                  <div key={n.id} style={{
                    padding: '10px 12px', borderRadius: '8px',
                    background: n.read ? 'transparent' : 'rgba(59,130,246,0.08)',
                    border: `1px solid ${n.read ? 'var(--glass-border)' : 'rgba(59,130,246,0.2)'}`,
                    fontSize: '0.82rem',
                  }}>
                    <div style={{ fontWeight: 600, marginBottom: '2px' }}>{n.title}</div>
                    <div style={{ color: 'var(--text-secondary)', lineHeight: 1.4 }}>{n.message}</div>
                  </div>
                ))}
                <button className="btn btn-outline btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => navigate('/notifications')}>
                  View all
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Campus Announcements from coordinators */}
        {campusAnnouncements.length > 0 && (
          <div className="glass-card mb-6" style={{ padding: '24px' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">📢 Campus Announcements</h3>
              <span className="badge badge-blue">{campusAnnouncements.length} Active</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {campusAnnouncements.slice(0, 5).map(a => (
                <div key={a.id} style={{
                  padding: '14px 16px', borderRadius: '10px',
                  background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)',
                }}>
                  <div className="flex justify-between items-start gap-3 mb-1">
                    <strong style={{ fontSize: '0.9rem' }}>{a.title}</strong>
                    <span className="badge badge-ghost" style={{ fontSize: '0.65rem', textTransform: 'uppercase' }}>{a.zone_name}</span>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>{a.message}</p>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                    {new Date(a.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
                  <th>ID</th><th>Photo</th><th>District &amp; Ward</th><th>Type</th><th>Description</th><th>Status</th><th>Priority</th><th>Date</th>
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
                        <img
                          src={r.photoUrl}
                          alt="Upload"
                          style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--glass-border)' }}
                        />
                      ) : (
                        <div style={{
                          width: 40, height: 40, borderRadius: 4, background: 'var(--bg-card)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          border: '1px solid var(--glass-border)',
                        }}>
                          <ImageOff size={16} color="var(--text-muted)" />
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>📍 {r.district || 'Hyderabad'}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{r.ward || r.zone}</div>
                    </td>
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
