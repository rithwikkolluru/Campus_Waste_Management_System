import { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import { REPORTS, ZONES, USERS, STATUS_COLOR, PRIORITY_COLOR, STATUS_FLOW } from '../data/mockData';
import {
  Chart as ChartJS,
  ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement, Title
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import { Users as UsersIcon, MapPin, BarChart2, AlertTriangle, Trash2, CheckCircle2, Activity } from 'lucide-react';
import './Dashboard.css';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const TABS = ['Overview', 'Reports', 'Zones', 'Users', 'Analytics'];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('Overview');
  const [reports, setReports]     = useState(REPORTS);
  const [reportFilter, setFilter] = useState('All');
  const token = localStorage.getItem('eco_token');

  const fetchReports = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/admin/reports', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const mapped = data.reports.map(r => ({
          ...r,
          dbId: r.id,
          id: `RPT-00${r.id}`,
          reporter: r.student_name,
          zone: 'Zone ' + r.location,
          desc: r.description,
          type: r.waste_type,
          date: new Date(r.created_at).toLocaleDateString(),
          // Ensure status matches frontend capitalization
          status: r.status === 'resolved' ? 'Resolved' : r.status === 'reported' ? 'Reported' : r.status
        }));
        setReports(mapped);
      }
    } catch (err) {
      console.error('Failed to fetch real reports', err);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [token]);

  const handleStatusChange = async (dbId, newStatus) => {
    try {
      const mappedStatus = newStatus.toLowerCase();
      const res = await fetch(`http://localhost:8000/api/admin/reports/${dbId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: mappedStatus })
      });
      if (res.ok) {
        fetchReports();
      }
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  const stats = {
    total:    reports.length,
    resolved: reports.filter(r => r.status === 'Resolved').length,
    active:   reports.filter(r => !['Resolved'].includes(r.status)).length,
    users:    USERS.length,
    rate:     Math.round((reports.filter(r => r.status === 'Resolved').length / reports.length) * 100),
  };

  // Chart data
  const doughnutData = {
    labels: ['Resolved', 'In Progress', 'Pending'],
    datasets: [{
      data: [stats.resolved, reports.filter(r => r.status === 'Cleaning in Progress' || r.status === 'Assigned to Staff').length, reports.filter(r => r.status === 'Reported' || r.status === 'Under Review').length],
      backgroundColor: ['rgba(16,185,129,0.8)', 'rgba(59,130,246,0.8)', 'rgba(239,68,68,0.8)'],
      borderColor: ['#10b981', '#3b82f6', '#ef4444'],
      borderWidth: 2,
    }]
  };

  const barData = {
    labels: ZONES.map(z => z.name.split(' ')[0]),
    datasets: [
      { label: 'Resolved', data: ZONES.map(z => z.resolved), backgroundColor: 'rgba(16,185,129,0.75)', borderRadius: 6 },
      { label: 'Pending',  data: ZONES.map(z => z.pending),  backgroundColor: 'rgba(239,68,68,0.75)',  borderRadius: 6 },
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
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
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { color: '#94a3b8', padding: 16, font: { size: 12 } } },
      tooltip: { backgroundColor: '#0a1628', borderColor: '#10b981', borderWidth: 1, titleColor: '#f0fdf4', bodyColor: '#94a3b8' }
    },
    cutout: '68%',
  };

  const filteredReports = reports.filter(r => reportFilter === 'All' || r.status === reportFilter);

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        {/* Banner */}
        <div className="admin-header-banner">
          <h1>🌿 Administration Panel</h1>
          <p>Smart Campus Garbage Monitoring System – Full System Control</p>
        </div>

        {/* Tabs */}
        <div className="tab-bar">
          {TABS.map(tab => (
            <button
              key={tab}
              className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
              id={`tab-${tab.toLowerCase()}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === 'Overview' && (
          <>
            <div className="grid-4 mb-6">
              {[
                { label: 'Total Reports',  value: stats.total,    icon: '📋', color: '#3b82f6' },
                { label: 'Resolved',       value: stats.resolved, icon: '✅', color: '#10b981' },
                { label: 'Active Issues',  value: stats.active,   icon: '🔄', color: '#f59e0b' },
                { label: 'System Users',   value: stats.users,    icon: '👥', color: '#8b5cf6' },
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

            <div className="grid-2 mb-6">
              {/* Doughnut chart */}
              <div className="glass-card" style={{ padding: '24px' }}>
                <h3 className="text-lg font-semibold mb-4">Complaint Status Distribution</h3>
                <div className="chart-container" style={{ height: '260px' }}>
                  <Doughnut data={doughnutData} options={doughnutOptions} />
                </div>
                <div style={{ textAlign: 'center', marginTop: '12px' }}>
                  <span className="stat-value" style={{ fontSize: '1.4rem' }}>{stats.rate}%</span>
                  <span className="text-muted text-sm"> resolution rate</span>
                </div>
              </div>

              {/* Bar chart */}
              <div className="glass-card" style={{ padding: '24px' }}>
                <h3 className="text-lg font-semibold mb-4">Zone-wise Report Analysis</h3>
                <div style={{ height: '260px' }}>
                  <Bar data={barData} options={chartOptions} />
                </div>
              </div>
            </div>

            {/* Recent activity */}
            <div className="glass-card" style={{ padding: '24px' }}>
              <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {reports.slice(0, 5).map(r => (
                  <div key={r.id} className="priority-row">
                    <div style={{ fontSize: '1.2rem' }}>
                      {r.status === 'Resolved' ? '✅' : r.priority === 'High' ? '🔴' : r.priority === 'Medium' ? '🟡' : '🟢'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-sm">{r.id}</span>
                        <span className={`badge ${STATUS_COLOR[r.status]}`} style={{ fontSize: '0.65rem' }}>{r.status}</span>
                      </div>
                      <div className="text-sm text-secondary" style={{ marginTop: '2px' }}>
                        📍 {r.zone} • {r.reporter} • {r.date}
                      </div>
                    </div>
                    <span className={`badge ${PRIORITY_COLOR[r.priority]}`}>{r.priority}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* REPORTS TAB */}
        {activeTab === 'Reports' && (
          <div className="glass-card" style={{ padding: '24px' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">All Complaints</h3>
              <select className="input-field" style={{ width: 'auto', padding: '8px 14px', fontSize: '0.85rem' }}
                value={reportFilter} onChange={e => setFilter(e.target.value)} id="admin-report-filter">
                <option value="All">All Status</option>
                {STATUS_FLOW.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr><th>ID</th><th>Reporter</th><th>Zone</th><th>Type</th><th>Description</th><th>Priority</th><th>Status</th><th>Date</th></tr>
                </thead>
                <tbody>
                  {filteredReports.map(r => (
                    <tr key={r.id}>
                      <td>{r.id}</td>
                      <td>{r.reporter}</td>
                      <td>📍 {r.zone}</td>
                      <td>{r.type}</td>
                      <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.desc}</td>
                      <td><span className={`badge ${PRIORITY_COLOR[r.priority] || 'badge-gray'}`}>{r.priority}</span></td>
                      <td>
                        <select 
                          className="input-field" 
                          style={{ padding: '4px 8px', fontSize: '0.75rem', height: 'auto', minHeight: 'auto' }}
                          value={r.status}
                          onChange={(e) => handleStatusChange(r.dbId || r.id, e.target.value)}
                        >
                          <option value="Reported">Reported</option>
                          <option value="under_review">Under Review</option>
                          <option value="in_progress">In Progress</option>
                          <option value="resolved">Resolved</option>
                        </select>
                      </td>
                      <td>{r.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ZONES TAB */}
        {activeTab === 'Zones' && (
          <div>
            <div className="grid-3 mb-6" style={{ marginBottom: '24px' }}>
              {ZONES.map((z, i) => (
                <div key={z.id} className="glass-card" style={{ padding: '24px' }}>
                  <div className="flex justify-between items-center mb-3">
                    <span style={{ fontSize: '2rem' }}>{z.icon}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{Math.round((z.resolved / z.total) * 100)}% resolved</span>
                  </div>
                  <h4 style={{ fontWeight: 700, marginBottom: '12px' }}>{z.name}</h4>
                  <div className="zone-stats">
                    <div><span className="zone-stat-val text-accent">{z.resolved}</span><span className="zone-stat-label">Done</span></div>
                    <div><span className="zone-stat-val text-yellow">{z.pending}</span><span className="zone-stat-label">Pending</span></div>
                    <div><span className="zone-stat-val">{z.total}</span><span className="zone-stat-label">Total</span></div>
                  </div>
                  <div className="zone-bar-wrap" style={{ marginTop: '12px' }}>
                    <div className="zone-bar" style={{ width: `${(z.resolved / z.total) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* USERS TAB */}
        {activeTab === 'Users' && (
          <div className="glass-card" style={{ padding: '24px' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Registered Users</h3>
              <span className="badge badge-green">{USERS.length} Total</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr><th>Name</th><th>Email</th><th>Role</th><th>Zone</th><th>Status</th><th>Joined</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {USERS.map(u => (
                    <tr key={u.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div style={{
                            width: 30, height: 30, borderRadius: 8,
                            background: u.role === 'admin' ? '#6d28d9' : u.role === 'coordinator' ? '#1d4ed8' : '#065f46',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'white', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0
                          }}>
                            {u.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          {u.name}
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>{u.email}</td>
                      <td>
                        <span className={`role-badge role-${u.role}`}>
                          {u.role === 'admin' ? '👑' : u.role === 'coordinator' ? '🏅' : '🎓'} {u.role}
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

        {/* ANALYTICS TAB */}
        {activeTab === 'Analytics' && (
          <div>
            <div className="grid-2 mb-6">
              <div className="glass-card" style={{ padding: '24px' }}>
                <h3 className="text-lg font-semibold mb-4">Cleaning Efficiency by Zone</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {ZONES.map(z => {
                    const pct = Math.round((z.resolved / z.total) * 100);
                    return (
                      <div key={z.id}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{z.icon} {z.name}</span>
                          <span className="text-sm font-bold text-accent">{pct}%</span>
                        </div>
                        <div className="eff-bar-bg">
                          <div className="eff-bar-fill" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="glass-card" style={{ padding: '24px' }}>
                <h3 className="text-lg font-semibold mb-4">Waste Type Breakdown</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[
                    { type: 'Organic', count: 12, color: '#10b981' },
                    { type: 'Mixed',   count: 8,  color: '#3b82f6' },
                    { type: 'Plastic', count: 6,  color: '#f59e0b' },
                    { type: 'Paper',   count: 4,  color: '#8b5cf6' },
                    { type: 'E-Waste', count: 3,  color: '#ef4444' },
                  ].map(w => (
                    <div key={w.type} className="flex items-center gap-3">
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: w.color, flexShrink: 0 }} />
                      <span className="text-sm flex-1" style={{ color: 'var(--text-secondary)' }}>{w.type}</span>
                      <div className="eff-bar-bg" style={{ flex: 3 }}>
                        <div className="eff-bar-fill" style={{ width: `${(w.count / 12) * 100}%`, background: w.color }} />
                      </div>
                      <span className="text-sm font-bold" style={{ color: w.color, width: '20px', textAlign: 'right' }}>{w.count}</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: '24px', padding: '16px', borderRadius: 'var(--radius-md)', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
                  <div className="flex justify-between">
                    <span className="text-sm text-secondary">Overall Resolution Rate</span>
                    <span className="font-bold text-accent">{stats.rate}%</span>
                  </div>
                  <div className="eff-bar-bg" style={{ marginTop: '8px' }}>
                    <div className="eff-bar-fill" style={{ width: `${stats.rate}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Key metrics */}
            <div className="grid-4">
              {[
                { label: 'Avg Resolution Time', value: '2.3 days', icon: '⏱️', sub: 'per complaint' },
                { label: 'Most Active Zone',     value: 'Canteen',  icon: '📍', sub: '31 total reports' },
                { label: 'Top Reporter',         value: 'Canteen',  icon: '🏆', sub: 'Meena Patel' },
                { label: 'Cleanest Zone',        value: 'Library',  icon: '🌟', sub: '89% resolved' },
              ].map((m, i) => (
                <div key={i} className="glass-card stat-card">
                  <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.12)', fontSize: '1.3rem' }}>
                    <span>{m.icon}</span>
                  </div>
                  <div className="stat-value" style={{ fontSize: '1.3rem' }}>{m.value}</div>
                  <div className="stat-label">{m.label}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>{m.sub}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
