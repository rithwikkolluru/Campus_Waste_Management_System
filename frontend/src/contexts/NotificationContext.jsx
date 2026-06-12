import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);
const API_BASE = 'http://localhost:8000';

let _nextId = 1;

function mapDbNotification(n) {
  const dbType = n.type || 'info';
  let category = 'system';
  if (dbType === 'status_update' || dbType === 'report_status') category = 'status';
  else if (dbType === 'report' || dbType === 'report_submitted') category = 'report';
  else if (dbType === 'assignment') category = 'assignment';

  const uiType =
    dbType === 'announcement' ? 'info' :
    dbType === 'status_update' || dbType === 'report_status' ? 'success' :
    dbType === 'daily_limit' || dbType === 'zone_busy' ? 'warning' : 'info';

  return {
    id: `db-${n.id}`,
    dbId: n.id,
    type: uiType,
    category,
    title: n.title || 'Notification',
    message: n.message,
    read: n.is_read,
    time: n.created_at,
    icon: category === 'status' ? '🔄' : category === 'report' ? '📋' : '📢',
  };
}

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [toasts, setToasts]               = useState([]);
  const toastTimers                        = useRef({});
  const token = typeof window !== 'undefined' ? localStorage.getItem('ecocampus_token') : null;

  const fetchNotifications = useCallback(async () => {
    if (!token || !user) return;
    try {
      const res = await fetch(`${API_BASE}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications((data.notifications || []).map(mapDbNotification));
      }
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  }, [token, user]);

  const fetchUnreadCount = useCallback(async () => {
    await fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const addNotification = useCallback((data) => {
    const notif = {
      id:   `n-${_nextId++}`,
      time: new Date().toISOString(),
      read: false,
      icon: data.icon || (
        data.type === 'success' ? '✅' :
        data.type === 'warning' ? '⚠️' :
        data.type === 'error'   ? '❌' : 'ℹ️'
      ),
      ...data,
    };
    setNotifications(prev => [notif, ...prev]);
    return notif;
  }, []);

  const dismissToast = useCallback((id) => {
    clearTimeout(toastTimers.current[id]);
    delete toastTimers.current[id];
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((data) => {
    const id = `toast-${_nextId++}`;
    const toast = {
      id,
      type:     data.type     || 'info',
      title:    data.title    || '',
      message:  data.message  || '',
      duration: data.duration ?? 4500,
      icon:     data.icon,
    };
    setToasts(prev => [...prev, toast]);
    toastTimers.current[id] = setTimeout(() => dismissToast(id), toast.duration);
    return id;
  }, [dismissToast]);

  const notify = useCallback((data) => {
    addNotification(data);
    showToast(data);
  }, [addNotification, showToast]);

  const markRead = useCallback(async (id) => {
    let dbId = null;
    setNotifications(prev => {
      const target = prev.find(n => n.id === id);
      dbId = target?.dbId || null;
      return prev.map(n => n.id === id ? { ...n, read: true } : n);
    });
    if (dbId && token) {
      try {
        await fetch(`${API_BASE}/api/notifications/${dbId}/read`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (err) {
        console.error('markRead error', err);
      }
    }
  }, [token]);

  const markAllRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    if (token) {
      try {
        await fetch(`${API_BASE}/api/notifications/read-all`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (err) {
        console.error('markAllRead error', err);
      }
    }
  }, [token]);

  const deleteNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => setNotifications([]), []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{
      notifications, toasts, unreadCount,
      notify, addNotification, showToast, dismissToast,
      markRead, markAllRead, deleteNotification, clearAll,
      fetchNotifications, fetchUnreadCount,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
};
