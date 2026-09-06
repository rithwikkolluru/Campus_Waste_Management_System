import { useState, useEffect, useRef } from 'react';
import { 
  X, Navigation, MapPin, Compass, ExternalLink, 
  Volume2, VolumeX, AlertCircle, CheckCircle2, Footprints 
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { generateNavigationAnnouncement, speakText, stopSpeaking } from '../utils/voiceAssistant';

// Custom icons for Staff navigation
const workerIcon = new L.DivIcon({
  className: 'staff-nav-worker-marker',
  html: `
    <div style="
      position: relative;
      width: 24px;
      height: 24px;
      background: #3b82f6;
      border: 3px solid #ffffff;
      border-radius: 50%;
      box-shadow: 0 0 12px #3b82f6;
    ">
      <div style="
        position: absolute;
        top: -6px;
        left: -6px;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border: 2px solid #3b82f6;
        opacity: 0.7;
        animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
      "></div>
    </div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const destinationIcon = new L.DivIcon({
  className: 'staff-nav-dest-marker',
  html: `
    <div style="
      background: #ef4444;
      color: #fff;
      padding: 6px;
      border-radius: 50%;
      border: 2px solid #fff;
      box-shadow: 0 0 10px rgba(239, 68, 68, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      📍
    </div>
  `,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

function MapBoundsFitter({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points && points.length > 1) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [points, map]);
  return null;
}

export default function StaffNavigationModal({ 
  destination, // { name, type: 'bin'|'report', lat, lng, details }
  onClose 
}) {
  const [currentPos, setCurrentPos] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [distanceMeters, setDistanceMeters] = useState(0);
  const [durationMinutes, setDurationMinutes] = useState(0);
  const [loadingRoute, setLoadingRoute] = useState(true);
  const [routeError, setRouteError] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceLang, setVoiceLang] = useState('te'); // default to Telugu for municipal field workers
  const watchIdRef = useRef(null);

  const destLat = parseFloat(destination?.lat || 17.4920);
  const destLng = parseFloat(destination?.lng || 78.3910);
  const destName = destination?.name || 'Waste Collection Point';

  // 1. Live Geolocation Tracker
  useEffect(() => {
    if (!navigator.geolocation) {
      setRouteError('Geolocation not supported on this device');
      setLoadingRoute(false);
      return;
    }

    // Immediate initial fetch
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const staffCoords = [pos.coords.latitude, pos.coords.longitude];
        setCurrentPos(staffCoords);
        fetchOSRMRoute(staffCoords, [destLat, destLng]);
      },
      (err) => {
        console.warn('Geolocation initial error, falling back to simulated proximate coordinates:', err);
        // Realistic proximate fallback within walking distance if GPS permissions are denied in sandbox
        const fallback = [destLat - 0.0018, destLng - 0.0014];
        setCurrentPos(fallback);
        fetchOSRMRoute(fallback, [destLat, destLng]);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );

    // Watch position in real-time as worker walks
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setCurrentPos([pos.coords.latitude, pos.coords.longitude]);
      },
      (err) => console.debug('Watch position error:', err),
      { enableHighAccuracy: true }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      stopSpeaking();
    };
  }, [destLat, destLng]);

  // 2. Open-Source OSRM Routing (Zero API Keys)
  const fetchOSRMRoute = async (startCoords, endCoords) => {
    setLoadingRoute(true);
    setRouteError(null);

    const [startLat, startLng] = startCoords;
    const [endLat, endLng] = endCoords;

    try {
      // Free public OpenStreetMap OSRM walking router API
      const osrmUrl = `https://router.project-osrm.org/route/v1/walking/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
      const res = await fetch(osrmUrl);
      const data = await res.json();

      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        // OSRM returns coordinates in [lng, lat], Leaflet polyline expects [lat, lng]
        const leafletCoords = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
        setRouteCoords(leafletCoords);
        setDistanceMeters(route.distance);
        setDurationMinutes(route.duration / 60);

        // Announce route in Telugu immediately to assist field worker
        const announcement = generateNavigationAnnouncement(
          destName, 
          route.distance, 
          route.duration / 60, 
          voiceLang
        );
        speakText(
          announcement, 
          voiceLang, 
          () => setIsSpeaking(true), 
          () => setIsSpeaking(false)
        );
      } else {
        // Fallback to straight line polyline if OSRM doesn't map footpaths in this specific tile
        setRouteCoords([[startLat, startLng], [endLat, endLng]]);
        const straightDist = calculateDistanceMeters(startLat, startLng, endLat, endLng);
        setDistanceMeters(straightDist);
        setDurationMinutes(straightDist / 80); // ~80 meters per minute walking speed
      }
    } catch (err) {
      console.warn('OSRM router error, displaying direct vector:', err);
      setRouteCoords([[startLat, startLng], [endLat, endLng]]);
      const straightDist = calculateDistanceMeters(startLat, startLng, endLat, endLng);
      setDistanceMeters(straightDist);
      setDurationMinutes(straightDist / 80);
    } finally {
      setLoadingRoute(false);
    }
  };

  // Helper straight-line distance (Haversine formula)
  const calculateDistanceMeters = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // 3. One-Tap Free Native Navigation Intent (Google / Apple Maps)
  const handleLaunchNativeMaps = () => {
    const originParam = currentPos ? `${currentPos[0]},${currentPos[1]}` : '';
    // Standard Universal intent link that launches Google Maps or Apple Maps app on smartphone
    const url = originParam 
      ? `https://www.google.com/maps/dir/?api=1&origin=${originParam}&destination=${destLat},${destLng}&travelmode=walking`
      : `https://www.google.com/maps/search/?api=1&query=${destLat},${destLng}`;

    window.open(url, '_blank');
  };

  const handleVoiceToggle = () => {
    if (isSpeaking) {
      stopSpeaking();
      setIsSpeaking(false);
    } else {
      const announcement = generateNavigationAnnouncement(
        destName, 
        distanceMeters, 
        durationMinutes, 
        voiceLang
      );
      speakText(
        announcement, 
        voiceLang, 
        () => setIsSpeaking(true), 
        () => setIsSpeaking(false)
      );
    }
  };

  const handleSwitchVoiceLang = (lang) => {
    stopSpeaking();
    setIsSpeaking(false);
    setVoiceLang(lang);
    const announcement = generateNavigationAnnouncement(
      destName, 
      distanceMeters, 
      durationMinutes, 
      lang
    );
    speakText(
      announcement, 
      lang, 
      () => setIsSpeaking(true), 
      () => setIsSpeaking(false)
    );
  };

  return (
    <div className="staff-nav-modal-overlay" style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '16px'
    }}>
      <div className="glass-card staff-nav-modal-card" style={{
        width: '100%',
        maxWidth: '750px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '20px',
        overflow: 'hidden',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        background: '#0f172a'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(59, 130, 246, 0.06)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: '#3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff'
            }}>
              <Compass size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Staff Route Guidance
                </h3>
                <span style={{
                  fontSize: '0.68rem',
                  padding: '1px 7px',
                  background: 'rgba(16, 185, 129, 0.2)',
                  color: '#34d399',
                  borderRadius: '10px',
                  fontWeight: 600
                }}>
                  Live GPS
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Destination: <strong style={{ color: '#60a5fa' }}>{destName}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Route Stats & Voice Action Bar */}
        <div style={{
          padding: '12px 20px',
          background: 'rgba(255, 255, 255, 0.02)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>WALKING DISTANCE</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#38bdf8' }}>
                {distanceMeters > 1000 
                  ? `${(distanceMeters / 1000).toFixed(2)} km` 
                  : `${Math.round(distanceMeters)} m`}
              </div>
            </div>
            <div style={{ height: '24px', width: '1px', background: 'rgba(255,255,255,0.1)' }} />
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ESTIMATED TIME</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#34d399' }}>
                ~{Math.max(1, Math.round(durationMinutes))} min
              </div>
            </div>
          </div>

          {/* Bilingual Speech Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ display: 'flex', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
              <button
                type="button"
                onClick={() => handleSwitchVoiceLang('te')}
                style={{
                  background: voiceLang === 'te' ? '#3b82f6' : 'rgba(255,255,255,0.05)',
                  color: voiceLang === 'te' ? '#fff' : 'var(--text-secondary)',
                  border: 'none',
                  padding: '5px 10px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                తెలుగు
              </button>
              <button
                type="button"
                onClick={() => handleSwitchVoiceLang('en')}
                style={{
                  background: voiceLang === 'en' ? '#3b82f6' : 'rgba(255,255,255,0.05)',
                  color: voiceLang === 'en' ? '#fff' : 'var(--text-secondary)',
                  border: 'none',
                  padding: '5px 10px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                English
              </button>
            </div>

            <button
              type="button"
              onClick={handleVoiceToggle}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '8px',
                background: isSpeaking ? '#ef4444' : 'rgba(16, 185, 129, 0.15)',
                color: isSpeaking ? '#fff' : '#10b981',
                border: `1px solid ${isSpeaking ? '#ef4444' : 'rgba(16, 185, 129, 0.3)'}`,
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {isSpeaking ? <VolumeX size={15} /> : <Volume2 size={15} />}
              {isSpeaking ? 'Stop Voice' : '🔊 Listen Directions'}
            </button>
          </div>
        </div>

        {/* Map Container */}
        <div style={{ flex: 1, minHeight: '340px', position: 'relative' }}>
          {currentPos && (
            <MapContainer
              center={currentPos}
              zoom={17}
              style={{ height: '100%', width: '100%', minHeight: '340px' }}
              zoomControl={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* Staff Current Position Marker */}
              <Marker position={currentPos} icon={workerIcon}>
                <Popup>
                  <strong>Sanitation Staff Location</strong>
                  <div style={{ fontSize: '11px', color: '#666' }}>Your active GPS beacon</div>
                </Popup>
              </Marker>

              {/* Destination Dustbin Marker */}
              <Marker position={[destLat, destLng]} icon={destinationIcon}>
                <Popup>
                  <strong>{destName}</strong>
                  <div style={{ fontSize: '11px', color: '#666' }}>Target Waste Point</div>
                </Popup>
              </Marker>

              {/* OSRM Route Line */}
              {routeCoords.length > 0 && (
                <Polyline
                  positions={routeCoords}
                  color="#3b82f6"
                  weight={5}
                  opacity={0.8}
                  dashArray="8, 10"
                />
              )}

              {/* Auto fit map to show both worker and bin */}
              <MapBoundsFitter points={[currentPos, [destLat, destLng]]} />
            </MapContainer>
          )}

          {loadingRoute && (
            <div style={{
              position: 'absolute',
              top: '12px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 1000,
              background: 'rgba(15, 23, 42, 0.85)',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '0.78rem',
              color: '#38bdf8',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              border: '1px solid rgba(56, 189, 248, 0.3)'
            }}>
              <span className="spinner" style={{ width: '12px', height: '12px', borderColor: '#38bdf8' }} />
              Calculating optimal walking route...
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '14px 20px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(15, 23, 42, 0.95)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            <Footprints size={15} color="#34d399" />
            <span>OpenStreetMap OSRM Free Routing</span>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn"
              style={{
                background: 'rgba(255,255,255,0.06)',
                color: 'var(--text-secondary)',
                padding: '8px 16px',
                fontSize: '0.85rem'
              }}
            >
              Close
            </button>

            {/* Launch Turn-by-Turn GPS into Smartphone Navigation App */}
            <button
              type="button"
              onClick={handleLaunchNativeMaps}
              className="btn btn-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                padding: '8px 18px',
                fontSize: '0.85rem',
                fontWeight: 600
              }}
            >
              <Navigation size={16} />
              Open Turn-by-Turn GPS
              <ExternalLink size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
