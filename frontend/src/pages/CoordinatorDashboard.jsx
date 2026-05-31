import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../contexts/AuthContext';
import { REPORTS, STATUS_COLOR, PRIORITY_COLOR, STATUS_FLOW } from '../data/mockData';
import { CheckCircle2, Clock, Filter, RefreshCw, Users, TrendingUp } from 'lucide-react';
import './Dashboard.css';

const STAFF = ['Ramesh Kumar', 'Suresh Patel', 'Lakshmi Devi', 'Vijay Singh', 'Meera Nair'];

// Removed mock ZONE_REPORTS

export default function CoordinatorDashboard() {
  const { user } = useAuth();
  const [reports, setReports]   = useState([]);
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
          id: `RPT-00${r.id}`,
          zone: 'Zone ' + r.location,
          desc: r.description,
          type: r.waste_type,
          date: new Date(r.created_at).toLocaleDateString(),
          status: r.status === 'resolved' ? 'Resolved' : r.status === 'reported' ? 'Reported' : r.status,
          photoUrl: r.photos && r.photos.length > 0 ? `http://localhost:8000${r.photos[0].url}` : null
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
  const [filter, setFilter]     = useState('All');
  const [sortPriority, setSort] = useState(false);
  const [assigned, setAssigned] = useState({});

  const filtered = reports.filter(r => filter === 'All' || r.status === filter);
  const sorted   = sortPriority ? [...filtered].sort((a, b) => {
    const p = { High: 0, Medium: 1, Low: 2 };
    return p[a.priority] - p[b.priority];
  }) : filtered;

  const updateStatus = (id, newStatus) => {
    setReports(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
  };

  const assignStaff = (id, staff) => {
    setAssigned(prev => ({ ...prev, [id]: staff }));
    updateStatus(id, 'Assigned to Staff');
  };

  const stats = {
    total:    reports.length,
    resolved: reports.filter(r => r.status === 'Resolved').length,
    active:   reports.filter(r => r.status !== 'Resolved').length,
    high:     reports.filter(r => r.priority === 'High').length,
  };

  const nextStatus = (current) => {
    const idx = STATUS_FLOW.indexOf(current);
    return idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1] : current;
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-header flex justify-between items-center">
          <div>
            <h1>🏫 Coordinator Dashboard</h1>
            <p>Zone: <strong style={{ color: 'var(--accent-green)' }}>{user?.zone}</strong> — Manage complaints & assign staff</p>
          </div>
          <div className="flex gap-3">
            <button className={`btn btn-sm ${sortPriority ? 'btn-primary' : 'btn-outline'}`} onClick={() => setSort(!sortPriority)} id="sort-priority">
              <TrendingUp size={15} /> Sort by Priority
            </button>
            <select className="input-field" style={{ padding: '8px 14px', width: 'auto', fontSize: '0.85rem' }}
              value={filter} onChange={e => setFilter(e.target.value)} id="coord-filter">
              <option value="All">All Status</option>
              {STATUS_FLOW.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid-4 mb-6">
          {[
            { label: 'Total in Zone', value: stats.total,    icon: '📋', color: '#3b82f6' },
            { label: 'Resolved',      value: stats.resolved, icon: '✅', color: '#10b981' },
            { label: 'Active',        value: stats.active,   icon: '🔄', color: '#f59e0b' },
            { label: 'High Priority', value: stats.high,     icon: '🚨', color: '#ef4444' },
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

        <div className="grid-2 mb-6" style={{ alignItems: 'start' }}>
          {/* Efficiency meter */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 className="text-lg font-semibold mb-4">Zone Efficiency</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                { label: 'Resolution Rate',   value: Math.round((stats.resolved / stats.total) * 100) || 0, color: 'var(--accent-green)' },
                { label: 'High Priority Cleared', value: 65, color: '#f87171' },
                { label: 'Avg. Response Time', value: 78, color: '#60a5fa' },
                { label: 'Staff Utilization', value: 82, color: '#a78bfa' },
              ].map((m, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span style={{ color: 'var(--text-secondary)' }}>{m.label}</span>
                    <span style={{ color: m.color, fontWeight: 700 }}>{m.value}%</span>
                  </div>
                  <div className="eff-bar-bg">
                    <div className="eff-bar-fill" style={{ width: `${m.value}%`, background: m.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Staff assignment panel */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Staff Roster</h3>
              <span className="badge badge-green">{STAFF.length} Available</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {STAFF.map((s, i) => {
                const tasksAssigned = Object.values(assigned).filter(a => a === s).length;
                return (
                  <div key={i} className="priority-row">
                    <div className="sidebar-avatar" style={{
                      background: `hsl(${i * 60}, 60%, 55%)`,
                      width: 32, height: 32, borderRadius: 8, fontSize: '0.7rem', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700
                    }}>
                      {s.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{s}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{tasksAssigned} tasks assigned</div>
                    </div>
                    <span className={`badge ${tasksAssigned > 0 ? 'badge-yellow' : 'badge-green'}`}>
                      {tasksAssigned > 0 ? 'Busy' : 'Free'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Complaints table */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Zone Complaints</h3>
            <span className="text-sm text-muted">{sorted.length} records</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th><th>Photo</th><th>Zone</th><th>Type</th><th>Description</th><th>Priority</th><th>Status</th><th>Assign Staff</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(r => (
                  <tr key={r.id}>
                    <td title={r.id}>{r.id}</td>
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
                    <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.desc}</td>
                    <td><span className={`badge ${PRIORITY_COLOR[r.priority]}`}>{r.priority}</span></td>
                    <td><span className={`badge ${STATUS_COLOR[r.status]}`} style={{ fontSize: '0.68rem' }}>{r.status}</span></td>
                    <td>
                      {r.status !== 'Resolved' ? (
                        <select
                          className="assign-select"
                          value={assigned[r.id] || ''}
                          onChange={e => assignStaff(r.id, e.target.value)}
                          id={`assign-${r.id}`}
                        >
                          <option value="">Assign staff...</option>
                          {STAFF.map(s => <option key={s}>{s}</option>)}
                        </select>
                      ) : <span className="text-accent text-xs">Completed</span>}
                    </td>
                    <td>
                      {r.status !== 'Resolved' && (
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => updateStatus(r.id, nextStatus(r.status))}
                          id={`advance-${r.id}`}
                        >
                          <RefreshCw size={13} /> Advance
                        </button>
                      )}
                    </td>
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
