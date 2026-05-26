import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import { useNotifications } from '../contexts/NotificationContext';
import {
  Bell, BellOff, BellRing, Check, CheckCheck,
  Trash2, Filter, RefreshCw, X, Mail, Smartphone, Monitor
} from 'lucide-react';
import './NotificationsPage.css';
import './Dashboard.css';

const CATEGORIES = ['All', 'report', 'assignment', 'status', 'system'];
const CAT_LABELS = { All: 'All', report: 'Reports', assignment: 'Assignments', status: 'Status Updates', system: 'System' };
const CAT_ICONS  = { All: '🔔', report: '📋', assignment: '👷', status: '🔄', system: '📢' };

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

const TYPE_DOT = {
  success: '#10b981',
  info:    '#3b82f6',
  warning: '#f59e0b',
  error:   '#ef4444',
};

export default function NotificationsPage() {
  const {
    notifications, unreadCount,
    markRead, markAllRead, deleteNotification, clearAll,
  } = useNotifications();

  const [activeCategory, setCategory] = useState('All');
  const [showUnreadOnly, setUnreadOnly] = useState(false);
  const [emailNotifs, setEmail]         = useState(true);
  const [pushNotifs, setPush]           = useState(true);
  const [activeView, setView]           = useState('inbox'); // 'inbox' | 'settings'

  const filtered = notifications.filter(n => {
    const catMatch    = activeCategory === 'All' || n.category === activeCategory;
    const unreadMatch = !showUnreadOnly || !n.read;
    return catMatch && unreadMatch;
  });

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        {/* Header */}
        <div className="page-header flex justify-between items-center">
          <div>
            <h1>🔔 Notification Center</h1>
            <p>Stay updated on your campus garbage reports and system alerts</p>
          </div>
          <div className="flex gap-3">
            <div className="tab-bar" style={{ marginBottom: 0 }}>
              <button className={`tab-btn ${activeView === 'inbox' ? 'active' : ''}`} onClick={() => setView('inbox')} id="notif-inbox-tab">
                Inbox
              </button>
              <button className={`tab-btn ${activeView === 'settings' ? 'active' : ''}`} onClick={() => setView('settings')} id="notif-settings-tab">
                Preferences
              </button>
            </div>
          </div>
        </div>

        {activeView === 'inbox' ? (
          <div className="notif-layout">
            {/* Left sidebar – filters */}
            <div className="notif-filters">
              <div className="glass-card" style={{ padding: '20px' }}>
                <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  Categories
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {CATEGORIES.map(cat => {
                    const count = cat === 'All'
                      ? notifications.filter(n => !n.read).length
                      : notifications.filter(n => n.category === cat && !n.read).length;
                    return (
                      <button
                        key={cat}
                        className={`notif-cat-btn ${activeCategory === cat ? 'active' : ''}`}
                        onClick={() => setCategory(cat)}
                        id={`cat-${cat}`}
                      >
                        <span>{CAT_ICONS[cat]}</span>
                        <span style={{ flex: 1, textAlign: 'left' }}>{CAT_LABELS[cat]}</span>
                        {count > 0 && <span className="notif-cat-count">{count}</span>}
                      </button>
                    );
                  })}
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: '16px 0' }} />

                {/* Quick actions */}
                <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  Quick Actions
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <button className="btn btn-outline btn-sm w-full" style={{ justifyContent: 'flex-start', gap: '8px' }}
                    onClick={markAllRead} id="mark-all-read">
                    <CheckCheck size={14} /> Mark all as read
                  </button>
                  <button className="btn btn-ghost btn-sm w-full" style={{ justifyContent: 'flex-start', gap: '8px' }}
                    onClick={() => setUnreadOnly(!showUnreadOnly)} id="toggle-unread">
                    {showUnreadOnly ? <BellRing size={14} /> : <BellOff size={14} />}
                    {showUnreadOnly ? 'Show all' : 'Unread only'}
                  </button>
                  <button className="btn btn-danger btn-sm w-full" style={{ justifyContent: 'flex-start', gap: '8px' }}
                    onClick={clearAll} id="clear-all-notifs">
                    <Trash2 size={14} /> Clear all
                  </button>
                </div>
              </div>

              {/* Summary card */}
              <div className="glass-card" style={{ padding: '20px', marginTop: '16px' }}>
                <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  Summary
                </h3>
                {[
                  { label: 'Total', value: notifications.length, color: 'var(--text-primary)' },
                  { label: 'Unread', value: unreadCount, color: '#f87171' },
                  { label: 'Read', value: notifications.length - unreadCount, color: '#10b981' },
                ].map((s, i) => (
                  <div key={i} className="flex justify-between items-center" style={{ padding: '6px 0', borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                    <span className="text-sm text-secondary">{s.label}</span>
                    <span style={{ fontWeight: 700, color: s.color, fontFamily: 'Space Grotesk' }}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right – notification list */}
            <div className="notif-list-wrap">
              {/* Toolbar */}
              <div className="notif-toolbar">
                <span className="text-sm text-muted">
                  {filtered.length} notification{filtered.length !== 1 ? 's' : ''}
                  {showUnreadOnly ? ' (unread only)' : ''}
                  {activeCategory !== 'All' ? ` in ${CAT_LABELS[activeCategory]}` : ''}
                </span>
                <div className="flex gap-2">
                  {unreadCount > 0 && (
                    <span className="badge badge-red">{unreadCount} Unread</span>
                  )}
                </div>
              </div>

              {filtered.length === 0 ? (
                <div className="notif-empty">
                  <div style={{ fontSize: '3rem', marginBottom: '12px' }}>
                    {showUnreadOnly ? '🎉' : '📭'}
                  </div>
                  <h3>{showUnreadOnly ? 'All caught up!' : 'No notifications'}</h3>
                  <p>{showUnreadOnly ? 'No unread notifications.' : 'Nothing to show in this category.'}</p>
                  {showUnreadOnly && (
                    <button className="btn btn-outline btn-sm" style={{ marginTop: '12px' }}
                      onClick={() => setUnreadOnly(false)}>Show all notifications</button>
                  )}
                </div>
              ) : (
                <div className="notif-list">
                  {filtered.map((n, i) => (
                    <div
                      key={n.id}
                      className={`notif-card glass-card ${!n.read ? 'unread' : ''}`}
                      style={{ animationDelay: `${i * 0.04}s` }}
                    >
                      <div className="notif-card-icon">
                        <span>{n.icon}</span>
                        <div className="notif-type-dot" style={{ background: TYPE_DOT[n.type] || '#3b82f6' }} />
                      </div>
                      <div className="notif-card-body">
                        <div className="notif-card-header">
                          <div>
                            <span className="notif-card-title">{n.title}</span>
                            <span className={`badge badge-${n.type === 'success' ? 'green' : n.type === 'error' ? 'red' : n.type === 'warning' ? 'yellow' : 'blue'}`} style={{ marginLeft: '8px', fontSize: '0.65rem' }}>
                              {CAT_LABELS[n.category] || n.category}
                            </span>
                          </div>
                          <span className="notif-card-time">{timeAgo(n.time)}</span>
                        </div>
                        <p className="notif-card-msg">{n.message}</p>
                      </div>
                      <div className="notif-card-actions">
                        {!n.read && (
                          <button
                            className="notif-action-btn"
                            onClick={() => markRead(n.id)}
                            title="Mark as read"
                            id={`read-${n.id}`}
                          >
                            <Check size={14} />
                          </button>
                        )}
                        <button
                          className="notif-action-btn notif-action-delete"
                          onClick={() => deleteNotification(n.id)}
                          title="Delete"
                          id={`delete-${n.id}`}
                        >
                          <X size={14} />
                        </button>
                      </div>
                      {!n.read && <div className="notif-unread-bar" />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ─── Notification Preferences ─────────────────────────────── */
          <div style={{ maxWidth: '700px' }}>
            <div className="glass-card" style={{ padding: '32px', marginBottom: '20px' }}>
              <h3 className="text-lg font-semibold mb-2">Notification Methods</h3>
              <p className="text-sm text-muted mb-6">Choose how you want to receive notifications.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[
                  { key: 'inapp', icon: <Monitor size={20} />, label: 'In-App Alerts', desc: 'Real-time pop-up alerts inside the dashboard', value: true, locked: true },
                  { key: 'email', icon: <Mail size={20} />,    label: 'Email Notifications', desc: 'Receive updates to your campus email address', value: emailNotifs, setter: setEmail },
                  { key: 'push',  icon: <Smartphone size={20} />, label: 'Push Notifications', desc: 'Browser push notifications when a new update arrives', value: pushNotifs, setter: setPush },
                ].map(item => (
                  <div key={item.key} className="notif-pref-row glass-card" style={{ padding: '18px 20px' }}>
                    <div className="notif-pref-icon">{item.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div className="font-semibold text-sm">{item.label}</div>
                      <div className="text-xs text-muted" style={{ marginTop: '2px' }}>{item.desc}</div>
                    </div>
                    <label className="toggle-switch" id={`pref-${item.key}`}>
                      <input
                        type="checkbox"
                        checked={item.value}
                        disabled={item.locked}
                        onChange={item.setter ? e => item.setter(e.target.checked) : undefined}
                      />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card" style={{ padding: '32px', marginBottom: '20px' }}>
              <h3 className="text-lg font-semibold mb-2">Notification Events</h3>
              <p className="text-sm text-muted mb-6">Select which events trigger notifications.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { label: 'Report submitted successfully',  default: true  },
                  { label: 'Report status updated',          default: true  },
                  { label: 'Cleaning staff assigned',        default: true  },
                  { label: 'Garbage cleared / resolved',     default: true  },
                  { label: 'Campus announcements',           default: true  },
                  { label: 'Weekly summary digest',          default: false },
                  { label: 'Coordinator feedback received',  default: true  },
                ].map((ev, i) => (
                  <div key={i} className="flex justify-between items-center" style={{ padding: '10px 0', borderBottom: i < 6 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>🔔 {ev.label}</span>
                    <label className="toggle-switch" id={`event-pref-${i}`}>
                      <input type="checkbox" defaultChecked={ev.default} />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card" style={{ padding: '32px' }}>
              <h3 className="text-lg font-semibold mb-4">Notification Workflow</h3>
              <div className="workflow-diagram">
                {[
                  { step: 1, label: 'User Login',            icon: '🔐', color: '#3b82f6' },
                  { step: 2, label: 'Report Submitted',       icon: '📋', color: '#10b981' },
                  { step: 3, label: 'Backend Processes',      icon: '⚙️', color: '#8b5cf6' },
                  { step: 4, label: 'Coordinator Notified',   icon: '📡', color: '#f59e0b' },
                  { step: 5, label: 'Staff Assigned',         icon: '👷', color: '#f59e0b' },
                  { step: 6, label: 'Status Updated',         icon: '🔄', color: '#14b8a6' },
                  { step: 7, label: 'User Notified',          icon: '🔔', color: '#10b981' },
                ].map((s, i, arr) => (
                  <div key={s.step} className="workflow-step">
                    <div className="workflow-circle" style={{ background: `${s.color}22`, border: `2px solid ${s.color}60` }}>
                      <span style={{ fontSize: '1.3rem' }}>{s.icon}</span>
                    </div>
                    <div className="workflow-label">{s.label}</div>
                    {i < arr.length - 1 && <div className="workflow-arrow">↓</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
