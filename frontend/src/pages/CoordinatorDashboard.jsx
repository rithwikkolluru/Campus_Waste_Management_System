import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { API_BASE_URL } from '../config';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import { 
  RefreshCw, Clock, CheckCircle, XCircle, Users, Package, Megaphone, 
  BarChart3, AlertTriangle, Plus, Trash2, Send, Eye, Map, ClipboardList, TrendingUp,
  Navigation, Compass, Volume2, Globe
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './Dashboard.css';
import VoiceAssistantButton from '../components/VoiceAssistantButton';
import StaffNavigationModal from '../components/StaffNavigationModal';
import { generateReportAnnouncement, generateBinAnnouncement } from '../utils/voiceAssistant';

// Leaflet marker icons workaround for Vite/Webpack
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

// Helper component to center map on coordinates
function ChangeMapView({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, 16);
    }
  }, [center, map]);
  return null;
}

// SLA Countdown Timer Component
const SLATimer = ({ deadline }) => {
  const [timeLeft, setTimeLeft] = useState('');
  const [statusClass, setStatusClass] = useState('sla-green');

  useEffect(() => {
    if (!deadline) {
      setTimeLeft('No SLA');
      setStatusClass('sla-green');
      return;
    }

    const calculateTime = () => {
      const now = new Date();
      const dl = new Date(deadline);
      const diff = dl - now;

      if (diff <= 0) {
        setTimeLeft('⏰ OVERDUE');
        setStatusClass('sla-overdue');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      setTimeLeft(`⏱ ${hours}h ${mins}m`);
      if (hours < 2) {
        setStatusClass('sla-red');
      } else if (hours < 6) {
        setStatusClass('sla-orange');
      } else {
        setStatusClass('sla-green');
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 60000);
    return () => clearInterval(interval);
  }, [deadline]);

  return <span className={`sla-badge ${statusClass}`}>{timeLeft}</span>;
};

export default function CoordinatorDashboard() {
  const { user } = useAuth();
  const { showToast } = useNotifications();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';

  const [reports, setReports] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [bins, setBins] = useState([]);
  const [supplyRequests, setSupplyRequests] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [analytics, setAnalytics] = useState({
    total: 0, resolved: 0, pending: 0, resolutionRate: 0,
    avgResponseHours: 0, recentWeek: 0, overdueSLA: 0, activeWorkers: 0
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [zones, setZones] = useState([]);
  const [activeNavDestination, setActiveNavDestination] = useState(null); // { name, lat, lng, type }

  // Form states
  const [newAnnouncement, setNewAnnouncement] = useState({
    zone_id: '', title: '', message: '', type: 'info', expires_at: ''
  });
  const [newBin, setNewBin] = useState({
    zone_id: '', location_desc: '', bin_type: 'general'
  });
  const [newSupplyRequest, setNewSupplyRequest] = useState({
    zone_id: '', item_name: '', quantity: 1, urgency: 'normal', notes: ''
  });

  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState('');
  const [photoReportId, setPhotoReportId] = useState(null);

  const token = localStorage.getItem('ecocampus_token');
  const API_BASE = API_BASE_URL;

  const fetchZones = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/zones`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setZones(data.status === 'success' ? data.zones : data);
      }
    } catch (err) {
      console.error('Fetch zones error:', err);
    }
  }, [token]);

  const fetchReports = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/coordinator/reports`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports || []);
      }
    } catch (err) {
      console.error('Fetch reports error:', err);
    }
  }, [token]);

  const fetchWorkers = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/coordinator/workers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setWorkers(data.workers || []);
      }
    } catch (err) {
      console.error('Fetch workers error:', err);
    }
  }, [token]);

  const fetchBins = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/coordinator/bins`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBins(data.bins || []);
      }
    } catch (err) {
      console.error('Fetch bins error:', err);
    }
  }, [token]);

  const fetchSupplyRequests = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/coordinator/supply-requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSupplyRequests(data.requests || []);
      }
    } catch (err) {
      console.error('Fetch supply requests error:', err);
    }
  }, [token]);

  const fetchAnnouncements = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/coordinator/announcements`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data.announcements || []);
      }
    } catch (err) {
      console.error('Fetch announcements error:', err);
    }
  }, [token]);

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/coordinator/analytics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (err) {
      console.error('Fetch analytics error:', err);
    }
  }, [token]);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        fetchZones(),
        fetchReports(),
        fetchWorkers(),
        fetchBins(),
        fetchSupplyRequests(),
        fetchAnnouncements(),
        fetchAnalytics()
      ]);
    } catch (err) {
      setError('Failed to refresh data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [fetchZones, fetchReports, fetchWorkers, fetchBins, fetchSupplyRequests, fetchAnnouncements, fetchAnalytics]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData, activeTab]);

  // Dispatch Action
  const handleAssignWorker = async (reportId, workerId) => {
    if (!workerId) return;
    try {
      const res = await fetch(`${API_BASE}/api/coordinator/assign/${reportId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ workerId })
      });
      if (res.ok) {
        await fetchReports();
        await fetchAnalytics();
      }
    } catch (err) {
      console.error('Worker assignment error:', err);
    }
  };

  // Status Action
  const handleUpdateStatus = async (reportId, status) => {
    try {
      const res = await fetch(`${API_BASE}/api/coordinator/status/${reportId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (res.ok) {
        await fetchReports();
        await fetchAnalytics();
        showToast({ type: 'success', title: 'Status Updated', message: `Report #${reportId} is now ${status.replace('_', ' ')}.` });
      } else {
        showToast({ type: 'error', title: 'Update Failed', message: data.error || 'Could not update report status.' });
      }
    } catch (err) {
      console.error('Status update error:', err);
      showToast({ type: 'error', title: 'Update Failed', message: 'Network error updating status.' });
    }
  };

  // Verification File Selection
  const handleSelectVerifyPhoto = (reportId, file) => {
    if (!file) return;
    setSelectedPhoto(file);
    setPhotoReportId(reportId);
    setPhotoPreviewUrl(URL.createObjectURL(file));
  };

  // Verification Actions
  const handleVerify = async (reportId, action) => {
    try {
      const formData = new FormData();
      formData.append('action', action);
      if (action === 'approve' && selectedPhoto && photoReportId === reportId) {
        formData.append('photo', selectedPhoto);
      }

      const res = await fetch(`${API_BASE}/api/coordinator/verify/${reportId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();

      if (res.ok) {
        setSelectedPhoto(null);
        setPhotoPreviewUrl('');
        setPhotoReportId(null);
        await fetchReports();
        await fetchAnalytics();
        showToast({
          type: 'success',
          title: action === 'approve' ? 'Cleanup Approved' : 'Cleanup Rejected',
          message: action === 'approve'
            ? `Report #${reportId} verified. +15 XP awarded to student.`
            : `Report #${reportId} sent back for re-submission.`,
        });
      } else {
        showToast({ type: 'error', title: 'Verification Failed', message: data.error || 'Could not process verification.' });
      }
    } catch (err) {
      console.error('Verification error:', err);
      showToast({ type: 'error', title: 'Verification Failed', message: 'Network error during verification.' });
    }
  };

  // Bin update
  const handleUpdateBin = async (binId, updates) => {
    try {
      const res = await fetch(`${API_BASE}/api/coordinator/bins/${binId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        await fetchBins();
      }
    } catch (err) {
      console.error('Bin update error:', err);
    }
  };

  // Bin create
  const handleCreateBin = async (e) => {
    e.preventDefault();
    if (!newBin.zone_id || !newBin.location_desc?.trim()) {
      showToast({ type: 'error', title: 'Validation Error', message: 'Zone and location description are required.' });
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/coordinator/bins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newBin)
      });
      const data = await res.json();
      if (res.ok) {
        setNewBin({ zone_id: '', location_desc: '', bin_type: 'general' });
        await fetchBins();
        showToast({ type: 'success', title: 'Bin Deployed', message: 'Waste bin registered successfully.' });
      } else {
        showToast({ type: 'error', title: 'Deploy Failed', message: data.error || 'Could not deploy bin.' });
      }
    } catch (err) {
      console.error('Bin create error:', err);
      showToast({ type: 'error', title: 'Deploy Failed', message: 'Network error deploying bin.' });
    }
  };

  // Supply Request create
  const handleCreateSupplyRequest = async (e) => {
    e.preventDefault();
    if (!newSupplyRequest.zone_id || !newSupplyRequest.item_name?.trim()) {
      showToast({ type: 'error', title: 'Validation Error', message: 'Zone and supply item are required.' });
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/coordinator/supply-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newSupplyRequest)
      });
      const data = await res.json();
      if (res.ok) {
        setNewSupplyRequest({ zone_id: '', item_name: '', quantity: 1, urgency: 'normal', notes: '' });
        await fetchSupplyRequests();
        showToast({ type: 'success', title: 'Request Submitted', message: 'Supply request sent for approval.' });
      } else {
        showToast({ type: 'error', title: 'Request Failed', message: data.error || 'Could not submit supply request.' });
      }
    } catch (err) {
      console.error('Supply request error:', err);
      showToast({ type: 'error', title: 'Request Failed', message: 'Network error submitting request.' });
    }
  };

  // Announcement create
  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    if (!newAnnouncement.zone_id || !newAnnouncement.title?.trim() || !newAnnouncement.message?.trim()) {
      showToast({ type: 'error', title: 'Validation Error', message: 'Zone, title, and message are required.' });
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/coordinator/announcements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newAnnouncement)
      });
      const data = await res.json();
      if (res.ok) {
        setNewAnnouncement({ zone_id: '', title: '', message: '', type: 'info', expires_at: '' });
        await fetchAnnouncements();
        showToast({ type: 'success', title: 'Notice Broadcast', message: 'Announcement sent to students and admin.' });
      } else {
        showToast({ type: 'error', title: 'Broadcast Failed', message: data.error || 'Could not broadcast announcement.' });
      }
    } catch (err) {
      console.error('Announcement create error:', err);
      showToast({ type: 'error', title: 'Broadcast Failed', message: 'Network error broadcasting announcement.' });
    }
  };

  // Announcement toggle active
  const handleToggleAnnouncement = async (id, currentActive) => {
    try {
      const res = await fetch(`${API_BASE}/api/coordinator/announcements/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ is_active: !currentActive })
      });
      if (res.ok) {
        await fetchAnnouncements();
      }
    } catch (err) {
      console.error('Announcement toggle error:', err);
    }
  };

  // Announcement delete
  const handleDeleteAnnouncement = async (id) => {
    if (!window.confirm('Delete this announcement?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/coordinator/announcements/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchAnnouncements();
      }
    } catch (err) {
      console.error('Announcement delete error:', err);
    }
  };

  // Helper: map status color classes
  const getStatusColor = (status) => {
    switch (status) {
      case 'reported': return 'badge-red';
      case 'under_review': return 'badge-yellow';
      case 'assigned': return 'badge-orange';
      case 'in_progress': return 'badge-blue';
      case 'resolved': return 'badge-green';
      default: return 'badge-ghost';
    }
  };

  // Hotspot circle color/radius by AI severity (dark red → red → yellow → green)
  const getHotspotStyle = (severity) => {
    const s = Number(severity) || 5;
    if (s >= 9) return { color: '#7f1d1d', fillColor: '#7f1d1d', fillOpacity: 0.35, radius: 55 };
    if (s >= 7) return { color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.3, radius: 45 };
    if (s >= 4) return { color: '#eab308', fillColor: '#eab308', fillOpacity: 0.28, radius: 38 };
    return { color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.22, radius: 30 };
  };

  // Helper: custom markers for status colors
  const getMarkerIcon = (status) => {
    let color = '#ef4444'; // reported
    if (status === 'under_review') color = '#eab308';
    if (status === 'assigned') color = '#f97316';
    if (status === 'in_progress') color = '#3b82f6';
    if (status === 'resolved') color = '#22c55e';

    return L.divIcon({
      className: '',
      html: `<div style="background-color: ${color}; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 6px rgba(0,0,0,0.4); animation: pulse 2s infinite;"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });
  };

  // Set active tab URL search param
  const handleTabChange = (tabName) => {
    setSearchParams({ tab: tabName });
  };

  // Filter reports for Verification tab (needs work/under review)
  const verificationReports = reports.filter(r => ['assigned', 'in_progress', 'under_review'].includes(r.status));

  // SLA overdue list for Overview alerts
  const overdueSLAReports = reports.filter(r => r.status !== 'resolved' && r.sla_deadline && new Date(r.sla_deadline) < new Date());

  return (
    <div className="app-layout coordinator-layout">
      <Sidebar />
      <main className="main-content coordinator-main">
        
        {/* Banner */}
        <div className="coordinator-header-banner">
          <div className="coordinator-banner-content">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span className="badge badge-primary" style={{ fontSize: '0.72rem', padding: '3px 10px' }}>
                  📍 {user?.district || 'Hyderabad'} District
                </span>
                <span className="badge" style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa', fontSize: '0.72rem', padding: '3px 10px' }}>
                  🛡️ Ward Sanitary Inspector
                </span>
              </div>
              <h1>🏛️ Municipal Ward Cleanliness &amp; Fleet Command Center</h1>
              <p>
                Sanitary Inspector: <strong>{user?.name}</strong> • Jurisdiction: 
                <span style={{ color: '#60a5fa', fontWeight: 'bold', marginLeft: '6px' }}>
                  {user?.assigned_ward || zones.find(z => z.id === user?.assigned_zone)?.name || 'All Municipal Wards'}
                </span>
              </p>
            </div>
            <button 
              className="btn btn-primary flex items-center gap-2 coordinator-refresh-btn" 
              onClick={fetchAllData}
              disabled={loading}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Data
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="coordinator-tabs-container">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'reports', label: 'Reports & Dispatch', icon: ClipboardList },
            { id: 'verification', label: 'Verification', icon: CheckCircle },
            { id: 'map', label: 'Zone Map', icon: Map },
            { id: 'bins', label: 'Bin Management', icon: Package },
            { id: 'announcements', label: 'Announcements', icon: Megaphone },
            { id: 'analytics', label: 'Analytics', icon: TrendingUp },
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`tab-btn flex items-center gap-2`}
                style={{
                  padding: '10px 18px',
                  borderRadius: '8px',
                  background: active ? 'rgba(59,130,246,0.12)' : 'transparent',
                  color: active ? '#60a5fa' : 'var(--text-secondary)',
                  border: active ? '1px solid rgba(59,130,246,0.3)' : '1px solid transparent',
                  fontWeight: active ? 700 : 500,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap'
                }}
              >
                <Icon size={16} /> {tab.label}
              </button>
            );
          })}
        </div>

        {error && (
          <div className="alert alert-danger mb-4 flex items-center gap-3">
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'overview' && (
          <div>
            {/* Stats Overview */}
            <div className="grid-4 mb-6">
              {[
                { label: 'Active Reports', value: analytics.pending, icon: '📋', color: '#3b82f6' },
                { label: 'Cleaned Reports', value: analytics.resolved, icon: '✅', color: '#10b981' },
                { label: 'Overdue SLA', value: analytics.overdueSLA, icon: '⏰', color: '#ef4444' },
                { label: 'Active Workers', value: analytics.activeWorkers, icon: '👷', color: '#f59e0b' },
              ].map((s, i) => (
                <div key={i} className="glass-card stat-card animate-fade-in-up">
                  <div className="stat-icon" style={{ background: s.color + '22' }}>
                    <span style={{ fontSize: '1.3rem' }}>{s.icon}</span>
                  </div>
                  <div className="stat-value">{s.value}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="grid-2 mb-6" style={{ alignItems: 'start' }}>
              {/* Overdue SLA Warnings */}
              <div className="glass-card" style={{ padding: '24px' }}>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-red-400">
                  <AlertTriangle size={20} /> Urgent SLA Warnings ({overdueSLAReports.length})
                </h3>
                {overdueSLAReports.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No overdue assignments. All cleanups are on schedule! 🎉</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {overdueSLAReports.slice(0, 5).map(r => (
                      <div key={r.id} className="priority-row flex justify-between items-center" style={{ borderLeft: '3px solid #ef4444', paddingLeft: '12px' }}>
                        <div>
                          <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>Report #{r.id} — {r.waste_type}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Zone: {r.zone_name} | Assigned: {r.assigned_worker_name || 'Unassigned'}</div>
                        </div>
                        <SLATimer deadline={r.sla_deadline} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Active Reports */}
              <div className="glass-card" style={{ padding: '24px' }}>
                <h3 className="text-lg font-semibold mb-4">Recent Submissions</h3>
                <div className="flex flex-col gap-3">
                  {reports.slice(0, 5).map(r => (
                    <div key={r.id} className="priority-row flex justify-between items-center">
                      <div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>Report #{r.id} — {r.zone_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Reporter: {r.reporter_name} | {new Date(r.created_at).toLocaleDateString()}</div>
                      </div>
                      <span className={`badge ${getStatusColor(r.status)}`}>{r.status}</span>
                    </div>
                  ))}
                  {reports.length === 0 && (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No complaints submitted in this zone yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── REPORTS & DISPATCH TAB ── */}
        {activeTab === 'reports' && (
          <div className="glass-card" style={{ padding: '24px' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Active Zone Complaints & Dispatch</h3>
              <span className="text-sm text-muted">{reports.length} Reports Found</span>
            </div>
            
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Photo</th>
                    <th>District &amp; Ward</th>
                    <th>Reporter</th>
                    <th>Type</th>
                    <th>AI Severity</th>
                    <th>SLA Timer</th>
                    <th>Assigned Sanitation Worker</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map(r => (
                    <tr key={r.id}>
                      <td>#{r.id}</td>
                      <td>
                        {r.photos && r.photos[0] ? (
                          <img 
                            src={`${API_BASE}${r.photos[0].url}`} 
                            alt="garbage" 
                            style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--glass-border)' }}
                          />
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>No Photo</span>
                        )}
                      </td>
                      <td>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#38bdf8' }}>📍 {r.district || 'Hyderabad'}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{r.ward_number || r.zone_name || 'Ward 1'}</div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{r.reporter_name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{r.reporter_email}</div>
                      </td>
                      <td>{r.waste_type}</td>
                      <td>
                        <span style={{ 
                          padding: '2px 8px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 700,
                          background: r.ai_severity >= 7 ? 'rgba(239,68,68,0.15)' : r.ai_severity >= 4 ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)',
                          color: r.ai_severity >= 7 ? '#f87171' : r.ai_severity >= 4 ? '#fbbf24' : '#34d399'
                        }}>
                          {r.ai_severity || 'N/A'}/10
                        </span>
                      </td>
                      <td>
                        <SLATimer deadline={r.sla_deadline} />
                      </td>
                      <td>
                        {r.status === 'resolved' ? (
                          <span style={{ color: 'var(--accent-green)', fontSize: '0.8rem', fontWeight: 600 }}>Resolved</span>
                        ) : (
                          <select
                            className="dispatch-select"
                            value={r.assigned_worker_id || ''}
                            onChange={(e) => handleAssignWorker(r.id, e.target.value)}
                            style={{ width: '130px', padding: '6px' }}
                          >
                            <option value="">Assign Worker...</option>
                            {workers.map(w => (
                              <option key={w.id} value={w.id}>{w.name}</option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${getStatusColor(r.status)}`}>{r.status}</span>
                      </td>
                      <td>
                        {r.status !== 'resolved' && (
                          <select
                            className="dispatch-select"
                            value={r.status}
                            onChange={(e) => handleUpdateStatus(r.id, e.target.value)}
                            style={{ padding: '6px' }}
                          >
                            <option value="reported">Reported</option>
                            <option value="under_review">Under Review</option>
                            <option value="assigned">Assigned</option>
                            <option value="in_progress">In Progress</option>
                            <option value="resolved">Resolved</option>
                          </select>
                        )}
                      </td>
                    </tr>
                  ))}
                  {reports.length === 0 && (
                    <tr>
                      <td colSpan="9" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                        No reports logged in your zone.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── VERIFICATION TAB ── */}
        {activeTab === 'verification' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Clean Verification & Points Approval</h3>
              <span className="badge badge-yellow">{verificationReports.length} Awaiting Verification</span>
            </div>

            <div className="flex flex-col gap-6">
              {verificationReports.map(r => (
                <div key={r.id} className="verification-card glass-card">
                  <div className="verification-header">
                    <h4>Report #{r.id} — Zone: {r.zone_name}</h4>
                    <div className="flex gap-2">
                      <span className="badge badge-ghost">Severity: {r.ai_severity}/10</span>
                      <span className="badge badge-blue">{r.waste_type}</span>
                    </div>
                  </div>
                  
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '16px' }}>
                    <strong>Description:</strong> {r.description}
                  </div>

                  <div className="verification-photos">
                    {/* Before Photo */}
                    <div className="photo-panel">
                      <div className="photo-label">📸 Before (Student Report)</div>
                      {r.photos && r.photos[0] ? (
                        <img 
                          src={`${API_BASE}${r.photos[0].url}`} 
                          alt="Before" 
                          className="verification-img" 
                        />
                      ) : (
                        <div className="no-photo">No before photo available</div>
                      )}
                    </div>

                    {/* After Photo Upload */}
                    <div className="photo-panel">
                      <div className="photo-label">✨ After (Cleaned Proof)</div>
                      {photoReportId === r.id && photoPreviewUrl ? (
                        <div style={{ position: 'relative' }}>
                          <img src={photoPreviewUrl} alt="After Preview" className="verification-img" />
                          <button 
                            className="btn btn-danger btn-sm" 
                            style={{ position: 'absolute', top: '10px', right: '10px', padding: '6px' }}
                            onClick={() => { setSelectedPhoto(null); setPhotoPreviewUrl(''); setPhotoReportId(null); }}
                          >
                            <Trash2 size={14} /> Remove
                          </button>
                        </div>
                      ) : (
                        <label className="upload-after-photo">
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={(e) => handleSelectVerifyPhoto(r.id, e.target.files[0])} 
                            style={{ display: 'none' }} 
                          />
                          <Plus size={24} style={{ marginBottom: '8px' }} />
                          <span>Upload cleaned photo proof</span>
                        </label>
                      )}
                    </div>
                  </div>

                  <div className="verification-actions mt-4 flex gap-3">
                    <button 
                      className="btn btn-primary flex items-center gap-2"
                      onClick={() => handleVerify(r.id, 'approve')}
                      disabled={photoReportId !== r.id || !selectedPhoto}
                    >
                      <CheckCircle size={16} /> Approve Cleanup & Award +15 XP
                    </button>
                    <button 
                      className="btn btn-outline flex items-center gap-2"
                      onClick={() => handleVerify(r.id, 'reject')}
                      style={{ borderColor: 'var(--accent-red)', color: 'var(--accent-red)' }}
                    >
                      <XCircle size={16} /> Reject Cleanup & Re-assign
                    </button>
                  </div>
                </div>
              ))}

              {verificationReports.length === 0 && (
                <div className="glass-card text-center" style={{ padding: '48px', color: 'var(--text-muted)' }}>
                  <CheckCircle size={48} style={{ margin: '0 auto 16px', color: 'var(--accent-green)' }} />
                  <h4>All caught up!</h4>
                  <p style={{ fontSize: '0.85rem' }}>No reports are currently in progress or waiting for verification.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── ZONE MAP TAB ── */}
        {activeTab === 'map' && (
          <div className="glass-card" style={{ padding: '24px', height: '600px', position: 'relative' }}>
            <h3 className="text-lg font-semibold mb-4">Zone Hotspots Map</h3>
            <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', flexWrap: 'wrap', fontSize: '0.78rem' }}>
              <span><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: '#7f1d1d', marginRight: 6 }} />Critical (9+)</span>
              <span><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: '#ef4444', marginRight: 6 }} />High (7–8)</span>
              <span><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: '#eab308', marginRight: 6 }} />Medium (4–6)</span>
              <span><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: '#22c55e', marginRight: 6 }} />Low (&lt;4)</span>
            </div>
            <div style={{ height: '480px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
              <MapContainer
                center={[17.4920, 78.3910]}
                zoom={16}
                style={{ width: '100%', height: '100%' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
                />

                {reports
                  .filter(r => r.latitude && r.longitude && r.status !== 'resolved')
                  .map(r => {
                    const hotspot = getHotspotStyle(r.ai_severity);
                    return (
                      <Circle
                        key={`circle-${r.id}`}
                        center={[parseFloat(r.latitude), parseFloat(r.longitude)]}
                        radius={hotspot.radius}
                        pathOptions={{
                          color: hotspot.color,
                          fillColor: hotspot.fillColor,
                          fillOpacity: hotspot.fillOpacity,
                          weight: 2,
                        }}
                      />
                    );
                  })}
                
                {reports
                  .filter(r => r.latitude && r.longitude)
                  .map(r => (
                    <Marker 
                      key={r.id} 
                      position={[parseFloat(r.latitude), parseFloat(r.longitude)]}
                      icon={getMarkerIcon(r.status)}
                    >
                      <Popup>
                        <div style={{ minWidth: '150px' }}>
                          <h4 style={{ margin: '0 0 6px', fontSize: '0.88rem' }}>Report #{r.id}</h4>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                            <strong>Type:</strong> {r.waste_type} <br />
                            <strong>Status:</strong> {r.status} <br />
                            <strong>Severity:</strong> {r.ai_severity ?? '—'} <br />
                            <strong>Zone:</strong> {r.zone_name}
                          </div>
                          {r.photos && r.photos[0] && (
                            <img 
                              src={`${API_BASE}${r.photos[0].url}`} 
                              alt="Garbage popup" 
                              style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '4px' }}
                            />
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  ))}
              </MapContainer>
            </div>
          </div>
        )}

        {/* ── BIN MANAGEMENT TAB ── */}
        {activeTab === 'bins' && (
          <div>
            {/* Create Bin Section */}
            <div className="grid-2 mb-6" style={{ alignItems: 'stretch' }}>
              <div className="glass-card" style={{ padding: '24px' }}>
                <h3 className="text-lg font-semibold mb-4">Register New Waste Bin</h3>
                <form onSubmit={handleCreateBin} className="flex flex-col gap-3">
                  <div>
                    <label className="sidebar-section-label" style={{ display: 'block', marginBottom: '6px' }}>Target Zone</label>
                    <select
                      className="input-field"
                      required
                      value={newBin.zone_id}
                      onChange={(e) => setNewBin({ ...newBin, zone_id: e.target.value })}
                    >
                      <option value="">Select Zone...</option>
                      {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="sidebar-section-label" style={{ display: 'block', marginBottom: '6px' }}>Location Description</label>
                    <input 
                      type="text" 
                      className="input-field"
                      required
                      placeholder="e.g. Near Library Gate, Block B Stairs"
                      value={newBin.location_desc}
                      onChange={(e) => setNewBin({ ...newBin, location_desc: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="sidebar-section-label" style={{ display: 'block', marginBottom: '6px' }}>Bin Category</label>
                    <select
                      className="input-field"
                      value={newBin.bin_type}
                      onChange={(e) => setNewBin({ ...newBin, bin_type: e.target.value })}
                    >
                      <option value="general">General Waste</option>
                      <option value="recyclable">Recyclable</option>
                      <option value="hazardous">Hazardous</option>
                      <option value="organic">Organic</option>
                    </select>
                  </div>
                  <button type="submit" className="btn btn-primary flex items-center justify-center gap-2 mt-2">
                    <Plus size={16} /> Deploy Bin
                  </button>
                </form>
              </div>

              {/* Request Supplies Form */}
              <div className="glass-card" style={{ padding: '24px' }}>
                <h3 className="text-lg font-semibold mb-4">Request Supplies</h3>
                <form onSubmit={handleCreateSupplyRequest} className="flex flex-col gap-3">
                  <div className="flex gap-3">
                    <div style={{ flex: 1 }}>
                      <label className="sidebar-section-label" style={{ display: 'block', marginBottom: '6px' }}>Zone</label>
                      <select
                        className="input-field"
                        required
                        value={newSupplyRequest.zone_id}
                        onChange={(e) => setNewSupplyRequest({ ...newSupplyRequest, zone_id: e.target.value })}
                      >
                        <option value="">Select Zone...</option>
                        {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                      </select>
                    </div>
                    <div style={{ width: '120px' }}>
                      <label className="sidebar-section-label" style={{ display: 'block', marginBottom: '6px' }}>Urgency</label>
                      <select
                        className="input-field"
                        value={newSupplyRequest.urgency}
                        onChange={(e) => setNewSupplyRequest({ ...newSupplyRequest, urgency: e.target.value })}
                      >
                        <option value="low">Low</option>
                        <option value="normal">Normal</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div style={{ flex: 2 }}>
                      <label className="sidebar-section-label" style={{ display: 'block', marginBottom: '6px' }}>Supply Item</label>
                      <input 
                        type="text" 
                        className="input-field"
                        required
                        placeholder="e.g. Garbage Bags (Large), Heavy Gloves"
                        value={newSupplyRequest.item_name}
                        onChange={(e) => setNewSupplyRequest({ ...newSupplyRequest, item_name: e.target.value })}
                      />
                    </div>
                    <div style={{ width: '80px' }}>
                      <label className="sidebar-section-label" style={{ display: 'block', marginBottom: '6px' }}>Qty</label>
                      <input 
                        type="number" 
                        min="1"
                        className="input-field"
                        required
                        value={newSupplyRequest.quantity}
                        onChange={(e) => setNewSupplyRequest({ ...newSupplyRequest, quantity: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="sidebar-section-label" style={{ display: 'block', marginBottom: '6px' }}>Coordinators Notes</label>
                    <textarea 
                      className="input-field"
                      rows="2"
                      placeholder="e.g. Current stock running out, need for organic waste collection"
                      value={newSupplyRequest.notes}
                      onChange={(e) => setNewSupplyRequest({ ...newSupplyRequest, notes: e.target.value })}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary flex items-center justify-center gap-2 mt-2">
                    <Send size={16} /> Submit Supply Request
                  </button>
                </form>
              </div>
            </div>

            {/* Bins list */}
            <h3 className="text-lg font-semibold mb-4">Deploys & Fill Levels</h3>
            <div className="grid-3 mb-6">
              {bins.map(b => (
                <div key={b.id} className="bin-card glass-card">
                  <div className="bin-header">
                    <span>🗑️ {b.location_desc}</span>
                    <span className={`badge ${b.status === 'active' ? 'badge-green' : b.status === 'full' ? 'badge-red' : 'badge-yellow'}`}>{b.status}</span>
                  </div>
                  <div className="bin-type">Category: {b.bin_type} ({b.zone_name})</div>
                  <div className="bin-fill">
                    <div className="bin-fill-bar">
                      <div className="bin-fill-level" style={{ width: `${b.fill_level}%`, background: b.fill_level > 80 ? '#ef4444' : b.fill_level > 50 ? '#f59e0b' : '#10b981' }} />
                    </div>
                    <span>{b.fill_level}%</span>
                  </div>
                  <div className="bin-footer flex justify-between items-center" style={{ marginTop: '12px' }}>
                    <span>Last Emptied: {b.last_emptied ? new Date(b.last_emptied).toLocaleDateString() : 'Never'}</span>
                    <div className="flex gap-2 items-center">
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={b.fill_level} 
                        onChange={(e) => handleUpdateBin(b.id, { fill_level: parseInt(e.target.value), status: parseInt(e.target.value) >= 90 ? 'full' : 'active' })} 
                        style={{ width: '70px', height: '4px', cursor: 'pointer' }} 
                      />
                    </div>
                  </div>
                </div>
              ))}
              {bins.length === 0 && (
                <div className="glass-card text-center" style={{ gridColumn: 'span 3', padding: '24px', color: 'var(--text-muted)' }}>No waste bins active.</div>
              )}
            </div>

            {/* Supply requests history */}
            <div className="glass-card" style={{ padding: '24px' }}>
              <h3 className="text-lg font-semibold mb-4">Supply Dispatch Logs</h3>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Item Name</th>
                      <th>Quantity</th>
                      <th>Urgency</th>
                      <th>Zone</th>
                      <th>Status</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supplyRequests.map(sr => (
                      <tr key={sr.id}>
                        <td>#{sr.id}</td>
                        <td>{sr.item_name}</td>
                        <td>{sr.quantity}</td>
                        <td>
                          <span className={`badge ${sr.urgency === 'critical' || sr.urgency === 'high' ? 'badge-red' : 'badge-ghost'}`}>
                            {sr.urgency}
                          </span>
                        </td>
                        <td>{sr.zone_name}</td>
                        <td>
                          <span className={`badge ${sr.status === 'approved' || sr.status === 'delivered' ? 'badge-green' : sr.status === 'rejected' ? 'badge-red' : 'badge-yellow'}`}>
                            {sr.status}
                          </span>
                        </td>
                        <td>{new Date(sr.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                    {supplyRequests.length === 0 && (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                          No supply requests submitted.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── ANNOUNCEMENTS TAB ── */}
        {activeTab === 'announcements' && (
          <div className="grid-2" style={{ alignItems: 'start' }}>
            {/* Create Announcement */}
            <div className="glass-card" style={{ padding: '24px' }}>
              <h3 className="text-lg font-semibold mb-4">Broadcast New Announcement</h3>
              <form onSubmit={handleCreateAnnouncement} className="flex flex-col gap-3">
                <div>
                  <label className="sidebar-section-label" style={{ display: 'block', marginBottom: '6px' }}>Target Zone</label>
                  <select
                    className="input-field"
                    required
                    value={newAnnouncement.zone_id}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, zone_id: e.target.value })}
                  >
                    <option value="">Select Zone...</option>
                    <option value="all">All Zones</option>
                    {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="sidebar-section-label" style={{ display: 'block', marginBottom: '6px' }}>Announcement Title</label>
                  <input 
                    type="text" 
                    className="input-field"
                    required
                    placeholder="e.g. Canteen organic bin relocated"
                    value={newAnnouncement.title}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                  />
                </div>
                <div>
                  <label className="sidebar-section-label" style={{ display: 'block', marginBottom: '6px' }}>Broadcast Message</label>
                  <textarea 
                    className="input-field"
                    required
                    rows="3"
                    placeholder="e.g. Due to construction work, organic waste bins are moved..."
                    value={newAnnouncement.message}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, message: e.target.value })}
                  />
                </div>
                <div className="flex gap-3">
                  <div style={{ flex: 1 }}>
                    <label className="sidebar-section-label" style={{ display: 'block', marginBottom: '6px' }}>Notice Type</label>
                    <select
                      className="input-field"
                      value={newAnnouncement.type}
                      onChange={(e) => setNewAnnouncement({ ...newAnnouncement, type: e.target.value })}
                    >
                      <option value="info">Info (Blue)</option>
                      <option value="warning">Warning (Orange)</option>
                      <option value="maintenance">Maintenance (Purple)</option>
                      <option value="event">Event (Green)</option>
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="sidebar-section-label" style={{ display: 'block', marginBottom: '6px' }}>Expires At</label>
                    <input 
                      type="datetime-local" 
                      className="input-field"
                      value={newAnnouncement.expires_at}
                      onChange={(e) => setNewAnnouncement({ ...newAnnouncement, expires_at: e.target.value })}
                    />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary flex items-center justify-center gap-2 mt-2">
                  <Megaphone size={16} /> Broadcast Notice
                </button>
              </form>
            </div>

            {/* Announcements list */}
            <div className="glass-card" style={{ padding: '24px' }}>
              <h3 className="text-lg font-semibold mb-4">Active Broadcasts</h3>
              <div className="flex flex-col gap-3">
                {announcements.map(a => (
                  <div key={a.id} className={`announcement-card glass-card type-${a.type} ${!a.is_active ? 'inactive' : ''}`}>
                    <div className="announcement-header">
                      <h4>{a.title}</h4>
                      <span className={`badge badge-ghost`} style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>
                        {a.type} | {a.zone_name}
                      </span>
                    </div>
                    <div className="announcement-body">{a.message}</div>
                    <div className="announcement-footer">
                      <span>Expires: {a.expires_at ? new Date(a.expires_at).toLocaleString() : 'Never'}</span>
                      <div className="flex gap-2">
                        <button 
                          className={`btn ${a.is_active ? 'btn-outline' : 'btn-primary'} btn-sm`} 
                          onClick={() => handleToggleAnnouncement(a.id, a.is_active)}
                        >
                          {a.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button 
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDeleteAnnouncement(a.id)}
                          style={{ padding: '6px' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {announcements.length === 0 && (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>No active broadcasts in this zone.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── ANALYTICS TAB ── */}
        {activeTab === 'analytics' && (
          <div>
            <div className="grid-4 mb-6">
              <div className="glass-card stat-card">
                <div className="stat-value">{analytics.resolutionRate}%</div>
                <div className="stat-label">Resolution Rate</div>
              </div>
              <div className="glass-card stat-card">
                <div className="stat-value">{analytics.avgResponseHours}h</div>
                <div className="stat-label">Avg. Response Time</div>
              </div>
              <div className="glass-card stat-card">
                <div className="stat-value">{analytics.recentWeek}</div>
                <div className="stat-label">This Week's Submissions</div>
              </div>
              <div className="glass-card stat-card">
                <div className="stat-value">{analytics.overdueSLA}</div>
                <div className="stat-label">Overdue SLAs</div>
              </div>
            </div>

            <div className="glass-card" style={{ padding: '24px' }}>
              <h3 className="text-lg font-semibold mb-4">Monthly Zone Statistics</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[
                  { label: 'Organic waste processed', value: 85, color: '#10b981' },
                  { label: 'Recyclables sorted', value: 72, color: '#3b82f6' },
                  { label: 'Avg cleanup confirmation time', value: 92, color: '#8b5cf6' },
                  { label: 'Student participation index', value: 64, color: '#f59e0b' },
                ].map((stat, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span style={{ color: 'var(--text-secondary)' }}>{stat.label}</span>
                      <span style={{ color: stat.color, fontWeight: 700 }}>{stat.value}%</span>
                    </div>
                    <div className="eff-bar-bg" style={{ height: '10px' }}>
                      <div className="eff-bar-fill" style={{ width: `${stat.value}%`, background: stat.color, borderRadius: '4px' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
