import { useState, useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

import Sidebar        from '../components/Sidebar';
import HeatmapLayer   from '../components/map/HeatmapLayer';
import ReportPopup    from '../components/map/ReportPopup';
import HistoryPanel   from '../components/map/HistoryPanel';
import useMapData     from '../hooks/useMapData';
import { getMarkerIcon, createUserIcon } from '../utils/mapIcons';
import './Dashboard.css';


// JNTUH Campus center — Hyderabad
const JNTUH_CENTER = [17.4920, 78.3910];
const JNTUH_ZOOM   = 17;

// Fly to location helper component
const FlyToLocation = ({ position }) => {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, 19, { duration: 1.5 });
  }, [position, map]);
  return null;
};

const CampusMapPage = () => {
  const token = localStorage.getItem('ecocampus_token');
  const {
    markers, heatPoints, stats, history,
    loading, filter, setFilter,
    days, setDays, showMine, setShowMine,
    refresh,
  } = useMapData(token);

  const [mapMode, setMapMode]         = useState('pins');
  // mapMode: pins | heatmap
  const [historyOpen, setHistoryOpen] = useState(false);
  const [flyTo, setFlyTo]             = useState(null);
  const [userPos, setUserPos]         = useState(null);

  // Get user location
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      pos => setUserPos([pos.coords.latitude, pos.coords.longitude]),
      () => {}
    );
  }, []);

  // When history item clicked — fly map to that location
  const handleSelectReport = (report) => {
    if (report.latitude && report.longitude) {
      setFlyTo([
        parseFloat(report.latitude),
        parseFloat(report.longitude),
      ]);
    }
  };

  const FILTERS = [
    { key: 'all',         label: '🗺️ All' },
    { key: 'pending',     label: '🔴 Pending' },
    { key: 'in_progress', label: '🟡 In Progress' },
    { key: 'resolved',    label: '🟢 Resolved' },
    { key: 'critical',    label: '🚨 Critical' },
  ];

  const filteredMarkers =
    filter === 'critical'
      ? markers.filter(m => m.severity >= 7 && m.status !== 'resolved')
      : filter === 'all'
      ? markers
      : markers.filter(m => m.status === filter);

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content" style={{ padding: 0, height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div className="map-page" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

          {/* ── Stats bar ────────────────────────── */}
          {stats && (
            <div className="map-stats-bar">
              <div className="map-stat">
                <span className="stat-num">{stats.totalThisMonth}</span>
                <span className="stat-lbl">This Month</span>
              </div>
              <div className="map-stat">
                <span className="stat-num red">{stats.pendingReports}</span>
                <span className="stat-lbl">Pending</span>
              </div>
              <div className="map-stat">
                <span className="stat-num green">{stats.resolvedThisMonth}</span>
                <span className="stat-lbl">Resolved</span>
              </div>
              <div className="map-stat">
                <span className="stat-num orange">{stats.criticalActive}</span>
                <span className="stat-lbl">Critical</span>
              </div>
            </div>
          )}

          {/* ── Toolbar ──────────────────────────── */}
          <div className="map-toolbar">

            {/* Filter buttons */}
            <div className="map-filters">
              {FILTERS.map(f => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`map-filter-btn ${filter===f.key?'active':''}`}
                  type="button"
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Right side actions */}
            <div className="map-actions">
              {/* Pins / Heatmap toggle */}
              <div className="map-mode-toggle">
                <button
                  onClick={() => setMapMode('pins')}
                  className={mapMode === 'pins' ? 'active' : ''}
                  type="button"
                >
                  📍 Pins
                </button>
                <button
                  onClick={() => setMapMode('heatmap')}
                  className={mapMode === 'heatmap' ? 'active' : ''}
                  type="button"
                >
                  🔥 Heat
                </button>
              </div>

              {/* History button */}
              <button
                onClick={() => setHistoryOpen(true)}
                className="map-history-btn"
                type="button"
              >
                📋 History
              </button>

              {/* Refresh */}
              <button
                onClick={refresh}
                className="map-refresh-btn"
                disabled={loading}
                type="button"
              >
                {loading ? '⏳' : '🔄'}
              </button>
            </div>
          </div>

          {/* ── Map ──────────────────────────────── */}
          <div className="map-wrapper">
            <MapContainer
              center={JNTUH_CENTER}
              zoom={JNTUH_ZOOM}
              style={{ width: '100%', height: '100%', zIndex: 1 }}
              zoomControl={true}
            >
              {/* OpenStreetMap tile layer — free, no key */}
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
                maxZoom={19}
              />

              {/* Fly to selected report */}
              {flyTo && (
                <FlyToLocation
                  position={flyTo}
                  key={flyTo.join(',')}
                />
              )}

              {/* User location dot */}
              {userPos && (
                <Marker position={userPos} icon={createUserIcon()}>
                  <Popup>📍 You are here</Popup>
                </Marker>
              )}

              {/* Report pins — shown in pins mode */}
              {mapMode === 'pins' && filteredMarkers.map(marker => (
                <Marker
                  key={marker.id}
                  position={[marker.lat, marker.lng]}
                  icon={getMarkerIcon(marker)}
                >
                  <Popup maxWidth={260} className="report-popup">
                    <ReportPopup marker={marker} />
                  </Popup>
                </Marker>
              ))}

              {/* Heatmap overlay — shown in heatmap mode */}
              <HeatmapLayer
                points={heatPoints}
                visible={mapMode === 'heatmap'}
              />

            </MapContainer>

            {/* Loading overlay */}
            {loading && (
              <div className="map-loading-overlay">
                <div className="map-spinner" />
                <p>Loading campus map...</p>
              </div>
            )}
          </div>

          {/* Report count footer */}
          <div className="map-footer">
            {mapMode === 'pins'
              ? `Showing ${filteredMarkers.length} reports on JNTUH Campus`
              : `Heatmap showing ${heatPoints.length} report locations`
            }
          </div>

          {/* History sidebar panel */}
          <HistoryPanel
            open={historyOpen}
            onClose={() => setHistoryOpen(false)}
            reports={history}
            showMine={showMine}
            setShowMine={setShowMine}
            onSelectReport={handleSelectReport}
          />

        </div>
      </main>
    </div>
  );
};

export default CampusMapPage;
