import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../contexts/AuthContext';
import { useEffect, useCallback } from 'react';
import { STATUS_COLOR, PRIORITY_COLOR, STATUS_FLOW } from '../data/mockData';

export default function CoordinatorDashboard() {
  const { user } = useAuth();
  const [reports, setReports]   = useState([]);
  const [staff, setStaff]       = useState([]);
  const [filter, setFilter]     = useState('All');
  const [sortPriority, setSort] = useState(false);
  const [assigned, setAssigned] = useState({});
  const token = localStorage.getItem('ecocampus_token');

  const fetchReports = useCallback(async () => {
    try {
      const zoneName = user?.zone || 'Campus';
      const res = await fetch(`http://localhost:8000/api/reports?zone=${encodeURIComponent(zoneName)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const mapped = data.reports.map(r => ({
          dbId: r.id,
          id: `RPT-00${r.id}`,
          zone: 'Zone ' + (r.location || r.zone_name),
          desc: r.description,
          type: r.waste_type,
          status: r.status === 'resolved' ? 'Resolved' : r.status === 'reported' ? 'Reported' : r.status,
          priority: r.priority || 'Low',
          date: new Date(r.created_at).toLocaleDateString()
        }));
        setReports(mapped);
      }
    } catch (err) {
      console.error(err);
    }
  }, [token, user?.zone]);

  const fetchStaff = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:8000/api/staff/all', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStaff(data.staff || []);
      }
    } catch (err) {
      console.error(err);
    }
  }, [token]);

  useEffect(() => {
    fetchReports();
    fetchStaff();
  }, [fetchReports, fetchStaff]);

  const filtered = reports.filter(r => filter === 'All' || r.status === filter);
  const sorted   = sortPriority ? [...filtered].sort((a, b) => {
    const p = { High: 0, Medium: 1, Low: 2 };
    return p[a.priority] - p[b.priority];
  }) : filtered;

  const assignStaffAction = async (id, staffName) => {
    setAssigned(prev => ({ ...prev, [id]: staffName }));
    const dbId = reports.find(r => r.id === id)?.dbId;
    if (!dbId) return;

    try {
      await fetch(`http://localhost:8000/api/reports/${dbId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: 'assigned', user_id: user.id })
      });
      fetchReports();
    } catch (err) {
      console.error(err);
    }
  };

  const advanceStatus = async (id, nextStat) => {
    const dbId = reports.find(r => r.id === id)?.dbId;
    if (!dbId) return;

    // Convert nextStat back to db format
    const dbStatus = nextStat === 'Resolved' ? 'resolved' :
                     nextStat === 'Cleaning in Progress' ? 'in_progress' :
                     nextStat === 'Assigned to Staff' ? 'assigned' :
                     nextStat === 'Under Review' ? 'under_review' : 'reported';

    try {
      await fetch(`http://localhost:8000/api/reports/${dbId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: dbStatus, user_id: user.id })
      });
      fetchReports();
    } catch (err) {
      console.error(err);
    }
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
              <span className="badge badge-green">{staff.length} Available</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {staff.map((s, i) => {
                const sName = s.name;
                const tasksAssigned = s.active_assignments || 0;
                return (
                  <div key={i} className="priority-row">
                    <div className="sidebar-avatar" style={{
                      background: `hsl(${i * 60}, 60%, 55%)`,
                      width: 32, height: 32, borderRadius: 8, fontSize: '0.7rem', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700
                    }}>
                      {sName.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{sName}</div>
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
                  <th>ID</th><th>Zone</th><th>Type</th><th>Description</th><th>Priority</th><th>Status</th><th>Assign Staff</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(r => (
                  <tr key={r.id}>
                    <td title={r.id}>{r.id}</td>
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
                          onChange={e => assignStaffAction(r.id, e.target.value)}
                          id={`assign-${r.id}`}
                        >
                          <option value="">Assign staff...</option>
                          {staff.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                        </select>
                      ) : <span className="text-accent text-xs">Completed</span>}
                    </td>
                    <td>
                      {r.status !== 'Resolved' && (
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => advanceStatus(r.id, nextStatus(r.status))}
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
