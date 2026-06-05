import { useRef } from 'react';

const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days  = Math.floor(hours / 24);
  if (days > 0)  return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return `${mins}m ago`;
};

const STATUS_DOT = {
  pending:     '🔴',
  in_progress: '🟡',
  resolved:    '🟢',
};

const HistoryPanel = ({
  open,
  onClose,
  reports,
  showMine,
  setShowMine,
  onSelectReport,
}) => {
  return (
    <>
      {/* Backdrop — closes panel on click */}
      {open && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.3)',
            zIndex: 399,
          }}
        />
      )}

      {/* Panel */}
      <div className={`history-panel ${open ? 'open' : ''}`}>

        {/* Panel header */}
        <div className="history-header">
          <h3 style={{ margin: 0, fontSize: '16px' }}>
            📸 Report History
          </h3>
          <button onClick={onClose} className="history-close">✕</button>
        </div>

        {/* Toggle: My Reports / All Reports */}
        <div className="history-toggle">
          <button
            onClick={() => setShowMine(false)}
            className={`toggle-btn ${!showMine ? 'active' : ''}`}
            type="button"
          >
            All Reports
          </button>
          <button
            onClick={() => setShowMine(true)}
            className={`toggle-btn ${showMine ? 'active' : ''}`}
            type="button"
          >
            My Reports
          </button>
        </div>

        {/* Reports list */}
        <div className="history-list">
          {reports.length === 0 ? (
            <div className="history-empty">
              <p>🗺️ No reports found</p>
              <p style={{ fontSize: '13px', opacity: 0.6 }}>
                Submit a report to see it here
              </p>
            </div>
          ) : (
            reports.map(report => {
              const photoUrl = report.photo
                ? (report.photo.startsWith('http') ? report.photo : `http://localhost:8000${report.photo}`)
                : null;
              return (
                <div
                  key={report.id}
                  className="history-item"
                  onClick={() => {
                    onSelectReport(report);
                    onClose();
                  }}
                >
                  {/* Thumbnail */}
                  <div className="history-thumb">
                    {photoUrl ? (
                      <img src={photoUrl} alt="waste" />
                    ) : (
                      <div className="history-thumb-placeholder">
                        🗑️
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="history-item-info">
                    <div className="history-item-top">
                      <span className="history-waste-type">
                        {report.waste_type}
                      </span>
                      <span>
                        {STATUS_DOT[report.status] || '⚪'}
                      </span>
                    </div>
                    <p className="history-location">
                      📍 {report.location}
                    </p>
                    <p className="history-time">
                      {timeAgo(report.created_at)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
};

export default HistoryPanel;
