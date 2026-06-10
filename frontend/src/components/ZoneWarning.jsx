import React from 'react';
import { AlertTriangle, Users, MapPin, Zap } from 'lucide-react';

export default function ZoneWarning({ zoneStatus }) {
  if (!zoneStatus || zoneStatus.warningLevel === 'none') return null;

  const { warningLevel, message, reportCount } = zoneStatus;
  
  // Choose styles based on severity
  const styles = {
    warning: {
      bg: 'rgba(59, 130, 246, 0.1)',
      border: '1px solid rgba(59, 130, 246, 0.3)',
      iconColor: '#3b82f6',
      textColor: '#60a5fa'
    },
    half_points: {
      bg: 'rgba(245, 158, 11, 0.1)',
      border: '1px solid rgba(245, 158, 11, 0.3)',
      iconColor: '#f59e0b',
      textColor: '#fbbf24'
    },
    no_points: {
      bg: 'rgba(239, 68, 68, 0.1)',
      border: '1px solid rgba(239, 68, 68, 0.3)',
      iconColor: '#ef4444',
      textColor: '#f87171'
    }
  }[warningLevel];

  return (
    <div style={{
      marginTop: '16px',
      padding: '16px',
      borderRadius: '8px',
      background: styles.bg,
      border: styles.border,
      display: 'flex',
      gap: '12px',
      alignItems: 'flex-start'
    }}>
      <AlertTriangle size={24} color={styles.iconColor} style={{ flexShrink: 0, marginTop: '2px' }} />
      <div>
        <div style={{ fontWeight: 600, color: styles.iconColor, display: 'flex', alignItems: 'center', gap: '8px' }}>
          Area Heavily Reported
          <span className="badge" style={{ background: styles.iconColor, color: '#fff', fontSize: '0.7rem' }}>
            {reportCount} Reports
          </span>
        </div>
        <p style={{ color: styles.textColor, fontSize: '0.85rem', marginTop: '6px', lineHeight: 1.4 }}>
          {message}
        </p>
      </div>
    </div>
  );
}
