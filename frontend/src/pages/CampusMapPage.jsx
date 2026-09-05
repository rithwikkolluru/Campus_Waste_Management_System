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
import { getMarkerIcon, createUserIcon, createDistrictClusterIcon } from '../utils/mapIcons';
import './Dashboard.css';


// Telangana State Centers
const STATE_VIEW_CENTER = [17.8748, 78.1008];
const JNTUH_CENTER = [17.4920, 78.3910];
const JNTUH_ZOOM   = 17;

// District Hotspot Anchors for Telangana GIS overview
export const DISTRICT_CENTERS = [
  { name: 'Hyderabad', lat: 17.3850, lng: 78.4867, total: 24, critical: 3 },
  { name: 'Rangareddy', lat: 17.2403, lng: 78.4294, total: 18, critical: 2 },
  { name: 'Medchal-Malkajgiri', lat: 17.5449, lng: 78.5718, total: 14, critical: 1 },
  { name: 'Warangal', lat: 17.9689, lng: 79.5941, total: 10, critical: 2 },
  { name: 'Nizamabad', lat: 18.6725, lng: 78.0941, total: 7, critical: 0 },
  { name: 'Karimnagar', lat: 18.4386, lng: 79.1288, total: 9, critical: 1 },
  { name: 'Khammam', lat: 17.2473, lng: 80.1514, total: 6, critical: 0 },
];

// Fly to location helper component
const FlyToLocation = ({ position, zoom = 19 }) => {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, zoom, { duration: 1.5 });
  }, [position, zoom, map]);
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
  // mapMode: pins | heatmap | districts
  const [historyOpen, setHistoryOpen] = useState(false);
  const [flyTo, setFlyTo]             = useState(null);
  const [mapZoom, setMapZoom]         = useState(17);
  const [userPos, setUserPos]         = useState(null);
  const [selectedDistrict, setSelectedDistrict] = useState(null);

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
                  onClick={() => { setMapMode('pins'); setFlyTo(JNTUH_CENTER); setMapZoom(17); }}
                  className={mapMode === 'pins' ? 'active' : ''}
                  type="button"
                >
                  📍 Pins
                </button>
                <button
                  onClick={() => { setMapMode('heatmap'); setFlyTo(JNTUH_CENTER); setMapZoom(17); }}
                  className={mapMode === 'heatmap' ? 'active' : ''}
                  type="button"
                >
                  🔥 Heat
                </button>
                <button
                  onClick={() => { setMapMode('districts'); setFlyTo(STATE_VIEW_CENTER); setMapZoom(8); }}
                  className={mapMode === 'districts' ? 'active' : ''}
                  type="button"
                >
                  🏛️ Districts
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

              {/* Fly to selected report / district */}
              {flyTo && (
                <FlyToLocation
                  position={flyTo}
                  zoom={mapZoom}
                  key={`${flyTo.join(',')}-${mapZoom}`}
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

              {/* District cluster markers — shown in districts mode */}
              {mapMode === 'districts' && DISTRICT_CENTERS.map((district) => (
                <Marker
                  key={district.name}
                  position={[district.lat, district.lng]}
                  icon={createDistrictClusterIcon(district)}
                  eventHandlers={{
                    click: () => {
                      setFlyTo([district.lat, district.lng]);
                      setMapZoom(13);
                    }
                  }}
                >
                  <Popup maxWidth={260} className="report-popup">
                    <div style={{ padding: '6px 4px' }}>
                      <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', color: '#0f172a' }}>🏛️ {district.name} District</h4>
                      <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#475569' }}>Total Active Issues: <strong>{district.total}</strong></p>
                      <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: district.critical > 0 ? '#ef4444' : '#10b981' }}>
                        {district.critical > 0 ? `🚨 ${district.critical} Critical Incidents` : '✅ No Critical Backlog'}
                      </p>
                      <button
                        className="btn btn-primary btn-sm"
                        style={{ width: '100%', padding: '4px 8px', fontSize: '11px' }}
                        onClick={() => {
                          setFlyTo([district.lat, district.lng]);
                          setMapZoom(14);
                        }}
                      >
                        Inspect District Grid
                      </button>
                    </div>
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
              : mapMode === 'districts'
              ? `Statewide GIS: Monitoring ${DISTRICT_CENTERS.length} Telangana District Hubs`
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
