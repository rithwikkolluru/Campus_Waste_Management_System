import { useEffect, useRef } from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import { X, CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';
import './ToastNotification.css';

const ICONS = {
  success: <CheckCircle2 size={18} />,
  error:   <XCircle     size={18} />,
  warning: <AlertTriangle size={18} />,
  info:    <Info         size={18} />,
};

const TYPE_STYLES = {
  success: { '--t-accent': '#10b981', '--t-bg': 'rgba(16,185,129,0.12)', '--t-border': 'rgba(16,185,129,0.3)' },
  error:   { '--t-accent': '#ef4444', '--t-bg': 'rgba(239,68,68,0.12)',  '--t-border': 'rgba(239,68,68,0.3)'  },
  warning: { '--t-accent': '#f59e0b', '--t-bg': 'rgba(245,158,11,0.12)', '--t-border': 'rgba(245,158,11,0.3)' },
  info:    { '--t-accent': '#3b82f6', '--t-bg': 'rgba(59,130,246,0.12)', '--t-border': 'rgba(59,130,246,0.3)' },
};

function Toast({ toast }) {
  const { dismissToast } = useNotifications();
  const barRef = useRef(null);

  useEffect(() => {
    if (barRef.current) {
      barRef.current.style.transitionDuration = `${toast.duration}ms`;
      requestAnimationFrame(() => {
        if (barRef.current) barRef.current.style.width = '0%';
      });
    }
  }, [toast.duration]);

  return (
    <div
      className="toast-item"
      style={TYPE_STYLES[toast.type] || TYPE_STYLES.info}
      role="alert"
      aria-live="polite"
    >
      <div className="toast-icon">{ICONS[toast.type] || ICONS.info}</div>
      <div className="toast-body">
        {toast.title && <div className="toast-title">{toast.title}</div>}
        <div className="toast-message">{toast.message}</div>
      </div>
      <button
        className="toast-close"
        onClick={() => dismissToast(toast.id)}
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </button>
      {/* Progress bar */}
      <div className="toast-progress-wrap">
        <div ref={barRef} className="toast-progress" />
      </div>
    </div>
  );
}

export default function ToastContainer() {
  const { toasts } = useNotifications();

  return (
    <div className="toast-container" aria-label="Notifications" role="region">
      {toasts.map(t => (
        <Toast key={t.id} toast={t} />
      ))}
    </div>
  );
}
