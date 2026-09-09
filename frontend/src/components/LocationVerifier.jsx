import { useEffect } from 'react';
import { MapPin, CheckCircle2, AlertTriangle, RefreshCw, Crosshair, HelpCircle } from 'lucide-react';
import useLocation from '../hooks/useLocation';

export default function LocationVerifier({
  onLocationVerified,
  onLocationFailed,
  geoDetails,
  onManualTrigger
}) {
  const { location, getLocation } = useLocation();

  useEffect(() => {
    if (location.status === 'success' && location.lat && location.lng) {
      onLocationVerified({
        lat: location.lat,
        lng: location.lng,
        accuracy: location.accuracy,
        timestamp: location.timestamp
      });
    } else if (location.status === 'denied' || location.status === 'error') {
      onLocationFailed(location.error);
    }
  }, [location.status, location.lat, location.lng, location.accuracy, location.error, location.timestamp, onLocationVerified, onLocationFailed]);

  return (
    <div
      className="glass-card"
      style={{
        padding: '16px 20px',
        marginBottom: '20px',
        border: location.status === 'success'
          ? '1px solid rgba(16, 185, 129, 0.4)'
          : location.status === 'denied'
          ? '1px solid rgba(239, 68, 68, 0.4)'
          : '1px solid var(--glass-border, rgba(255,255,255,0.1))',
        background: location.status === 'success'
          ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(16, 185, 129, 0.02))'
          : location.status === 'denied'
          ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.08), rgba(239, 68, 68, 0.02))'
          : 'var(--bg-card, rgba(15, 23, 42, 0.6))',
        borderRadius: '14px',
        transition: 'all 0.3s ease'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1, minWidth: '240px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              backgroundColor: location.status === 'success'
                ? 'rgba(16, 185, 129, 0.15)'
                : location.status === 'denied'
                ? 'rgba(239, 68, 68, 0.15)'
                : 'rgba(59, 130, 246, 0.15)',
              color: location.status === 'success'
                ? '#10b981'
                : location.status === 'denied'
                ? '#ef4444'
                : '#3b82f6'
            }}
          >
            {location.status === 'loading' ? (
              <RefreshCw size={20} className="animate-spin" />
            ) : location.status === 'success' ? (
              <CheckCircle2 size={22} />
            ) : (
              <AlertTriangle size={20} />
            )}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {location.status === 'loading'
                  ? 'Detecting GPS Coordinates...'
                  : location.status === 'success'
                  ? 'Automatic Location Detected'
                  : location.status === 'denied'
                  ? 'Location Access Required'
                  : 'GPS Location Unavailable'}
              </h4>
              {location.status === 'success' && (
                <span className="badge badge-green" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
                  ±{location.accuracy || 10}m Accuracy
                </span>
              )}
            </div>

            {location.status === 'loading' && (
              <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Requesting high-accuracy device coordinates via Geolocation API...
              </p>
            )}

            {location.status === 'success' && (
              <div style={{ marginTop: '6px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', fontFamily: 'monospace', fontSize: '0.8rem', color: '#38bdf8' }}>
                  <span>Lat: {location.lat}</span>
                  <span>Lng: {location.lng}</span>
                </div>
                {geoDetails?.formattedAddress && (
                  <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)' }}>
                    📍 {geoDetails.formattedAddress}
                  </p>
                )}
              </div>
            )}

            {(location.status === 'denied' || location.status === 'error') && (
              <div style={{ marginTop: '6px' }}>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#f87171', lineHeight: 1.4 }}>
                  {location.error}
                </p>
                <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Tip: In your browser address bar, click the 🔒 icon → Site Settings → Set Location to &quot;Allow&quot;.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Action button */}
        <div style={{ display: 'flex', gap: '8px', alignSelf: 'center' }}>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={getLocation}
            disabled={location.status === 'loading'}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}
          >
            <Crosshair size={14} />
            {location.status === 'loading' ? 'Detecting...' : 'Use Current Location'}
          </button>
        </div>
      </div>
    </div>
  );
}
