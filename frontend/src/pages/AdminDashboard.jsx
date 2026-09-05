import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import Sidebar from '../components/Sidebar';
import { ZONES as MOCK_ZONES, STATUS_COLOR, PRIORITY_COLOR, STATUS_FLOW } from '../data/mockData';
import {
  Chart as ChartJS,
  ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement, Title
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import { Sparkles, RefreshCw, TrendingUp, TrendingDown, Minus, Download } from 'lucide-react';
import './Dashboard.css';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const TABS = ['Overview', 'Reports', 'Zones', 'Users', 'Analytics', 'Weekly AI Report'];

// Normalize DB status into chart categories
const getStatusCategory = (raw) => {
  const s = (raw || '').toLowerCase().replace(/\s+/g, '_');
  if (s === 'resolved') return 'resolved';
  if (['in_progress', 'assigned', 'cleaning_in_progress', 'assigned_to_staff'].includes(s)) return 'in_progress';
  return 'pending'; // reported, under_review, and any other open status
};

const formatDisplayStatus = (raw) => {
  const map = {
    resolved: 'Resolved',
    reported: 'Reported',
    under_review: 'Under Review',
    assigned: 'Assigned to Staff',
    in_progress: 'Cleaning in Progress',
  };
  return map[(raw || '').toLowerCase()] || raw;
};

// ── Severity badge helper ────────────────────────────────────────────────────
const SeverityBadge = ({ score }) => {
  if (!score) return <span className="badge" style={{ background: 'rgba(107,114,128,0.15)', color: '#9ca3af', fontSize: '0.68rem' }}>N/A</span>;
  const s = parseInt(score);
  if (s >= 9) return <span className="badge" style={{ background: 'rgba(220,38,38,0.15)', color: '#f87171', fontSize: '0.68rem' }}>🚨 Critical ({s})</span>;
  if (s >= 7) return <span className="badge" style={{ background: 'rgba(239,68,68,0.15)',  color: '#ef4444', fontSize: '0.68rem' }}>🔴 High ({s})</span>;
  if (s >= 4) return <span className="badge" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', fontSize: '0.68rem' }}>🟡 Medium ({s})</span>;
  return        <span className="badge" style={{ background: 'rgba(16,185,129,0.15)',  color: '#10b981', fontSize: '0.68rem' }}>🟢 Low ({s})</span>;
};

// ── Weekly report trend icon ─────────────────────────────────────────────────
const TrendIcon = ({ trend }) => {
  if (trend === 'Improving') return <TrendingUp  size={18} color="#10b981" />;
  if (trend === 'Worsening') return <TrendingDown size={18} color="#ef4444" />;
  return <Minus size={18} color="#f59e0b" />;
};

export default function AdminDashboard() {
  const [activeTab, setActiveTab]     = useState('Overview');
  const [reports,   setReports]       = useState([]);
  const [reportFilter, setFilter]     = useState('All');
  const [weeklyReport, setWeeklyReport] = useState(null);
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const token = localStorage.getItem('ecocampus_token');

  const [zones, setZones]             = useState([]);
  const [users, setUsers]             = useState([]);

  // ── Fetch live data ─────────────────────────────────────────────────────
  const fetchAllData = async () => {
    try {
      const [repRes, zoneRes, userRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/admin/reports?all=true`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/zones`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/admin/users`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      if (repRes.ok) {
        const data = await repRes.json();
        const mapped = data.reports.map(r => ({
          ...r,
          dbId:     r.id,
          id:       `RPT-00${r.id}`,
          reporter: r.student_name,
          zone:     r.zone_name || r.location || 'Campus',
          zoneId:   r.zone_id,
          desc:     r.description,
          type:     r.waste_type,
          date:     new Date(r.created_at).toLocaleDateString(),
          rawStatus: r.status,
          status:   formatDisplayStatus(r.status),
          photoUrl: r.photos?.length > 0 ? `${API_BASE_URL}${r.photos[0].url}` : null,
          aiWasteType:  r.photos?.[0]?.ai_waste_type  || r.waste_type || null,
          aiBinColor:   r.photos?.[0]?.ai_bin_color   || null,
          aiSeverity:   r.ai_severity,
          aiPriority:   r.ai_priority,
          aiTips:       r.photos?.[0]?.ai_tips        || null,
        }));
        setReports(mapped);
      }

      if (zoneRes.ok) {
        const data = await zoneRes.json();
        setZones(data.zones.map(z => ({
          ...z,
          icon: MOCK_ZONES.find(mz => mz.name === z.name)?.icon || '📍',
          total: parseInt(z.total_reports || 0),
          pending: parseInt(z.pending_reports || 0),
          resolved: parseInt(z.resolved_reports || 0),
          inProgress: parseInt(z.inprogress_reports || 0),
          awaiting: parseInt(z.awaiting_reports || 0),
        })));
      }

      if (userRes.ok) {
        const data = await userRes.json();
        setUsers(data.users.map(u => ({
          ...u,
          status: 'Active',
          joined: new Date(u.created_at).toLocaleDateString(),
          zone: 'All Zones'
        })));
      }
    } catch (err) { console.error('Failed to fetch admin data', err); }
  };

  // ── Fetch weekly AI report ─────────────────────────────────────────────────
  const fetchWeeklyReport = async (refresh = false) => {
    setWeeklyLoading(true);
    try {
      const url = `${API_BASE_URL}/api/admin/weekly-report${refresh ? '?refresh=true' : ''}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setWeeklyReport(data.report);
      }
    } catch (err) { console.error('Weekly report fetch error', err); }
    finally { setWeeklyLoading(false); }
  };

  useEffect(() => { fetchAllData(); }, [token]);

  useEffect(() => {
    if (activeTab === 'Weekly AI Report' && !weeklyReport) {
      fetchWeeklyReport();
    }
  }, [activeTab]);

  // ── Status change ──────────────────────────────────────────────────────────
  const handleStatusChange = async (dbId, newStatus) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/reports/${dbId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus.toLowerCase().replace(/\s+/g, '_') })
      });
      if (res.ok) fetchAllData();
    } catch (err) { console.error('Failed to update status', err); }
  };

  // ── Stats ──────────────────────────────────────────────────────────────────
  const statusCounts = reports.reduce((acc, r) => {
    const cat = getStatusCategory(r.rawStatus || r.status);
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, { resolved: 0, in_progress: 0, pending: 0 });

  const stats = {
    total:    reports.length,
    resolved: statusCounts.resolved,
    active:   statusCounts.pending + statusCounts.in_progress,
    pending:  statusCounts.pending,
    inProgress: statusCounts.in_progress,
    users:    users.length,
    rate:     reports.length > 0 ? Math.round((statusCounts.resolved / reports.length) * 100) : 0,
    avgSeverity: reports.length > 0
      ? (reports.reduce((sum, r) => sum + (r.aiSeverity || 5), 0) / reports.length).toFixed(1)
      : 'N/A',
    topWasteType: (() => {
      const counts = {};
      reports.forEach(r => { counts[r.aiWasteType || r.type || 'Unknown'] = (counts[r.aiWasteType || r.type || 'Unknown'] || 0) + 1; });
      return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
    })(),
    criticalCount: reports.filter(r => r.aiSeverity >= 9).length,
  };

  // ── Chart data ─────────────────────────────────────────────────────────────
  const doughnutData = {
    labels: ['Resolved', 'In Progress', 'Pending'],
    datasets: [{
      data: [statusCounts.resolved, statusCounts.in_progress, statusCounts.pending],
      backgroundColor: ['rgba(16,185,129,0.8)', 'rgba(59,130,246,0.8)', 'rgba(239,68,68,0.8)'],
      borderColor: ['#10b981', '#3b82f6', '#ef4444'],
      borderWidth: 2,
    }]
  };

  const barData = {
    labels: zones.map(z => z.name.split(' ')[0]),
    datasets: [
      { label: 'Resolved', data: zones.map(z => z.resolved), backgroundColor: 'rgba(16,185,129,0.75)', borderRadius: 6 },
      { label: 'In Progress', data: zones.map(z => z.inProgress || 0), backgroundColor: 'rgba(59,130,246,0.75)', borderRadius: 6 },
      { label: 'Pending', data: zones.map(z => z.awaiting || 0), backgroundColor: 'rgba(239,68,68,0.75)', borderRadius: 6 },
    ]
  };

  const chartOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#94a3b8', font: { size: 12 } } },
      tooltip: { backgroundColor: '#0a1628', borderColor: '#10b981', borderWidth: 1, titleColor: '#f0fdf4', bodyColor: '#94a3b8' }
    },
    scales: {
      x: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.05)' } },
      y: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.05)' } }
    }
  };

  const doughnutOptions = {
    responsive: true, maintainAspectRatio: false, cutout: '68%',
    plugins: {
      legend: { position: 'bottom', labels: { color: '#94a3b8', padding: 16, font: { size: 12 } } },
      tooltip: { backgroundColor: '#0a1628', borderColor: '#10b981', borderWidth: 1, titleColor: '#f0fdf4', bodyColor: '#94a3b8' }
    },
  };

  const filteredReports = reports.filter(r => reportFilter === 'All' || r.status === reportFilter);

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="admin-header-banner">
          <h1>🌿 Administration Panel</h1>
          <p>Smart Campus Garbage Monitoring System – Full System Control</p>
        </div>

        {/* Tabs */}
        <div className="tab-bar">
          {TABS.map(tab => (
            <button key={tab} className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)} id={`tab-${tab.toLowerCase().replace(/\s+/g, '-')}`}>
              {tab === 'Weekly AI Report' ? <><Sparkles size={13} /> {tab}</> : tab}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ─────────────────────────────────────────────────── */}
        {activeTab === 'Overview' && (
          <>
            {/* Stats row — now includes AI stats */}
            <div className="grid-4 mb-6">
              {[
                { label: 'Total Reports',    value: stats.total,        icon: '📋', color: '#3b82f6' },
                { label: 'Resolved',         value: stats.resolved,     icon: '✅', color: '#10b981' },
                { label: 'Active Issues',    value: stats.active,       icon: '🔄', color: '#f59e0b' },
                { label: '🚨 Critical',      value: stats.criticalCount, icon: '⚠️', color: '#ef4444' },
              ].map((s, i) => (
                <div key={i} className="glass-card stat-card animate-fade-in-up" style={{ animationDelay: `${i * 0.08}s` }}>
                  <div className="stat-icon" style={{ background: s.color + '22' }}>
                    <span style={{ fontSize: '1.3rem' }}>{s.icon}</span>
                  </div>
                  <div className="stat-value">{s.value}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
              ))}
            </div>

            {/* AI summary row */}
            <div className="grid-3 mb-6">
              {[
                { label: 'Resolution Rate',   value: `${stats.rate}%`,           icon: '📊', color: '#10b981' },
                { label: 'Avg AI Severity',   value: stats.avgSeverity,          icon: '🎯', color: '#8b5cf6' },
                { label: 'Top Waste Type',    value: stats.topWasteType,         icon: '♻️', color: '#3b82f6' },
              ].map((s, i) => (
                <div key={i} className="glass-card stat-card animate-fade-in-up" style={{ animationDelay: `${i * 0.12}s` }}>
                  <div className="stat-icon" style={{ background: s.color + '22' }}>
                    <span style={{ fontSize: '1.3rem' }}>{s.icon}</span>
                  </div>
                  <div className="stat-value" style={{ fontSize: '1.4rem' }}>{s.value}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="grid-2 mb-6">
              <div className="glass-card" style={{ padding: '24px' }}>
                <h3 className="text-lg font-semibold mb-4">Complaint Status Distribution</h3>
                <div style={{ height: '260px' }}>
                  <Doughnut
                    key={`donut-${statusCounts.resolved}-${statusCounts.in_progress}-${statusCounts.pending}`}
                    data={doughnutData}
                    options={doughnutOptions}
                  />
                </div>
                <div style={{ textAlign: 'center', marginTop: '12px' }}>
                  <span className="stat-value" style={{ fontSize: '1.4rem' }}>{stats.rate}%</span>
                  <span className="text-muted text-sm"> resolution rate</span>
                </div>
              </div>
              <div className="glass-card" style={{ padding: '24px' }}>
                <h3 className="text-lg font-semibold mb-4">Zone-wise Report Analysis</h3>
                <div style={{ height: '260px' }}>
                  <Bar
                    key={`bar-${zones.map(z => `${z.resolved}-${z.inProgress}-${z.awaiting}`).join('-')}`}
                    data={barData}
                    options={chartOptions}
                  />
                </div>
              </div>
            </div>

            {/* Recent activity with severity badges */}
            <div className="glass-card" style={{ padding: '24px' }}>
              <h3 className="text-lg font-semibold mb-4">Recent Activity (sorted by severity)</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {reports.slice(0, 6).map(r => (
                  <div key={r.id} className="priority-row">
                    {r.photoUrl ? (
                      <img src={r.photoUrl} alt="waste" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 36, height: 36, borderRadius: '6px', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>📋</div>
                    )}
                    <div style={{ flex: 1 }}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{r.id}</span>
                        <SeverityBadge score={r.aiSeverity} />
                        {r.aiWasteType && <span className="badge" style={{ background: 'rgba(139,92,246,0.12)', color: '#a78bfa', fontSize: '0.65rem' }}>♻️ {r.aiWasteType}</span>}
                        <span className={`badge ${STATUS_COLOR[r.status] || 'badge-gray'}`} style={{ fontSize: '0.65rem' }}>{r.status}</span>
                      </div>
                      <div className="text-sm text-secondary" style={{ marginTop: '2px' }}>
                        📍 {r.zone} • {r.reporter} • {r.date}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── REPORTS TAB ──────────────────────────────────────────────────── */}
        {activeTab === 'Reports' && (
          <div className="glass-card" style={{ padding: '24px' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">All Complaints <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>(sorted by AI severity)</span></h3>
              <select className="input-field" style={{ width: 'auto', padding: '8px 14px', fontSize: '0.85rem' }}
                value={reportFilter} onChange={e => setFilter(e.target.value)} id="admin-report-filter">
                <option value="All">All Status</option>
                {STATUS_FLOW.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th><th>Photo</th><th>Reporter</th><th>Zone</th>
                    <th>AI Type</th><th>AI Severity</th><th>Priority</th>
                    <th>Status</th><th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.map(r => (
                    <tr key={r.id}>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{r.id}</td>
                      <td>
                        {r.photoUrl ? (
                          <a href={r.photoUrl} target="_blank" rel="noreferrer">
                            <img src={r.photoUrl} alt="Waste" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '5px', border: '1px solid var(--glass-border)' }} />
                          </a>
                        ) : (
                          <div style={{ width: '40px', height: '40px', borderRadius: '5px', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', color: 'var(--text-muted)' }}>No photo</div>
                        )}
                      </td>
                      <td>{r.reporter}</td>
                      <td>📍 {r.zone}</td>
                      <td>
                        {r.aiWasteType
                          ? <span className="badge" style={{ background: 'rgba(139,92,246,0.12)', color: '#a78bfa', fontSize: '0.68rem' }}>♻️ {r.aiWasteType}</span>
                          : <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{r.type || '—'}</span>}
                      </td>
                      <td><SeverityBadge score={r.aiSeverity} /></td>
                      <td><span className={`badge ${PRIORITY_COLOR[r.priority] || 'badge-gray'}`}>{r.priority}</span></td>
                      <td>
                        <select className="input-field" style={{ padding: '4px 8px', fontSize: '0.75rem', height: 'auto', minHeight: 'auto' }}
                          value={r.status} onChange={e => handleStatusChange(r.dbId || r.id, e.target.value)}>
                          <option value="Reported">Reported</option>
                          <option value="under_review">Under Review</option>
                          <option value="in_progress">In Progress</option>
                          <option value="resolved">Resolved</option>
                        </select>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{r.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── ZONES TAB ────────────────────────────────────────────────────── */}
        {activeTab === 'Zones' && (
          <div className="grid-3 mb-6">
            {zones.map((z) => (
              <div key={z.id} className="glass-card" style={{ padding: '24px' }}>
                <div className="flex justify-between items-center mb-3">
                  <span style={{ fontSize: '2rem' }}>{z.icon}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{Math.round((z.resolved / z.total) * 100)}% resolved</span>
                </div>
                <h4 style={{ fontWeight: 700, marginBottom: '12px' }}>{z.name}</h4>
                <div className="zone-stats">
                  <div><span className="zone-stat-val text-accent">{z.resolved}</span><span className="zone-stat-label">Done</span></div>
                  <div><span className="zone-stat-val text-yellow">{z.awaiting || 0}</span><span className="zone-stat-label">Pending</span></div>
                  <div><span className="zone-stat-val text-blue">{z.inProgress || 0}</span><span className="zone-stat-label">In Progress</span></div>
                  <div><span className="zone-stat-val">{z.total}</span><span className="zone-stat-label">Total</span></div>
                </div>
                <div className="zone-bar-wrap" style={{ marginTop: '12px' }}>
                  <div className="zone-bar" style={{ width: `${(z.resolved / z.total) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── USERS TAB ────────────────────────────────────────────────────── */}
        {activeTab === 'Users' && (
          <div className="glass-card" style={{ padding: '24px' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Registered Users</h3>
              <span className="badge badge-green">{users.length} Total</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Points</th><th>Zone</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div style={{ width: 30, height: 30, borderRadius: 8, background: u.role === 'admin' ? '#6d28d9' : u.role === 'coordinator' ? '#1d4ed8' : '#065f46', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0 }}>
                            {u.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          {u.name}
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>{u.email}</td>
                      <td><span className={`role-badge role-${u.role}`}>{u.role === 'admin' ? '👑' : u.role === 'coordinator' ? '🏅' : '🎓'} {u.role}</span></td>
                      <td>
                        <span style={{ 
                          padding: '4px 10px', borderRadius: '20px',
                          background: 'rgba(16,185,129,0.12)', color: '#10b981',
                          fontWeight: 700, fontSize: '0.85rem'
                        }}>
                          {u.total_points || 0} pts
                        </span>
                      </td>
                      <td>📍 {u.zone}</td>
                      <td><span className={`badge ${u.status === 'Active' ? 'badge-green' : 'badge-red'}`}>{u.status}</span></td>
                      <td style={{ color: 'var(--text-muted)' }}>{u.joined}</td>
                      <td>
                        <div className="flex gap-2">
                          <button className="btn btn-ghost btn-sm" id={`edit-user-${u.id}`}>Edit</button>
                          {u.role !== 'admin' && <button className="btn btn-danger btn-sm" id={`disable-user-${u.id}`}>Disable</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── ANALYTICS TAB ────────────────────────────────────────────────── */}
        {activeTab === 'Analytics' && (
          <div>
            <div className="grid-2 mb-6">
              <div className="glass-card" style={{ padding: '24px' }}>
                <h3 className="text-lg font-semibold mb-4">Cleaning Efficiency by Zone</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {zones.map(z => {
                    const pct = Math.round((z.resolved / z.total) * 100);
                    return (
                      <div key={z.id}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{z.icon} {z.name}</span>
                          <span className="text-sm font-bold text-accent">{pct}%</span>
                        </div>
                        <div className="eff-bar-bg"><div className="eff-bar-fill" style={{ width: `${pct}%` }} /></div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="glass-card" style={{ padding: '24px' }}>
                <h3 className="text-lg font-semibold mb-4">AI-Detected Waste Types (Live)</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {(() => {
                    const counts = {};
                    reports.forEach(r => { const t = r.aiWasteType || r.type || 'Unknown'; counts[t] = (counts[t] || 0) + 1; });
                    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);
                    const max    = sorted[0]?.[1] || 1;
                    const colors = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6'];
                    return sorted.map(([type, count], i) => (
                      <div key={type} className="flex items-center gap-3">
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: colors[i % colors.length], flexShrink: 0 }} />
                        <span className="text-sm flex-1" style={{ color: 'var(--text-secondary)' }}>{type}</span>
                        <div className="eff-bar-bg" style={{ flex: 3 }}>
                          <div className="eff-bar-fill" style={{ width: `${(count / max) * 100}%`, background: colors[i % colors.length] }} />
                        </div>
                        <span className="text-sm font-bold" style={{ color: colors[i % colors.length], width: '20px', textAlign: 'right' }}>{count}</span>
                      </div>
                    ));
                  })()}
                  {reports.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No data yet.</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── WEEKLY AI REPORT TAB ──────────────────────────────────────────── */}
        {activeTab === 'Weekly AI Report' && (
          <div style={{ maxWidth: '860px' }}>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Sparkles size={18} color="#a78bfa" /> AI Weekly Campus Analysis
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '4px' }}>
                  Powered by Google Gemini · Auto-generated every Monday 8am
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  className={`btn btn-outline btn-sm ${weeklyLoading ? 'loading' : ''}`}
                  onClick={() => fetchWeeklyReport(true)}
                  disabled={weeklyLoading}
                  id="generate-weekly-report"
                >
                  <RefreshCw size={14} /> {weeklyLoading ? 'Generating...' : 'Generate Now'}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => window.print()} id="download-weekly-report">
                  <Download size={14} /> Download PDF
                </button>
              </div>
            </div>

            {weeklyLoading && !weeklyReport && (
              <div className="glass-card" style={{ padding: '48px', textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🤖</div>
                <div style={{ fontWeight: 600, color: '#a78bfa', marginBottom: '8px' }}>AI is analyzing this week's data...</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Fetching reports → analyzing patterns → generating insights</div>
                <div className="flex justify-center mt-4"><span className="spinner" style={{ borderColor: '#8b5cf6', borderTopColor: 'transparent' }} /></div>
              </div>
            )}

            {!weeklyLoading && !weeklyReport && (
              <div className="glass-card" style={{ padding: '48px', textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📊</div>
                <div style={{ fontWeight: 600, marginBottom: '8px' }}>No weekly report yet</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>Click "Generate Now" to create this week's AI analysis report.</div>
                <button className="btn btn-primary" onClick={() => fetchWeeklyReport(true)}>
                  <Sparkles size={14} /> Generate Weekly Report
                </button>
              </div>
            )}

            {weeklyReport && (() => {
              const ai  = weeklyReport.ai_analysis  || {};
              const raw = weeklyReport.report_data  || {};
              return (
                <>
                  {/* Period */}
                  <div className="glass-card" style={{ padding: '20px 24px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Report Period</div>
                      <div style={{ fontWeight: 700 }}>{weeklyReport.week_start} → {weeklyReport.week_end}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendIcon trend={ai.trend} />
                      <span style={{ fontWeight: 600, color: ai.trend === 'Improving' ? '#10b981' : ai.trend === 'Worsening' ? '#ef4444' : '#f59e0b' }}>
                        {ai.trend || 'Stable'}
                      </span>
                    </div>
                    <div className="flex gap-4">
                      {[
                        { label: 'Total Reports', value: raw.totalReports ?? ai.totalReportsThisWeek ?? '—' },
                        { label: 'Resolved', value: `${raw.resolvedPercentage ?? ai.resolvedPercentage ?? '—'}%` },
                      ].map((s, i) => (
                        <div key={i} style={{ textAlign: 'center' }}>
                          <div style={{ fontWeight: 700, fontSize: '1.3rem', color: 'var(--accent-green)' }}>{s.value}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Summary */}
                  {ai.summary && (
                    <div className="glass-card" style={{ padding: '20px 24px', marginBottom: '16px', borderLeft: '3px solid #8b5cf6' }}>
                      <div style={{ fontSize: '0.78rem', color: '#a78bfa', fontWeight: 600, marginBottom: '8px' }}>📝 AI SUMMARY</div>
                      <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '0.9rem' }}>{ai.summary}</p>
                    </div>
                  )}

                  <div className="grid-2 mb-4" style={{ gap: '16px' }}>
                    {/* Problematic Areas */}
                    {ai.topProblematicAreas?.length > 0 && (
                      <div className="glass-card" style={{ padding: '20px 24px' }}>
                        <div style={{ fontSize: '0.78rem', color: '#f87171', fontWeight: 600, marginBottom: '12px' }}>🔴 TOP PROBLEM AREAS</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {ai.topProblematicAreas.map((area, i) => (
                            <div key={i} className="flex items-center gap-3">
                              <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontWeight: 700, fontSize: '0.72rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{area}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recommendations */}
                    {ai.recommendations?.length > 0 && (
                      <div className="glass-card" style={{ padding: '20px 24px' }}>
                        <div style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 600, marginBottom: '12px' }}>✅ RECOMMENDATIONS</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {ai.recommendations.map((rec, i) => (
                            <div key={i} className="flex items-start gap-3">
                              <span style={{ color: '#10b981', flexShrink: 0, marginTop: '2px' }}>→</span>
                              <span style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{rec}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Urgent Areas */}
                  {ai.urgentAreas?.length > 0 && (
                    <div className="glass-card" style={{ padding: '20px 24px', marginBottom: '16px', background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.2)' }}>
                      <div style={{ fontSize: '0.78rem', color: '#f87171', fontWeight: 600, marginBottom: '10px' }}>🚨 URGENT — IMMEDIATE ATTENTION NEEDED</div>
                      <div className="flex gap-2 flex-wrap">
                        {ai.urgentAreas.map((area, i) => (
                          <span key={i} style={{ padding: '4px 12px', borderRadius: '20px', background: 'rgba(239,68,68,0.12)', color: '#f87171', fontSize: '0.8rem', fontWeight: 600 }}>
                            {area}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Student Engagement */}
                  {ai.studentEngagement && (
                    <div className="glass-card" style={{ padding: '16px 24px', background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.2)' }}>
                      <div style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 600, marginBottom: '6px' }}>🎓 STUDENT ENGAGEMENT</div>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.87rem' }}>{ai.studentEngagement}</p>
                    </div>
                  )}

                  {!ai.summary && (
                    <div className="glass-card" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      AI analysis unavailable — add GEMINI_API_KEY to backend/.env
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </main>
    </div>
  );
}
