import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import {
  LayoutDashboard, AlertTriangle, MapPin, Bell, Settings,
  LogOut, Recycle, ChevronDown, Menu, X
} from 'lucide-react';
import './Sidebar.css';

const NAV_ITEMS = {
  student: [
    { icon: LayoutDashboard, label: 'Dashboard',      path: '/student',        notifKey: false },
    { icon: AlertTriangle,   label: 'Report Issue',   path: '/report',         notifKey: false },
    { icon: MapPin,           label: 'My Zone',        path: '/student',        notifKey: false },
    { icon: Bell,             label: 'Notifications',  path: '/notifications',  notifKey: true  },
  ],
  coordinator: [
    { icon: LayoutDashboard, label: 'Dashboard',      path: '/coordinator',     notifKey: false },
    { icon: AlertTriangle,   label: 'Complaints',     path: '/coordinator',     notifKey: false },
    { icon: MapPin,           label: 'Zone Map',       path: '/coordinator',     notifKey: false },
    { icon: Bell,             label: 'Notifications',  path: '/notifications',   notifKey: true  },
  ],
  admin: [
    { icon: LayoutDashboard, label: 'Dashboard',      path: '/admin',           notifKey: false },
    { icon: AlertTriangle,   label: 'All Reports',    path: '/admin',           notifKey: false },
    { icon: MapPin,           label: 'Zones',          path: '/admin',           notifKey: false },
    { icon: Settings,         label: 'Users',          path: '/admin',           notifKey: false },
    { icon: Bell,             label: 'Notifications',  path: '/notifications',   notifKey: true  },
  ],
};

const ROLE_COLORS = { student: '#34d399', coordinator: '#60a5fa', admin: '#a78bfa' };
const ROLE_LABELS = { student: 'Student', coordinator: 'Zone Coordinator', admin: 'Administrator' };

export default function Sidebar() {
  const { user, logout }     = useAuth();
  const navigate             = useNavigate();
  const { unreadCount }      = useNotifications();
  const [collapsed, setCollapsed]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const items = NAV_ITEMS[user?.role] || [];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {/* Mobile toggle */}
      <button className="mobile-menu-btn" onClick={() => setMobileOpen(!mobileOpen)} id="sidebar-toggle">
        {mobileOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {mobileOpen && <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />}

      <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''} ${mobileOpen ? 'sidebar-open' : ''}`}>
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="sidebar-logo">
            <Recycle size={22} strokeWidth={1.5} />
          </div>
          {!collapsed && <span className="sidebar-brand-name">EcoCampus</span>}
          <button className="collapse-btn desktop-only" onClick={() => setCollapsed(!collapsed)} id="collapse-sidebar">
            <ChevronDown size={16} style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(90deg)', transition: 'transform 0.3s' }} />
          </button>
        </div>

        {/* User card */}
        <div className={`sidebar-user ${collapsed ? 'collapsed' : ''}`}>
          <div className="sidebar-avatar" style={{ background: `linear-gradient(135deg, ${ROLE_COLORS[user?.role]}, ${ROLE_COLORS[user?.role]}88)` }}>
            {user?.avatar}
          </div>
          {!collapsed && (
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{user?.name}</span>
              <span className="sidebar-user-role" style={{ color: ROLE_COLORS[user?.role] }}>
                {ROLE_LABELS[user?.role]}
              </span>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          {!collapsed && <span className="sidebar-section-label">Navigation</span>}
          {items.map((item) => (
            <NavLink
              key={`${item.path}-${item.label}`}
              to={item.path}
              className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
              id={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              onClick={() => setMobileOpen(false)}
            >
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <item.icon size={18} strokeWidth={1.8} />
                {/* Notification badge on the bell icon */}
                {item.notifKey && unreadCount > 0 && (
                  <span className="sidebar-notif-badge">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              {!collapsed && <span>{item.label}</span>}
              {/* Unread count label (expanded sidebar) */}
              {!collapsed && item.notifKey && unreadCount > 0 && (
                <span className="sidebar-notif-pill">{unreadCount}</span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom */}
        <div className="sidebar-bottom">
          {!collapsed && <span className="sidebar-section-label">Account</span>}
          <button className="sidebar-nav-item logout-btn" onClick={handleLogout} id="logout-btn">
            <LogOut size={18} strokeWidth={1.8} />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>

        {/* Zone indicator */}
        {!collapsed && user?.zone && (
          <div className="sidebar-zone-badge">
            <MapPin size={12} />
            <span>{user.zone}</span>
          </div>
        )}
      </aside>
    </>
  );
}
