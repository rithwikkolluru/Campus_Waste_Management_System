import { WASTE_EMOJI } from '../../utils/mapIcons';

const STATUS_COLORS = {
  pending:     { bg: '#fef3c7', text: '#92400e', label: '⏳ Pending' },
  in_progress: { bg: '#dbeafe', text: '#1e40af', label: '🔧 In Progress' },
  resolved:    { bg: '#dcfce7', text: '#166534', label: '✅ Resolved' },
};

const SEVERITY_LABEL = (s) =>
  s >= 9 ? '🚨 Critical' :
  s >= 7 ? '🔴 High'     :
  s >= 5 ? '🟡 Medium'   :
           '🟢 Low';

const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days  = Math.floor(hours / 24);
  if (days > 0)  return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return `${mins}m ago`;
};

const ReportPopup = ({ marker }) => {
  const status = STATUS_COLORS[marker.status] || STATUS_COLORS.pending;
  const photoUrl = marker.photo 
    ? (marker.photo.startsWith('http') ? marker.photo : `http://localhost:8000${marker.photo}`) 
    : null;

  return (
    <div style={{
      width: '240px',
      fontFamily: 'inherit',
      fontSize: '13px',
    }}>

      {/* Photo */}
      {photoUrl && (
        <div style={{ margin: '-14px -20px 10px -20px' }}>
          <img
            src={photoUrl}
            alt="Waste"
            style={{
              width: '100%',
              height: '130px',
              objectFit: 'cover',
              cursor: 'pointer',
              display: 'block',
            }}
            onClick={() => window.open(photoUrl, '_blank')}
          />
        </div>
      )}

      {/* Header row */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '6px',
      }}>
        <strong style={{ fontSize: '14px' }}>
          {WASTE_EMOJI[marker.wasteType] || '🗑️'} {marker.wasteType}
        </strong>
        <span style={{
          padding: '2px 8px',
          borderRadius: '10px',
          background: status.bg,
          color: status.text,
          fontSize: '11px',
          fontWeight: 600,
        }}>
          {status.label}
        </span>
      </div>

      {/* Description */}
      {marker.description && (
        <p style={{ margin: '0 0 6px', opacity: 0.8, lineHeight: 1.4 }}>
          {marker.description}
        </p>
      )}

      {/* Details */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '3px',
        opacity: 0.75,
        fontSize: '12px',
      }}>
        <span>📍 {marker.location}</span>
        <span>⚠️ Severity: {marker.severity}/10 — {SEVERITY_LABEL(marker.severity)}</span>
        <span>👤 {marker.studentName}</span>
        <span>🕐 {timeAgo(marker.createdAt)}</span>
      </div>

      {/* Critical badge */}
      {marker.severity >= 7 && marker.status !== 'resolved' && (
        <div style={{
          marginTop: '8px',
          padding: '6px 8px',
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: '6px',
          color: '#ef4444',
          fontWeight: 600,
          fontSize: '12px',
        }}>
          🚨 Needs immediate attention
        </div>
      )}
    </div>
  );
};

export default ReportPopup;
