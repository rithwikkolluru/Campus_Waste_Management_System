import { createContext, useContext, useState, useCallback, useRef } from 'react';

const NotificationContext = createContext(null);

let _nextId = 1;

export function NotificationProvider({ children }) {
  // Start completely empty — no fake/demo notifications
  const [notifications, setNotifications] = useState([]);
  const [toasts, setToasts]               = useState([]);
  const toastTimers                        = useRef({});

  // ── Add a persistent notification ──────────────────────────────────────
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

  // ── Show a toast (auto-disappears) ──────────────────────────────────────
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
  }, []);

  // ── Combined: toast + persistent notification ───────────────────────────
  const notify = useCallback((data) => {
    addNotification(data);
    showToast(data);
  }, [addNotification, showToast]);

  const dismissToast = useCallback((id) => {
    clearTimeout(toastTimers.current[id]);
    delete toastTimers.current[id];
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const markRead    = useCallback((id) =>
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n)), []);

  const markAllRead = useCallback(() =>
    setNotifications(prev => prev.map(n => ({ ...n, read: true }))), []);

  const deleteNotification = useCallback((id) =>
    setNotifications(prev => prev.filter(n => n.id !== id)), []);

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
