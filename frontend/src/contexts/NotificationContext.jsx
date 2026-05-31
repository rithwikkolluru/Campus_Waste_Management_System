import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

const NotificationContext = createContext(null);

let _nextId = 1;

// Removed INITIAL_NOTIFICATIONS mock data

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [toasts, setToasts]               = useState([]);
  const toastTimers                        = useRef({});

  useEffect(() => {
    const token = localStorage.getItem('eco_token');
    if (!token) return;
    
    fetch('http://localhost:8000/api/reports/my', {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      if (data.status === 'success' && data.reports.length > 0) {
        const generated = data.reports.slice(0, 5).map(r => ({
          id: `n-${r.id}`,
          type: r.status === 'resolved' ? 'success' : 'info',
          category: 'report',
          title: r.status === 'resolved' ? 'Report Resolved' : 'Status Update',
          message: `Your report RPT-00${r.id} is currently ${r.status}.`,
          time: new Date(r.updated_at || r.created_at).toISOString(),
          read: true,
          icon: r.status === 'resolved' ? '✅' : '🔄',
        }));
        setNotifications(generated);
      }
    })
    .catch(err => console.error(err));
  }, []);

  // ── Add a persistent notification ──────────────────────────────────
  const addNotification = useCallback((data) => {
    const notif = {
      id:      `n-${_nextId++}`,
      time:    new Date().toISOString(),
      read:    false,
      icon:    data.icon || (data.type === 'success' ? '✅' : data.type === 'warning' ? '⚠️' : data.type === 'error' ? '❌' : 'ℹ️'),
      ...data,
    };
    setNotifications(prev => [notif, ...prev]);
    return notif;
  }, []);

  // ── Show a toast (automatically disappears) ─────────────────────────
  const showToast = useCallback((data) => {
    const id = `toast-${_nextId++}`;
    const toast = {
      id,
      type:     data.type || 'info',        // success | error | warning | info
      title:    data.title || '',
      message:  data.message || '',
      duration: data.duration ?? 4500,
      icon:     data.icon,
    };
    setToasts(prev => [...prev, toast]);

    // Auto-remove
    toastTimers.current[id] = setTimeout(() => {
      dismissToast(id);
    }, toast.duration);

    return id;
  }, []);

  // ── Combined: show toast + add to notification list ─────────────────
  const notify = useCallback((data) => {
    addNotification(data);
    showToast(data);
  }, [addNotification, showToast]);

  const dismissToast = useCallback((id) => {
    clearTimeout(toastTimers.current[id]);
    delete toastTimers.current[id];
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const markRead = useCallback((id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

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
