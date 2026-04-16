import { createContext, useContext, useState, useCallback, useRef } from 'react';

const NotificationContext = createContext(null);

let _nextId = 1;

const INITIAL_NOTIFICATIONS = [
  {
    id: 'n-1', type: 'success', category: 'report',
    title: 'Report Resolved',
    message: 'Your report RPT-001 (Hostel Area – Overflowing dustbin) has been marked as Resolved.',
    time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    read: false, icon: '✅',
  },
  {
    id: 'n-2', type: 'info', category: 'assignment',
    title: 'Staff Assigned',
    message: 'Cleaning staff Ramesh Kumar has been assigned to your report RPT-006.',
    time: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    read: false, icon: '👷',
  },
  {
    id: 'n-3', type: 'warning', category: 'system',
    title: 'Campus Clean Drive',
    message: 'Campus-wide clean drive scheduled for Saturday, 22 March 2026. Participation encouraged.',
    time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    read: true, icon: '📢',
  },
  {
    id: 'n-4', type: 'success', category: 'report',
    title: 'Report Submitted',
    message: 'Your garbage report for the Canteen zone has been successfully submitted and is under review.',
    time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    read: true, icon: '📋',
  },
  {
    id: 'n-5', type: 'info', category: 'status',
    title: 'Status Update',
    message: 'Report RPT-004 has been moved to "Under Review" by your zone coordinator.',
    time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    read: true, icon: '🔄',
  },
];

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [toasts, setToasts]               = useState([]);
  const toastTimers                        = useRef({});

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
