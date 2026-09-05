import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import {
  LayoutDashboard, AlertTriangle, MapPin, Bell, Settings,
  LogOut, Recycle, ChevronDown, Menu, X, Sun, Moon, Trophy, Map, Award,
  ClipboardList, CheckCircle, Package, Megaphone
} from 'lucide-react';
import './Sidebar.css';

const NAV_ITEMS = {
  student: [
    { icon: LayoutDashboard, label: 'Dashboard',      path: '/student',        notifKey: false },
    { icon: AlertTriangle,   label: 'Report Issue',   path: '/report',         notifKey: false },
    { icon: Trophy,          label: 'Achievements',   path: '/achievements',   notifKey: false },
    { icon: Award,           label: 'Leaderboard',    path: '/leaderboard',    notifKey: false },
    { icon: Map,             label: 'Campus Map',     path: '/map',            notifKey: false },
    { icon: Bell,            label: 'Notifications',  path: '/notifications',  notifKey: true  },
  ],
  coordinator: [
    { icon: LayoutDashboard, label: 'Dashboard',     path: '/coordinator',                  notifKey: false },
    { icon: ClipboardList,   label: 'Reports',        path: '/coordinator?tab=reports',       notifKey: false },
    { icon: CheckCircle,     label: 'Verification',   path: '/coordinator?tab=verification',  notifKey: false },
    { icon: Map,             label: 'Zone Map',        path: '/coordinator?tab=map',           notifKey: false },
    { icon: Package,         label: 'Bin Management',  path: '/coordinator?tab=bins',          notifKey: false },
    { icon: Megaphone,       label: 'Announcements',   path: '/coordinator?tab=announcements',  notifKey: false },
    { icon: Trophy,          label: 'Leaderboard',     path: '/leaderboard',                   notifKey: false },
  ],
  admin: [
    { icon: LayoutDashboard, label: 'Dashboard',      path: '/admin',           notifKey: false },
    { icon: AlertTriangle,   label: 'All Reports',    path: '/admin',           notifKey: false },
    { icon: Map,             label: 'Campus Map',     path: '/map',             notifKey: false },
    { icon: Settings,         label: 'Users',          path: '/admin',           notifKey: false },
    { icon: Bell,             label: 'Notifications',  path: '/notifications',   notifKey: true  },
  ],
};

const ROLE_COLORS = { student: '#34d399', coordinator: '#60a5fa', admin: '#a78bfa' };
const ROLE_LABELS = { student: 'Civic Citizen', coordinator: 'Ward Inspector', admin: 'Urban Directorate' };

export default function Sidebar() {
  const { user, logout }     = useAuth();
  const navigate             = useNavigate();
  const location             = useLocation();
  const { unreadCount }      = useNotifications();
  const [collapsed, setCollapsed]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('eco_theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Automatically close sidebar when navigating to a new route
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, location.search]);

  // Lock background body scroll when mobile sidebar drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('eco_theme', newTheme);
  };

  const items = NAV_ITEMS[user?.role] || [];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {/* Mobile hamburger menu toggle button — visible when drawer is closed */}
      {!mobileOpen && (
        <button
          className="mobile-menu-btn"
          onClick={() => setMobileOpen(true)}
          id="sidebar-toggle"
          aria-label="Open Navigation Menu"
        >
          <Menu size={22} />
        </button>
      )}

      {/* Mobile background overlay */}
      {mobileOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setMobileOpen(false)}
          aria-label="Close Navigation Overlay"
        />
      )}

      <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''} ${mobileOpen ? 'sidebar-open' : ''}`}>
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="sidebar-logo">
            <Recycle size={22} strokeWidth={1.5} />
          </div>
          {!collapsed && (
            <div className="sidebar-brand-text">
              <span className="sidebar-brand-name">CleanState AI</span>
            </div>
          )}
          {/* Desktop collapse toggle */}
          <button
            className="collapse-btn desktop-only"
            onClick={() => setCollapsed(!collapsed)}
            id="collapse-sidebar"
            aria-label="Toggle Collapse"
          >
            <ChevronDown
              size={16}
              style={{
                transform: collapsed ? 'rotate(-90deg)' : 'rotate(90deg)',
                transition: 'transform 0.3s'
              }}
            />
          </button>
          {/* Mobile close (X) button inside the brand header */}
          <button
            className="mobile-close-btn mobile-only"
            onClick={() => setMobileOpen(false)}
            id="sidebar-close-btn"
            aria-label="Close Navigation Menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* User card */}
        <div className={`sidebar-user ${collapsed ? 'collapsed' : ''}`}>
          <div
            className="sidebar-avatar"
            style={{
              background: `linear-gradient(135deg, ${ROLE_COLORS[user?.role] || '#10b981'}, ${ROLE_COLORS[user?.role] || '#10b981'}88)`
            }}
          >
            {user?.avatar || '👤'}
          </div>
          {!collapsed && (
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{user?.name || 'User'}</span>
              <span
                className="sidebar-user-role"
                style={{ color: ROLE_COLORS[user?.role] || '#10b981' }}
              >
                {ROLE_LABELS[user?.role] || 'Member'}
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
              end={!item.path.includes('?')}
              className={({ isActive }) => {
                const isCustomActive = item.path.includes('?') 
                  ? window.location.pathname + window.location.search === item.path
                  : isActive;
                return `sidebar-nav-item ${isCustomActive ? 'active' : ''}`;
              }}
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
          <button className="sidebar-nav-item" onClick={toggleTheme} id="theme-toggle">
            {theme === 'dark' ? <Sun size={18} strokeWidth={1.8} /> : <Moon size={18} strokeWidth={1.8} />}
            {!collapsed && <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
          </button>
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
