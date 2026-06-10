import { useState, useEffect, useRef } from 'react';
import { Bell, Check, Trash2, MapPin, Zap } from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';
import { useNavigate } from 'react-router-dom';

export default function NotificationBell() {
  const { unreadCount, fetchUnreadCount } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const token = localStorage.getItem('ecocampus_token');

  // Load notifications when dropdown opens
  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
        // After loading, we have accurate unread count from the list
      }
    } catch (err) {
      console.error('Failed to load notifications', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await fetch(`http://localhost:8000/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      fetchUnreadCount();
    } catch (err) {
      console.error(err);
    }
  };

  const markAllRead = async () => {
    try {
      await fetch('http://localhost:8000/api/notifications/read-all', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      fetchUnreadCount();
    } catch (err) {
      console.error(err);
    }
  };

  const getIcon = (type) => {
    switch(type) {
      case 'zone_busy': return <Users size={16} color="#f59e0b" />;
      case 'report_status': return <Check size={16} color="#10b981" />;
      case 'zone_resolved': return <Zap size={16} color="#a78bfa" />;
      default: return <Bell size={16} color="#60a5fa" />;
    }
  };

  return (
    <div className="notification-bell-container" ref={dropdownRef} style={{ position: 'relative' }}>
      <button 
        className="btn btn-ghost btn-icon" 
        onClick={() => setIsOpen(!isOpen)}
        style={{ position: 'relative' }}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown glass-card">
          <div className="notification-header flex justify-between items-center">
            <h3 className="font-semibold m-0 text-md">Notifications</h3>
            {unreadCount > 0 && (
              <button className="btn btn-ghost btn-sm text-xs" onClick={markAllRead}>
                Mark all read
              </button>
            )}
          </div>
          
          <div className="notification-list">
            {loading ? (
              <div className="p-4 text-center text-muted">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center text-muted flex flex-col items-center gap-2">
                <Bell size={24} color="var(--text-muted)" opacity={0.5} />
                No new notifications
              </div>
            ) : (
              notifications.map((n) => (
                <div 
                  key={n.id} 
                  className={`notification-item ${n.is_read ? 'read' : 'unread'}`}
                  onClick={() => { if (!n.is_read) markAsRead(n.id); }}
                >
                  <div className="notification-icon">
                    {getIcon(n.type)}
                  </div>
                  <div className="notification-content">
                    <div className="notification-title">{n.title}</div>
                    <div className="notification-message">{n.message}</div>
                    <div className="notification-time">
                      {new Date(n.created_at).toLocaleDateString()} at {new Date(n.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                  </div>
                  {!n.is_read && <div className="notification-dot" />}
                </div>
              ))
            )}
          </div>
          <div className="notification-footer" onClick={() => { setIsOpen(false); navigate('/notifications'); }}>
            View all notifications
          </div>
        </div>
      )}
    </div>
  );
}
