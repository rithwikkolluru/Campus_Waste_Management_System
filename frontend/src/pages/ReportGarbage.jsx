import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import {
  Upload, MapPin, X, Camera, FileText, Send, ArrowLeft, Star,
  Sparkles, AlertTriangle, CheckCircle, Image as ImageIcon,
  Shield, ShieldCheck, ShieldAlert, Crosshair, Map, Navigation, Tag
} from 'lucide-react';
import { validateImageFile } from '../utils/validation';
import usePoints from '../hooks/usePoints';
import { API_BASE_URL } from '../config';
import { analyzeImageLocal, loadYoloModel } from '../utils/yoloClassifier';
import { reverseGeocode } from '../utils/geoCoder';
import { inspectImageAuthenticity } from '../utils/exifInspector';
import {
  CIVIC_ISSUE_CATEGORIES,
  TELANGANA_DISTRICTS,
  MUNICIPAL_CORPORATIONS,
  DISTRICT_MANDALS,
  DEFAULT_WARDS,
  TELANGANA_MUNICIPAL_ZONES
} from '../data/administrativeData';
import './Dashboard.css';
import CameraCapture from '../components/CameraCapture';
import LocationVerifier from '../components/LocationVerifier';
import ZoneWarning from '../components/ZoneWarning';
import SafeImage from '../components/SafeImage';

const BIN_COLORS = {
  Blue:   { bg: '#2563eb22', border: '#2563eb60', dot: '#3b82f6', label: '🔵' },
  Green:  { bg: '#05966922', border: '#05966960', dot: '#10b981', label: '🟢' },
  Red:    { bg: '#dc262622', border: '#dc262660', dot: '#ef4444', label: '🔴' },
  Yellow: { bg: '#ca8a0422', border: '#ca8a0460', dot: '#f59e0b', label: '🟡' },
  Black:  { bg: '#37415122', border: '#37415160', dot: '#6b7280', label: '⚫' },
};

const SEVERITY_CONFIG = {
  1: { color: '#10b981', label: '🟢 Very Low' },  2: { color: '#10b981', label: '🟢 Low' },
  3: { color: '#10b981', label: '🟢 Low' },        4: { color: '#f59e0b', label: '🟡 Moderate' },
  5: { color: '#f59e0b', label: '🟡 Medium' },     6: { color: '#f59e0b', label: '🟡 Medium' },
  7: { color: '#ef4444', label: '🔴 High' },       8: { color: '#ef4444', label: '🔴 High' },
  9: { color: '#dc2626', label: '🚨 Critical' },   10: { color: '#dc2626', label: '🚨 Critical' },
};

const compressImage = (file) => new Promise((resolve) => {
  const canvas = document.createElement('canvas');
  const img    = new Image();
  img.onload = () => {
    const maxWidth = 1000;
    const ratio    = Math.min(maxWidth / img.width, 1);
    canvas.width   = img.width  * ratio;
    canvas.height  = img.height * ratio;
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(new File([blob], file.name, { type: 'image/jpeg' }));
      } else {
        resolve(file);
      }
    }, 'image/jpeg', 0.75);
  };
  img.onerror = () => resolve(file);
  img.src = URL.createObjectURL(file);
});

export default function ReportGarbage() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const fileRef  = useRef(null);
  const token    = localStorage.getItem('ecocampus_token');
  const { refreshPoints } = usePoints(token);
  const { notify } = useNotifications();

  // ── Form state ────────────────────────────────────────────────────────────
  const [selectedCategory, setSelectedCategory] = useState(CIVIC_ISSUE_CATEGORIES[0]);
  const [fileObj, setFileObj]         = useState(null);
  const [preview, setPreview]         = useState(null);
  const [description, setDesc]        = useState('');
  const [priority, setPriority]       = useState('Medium');
  const [dragOver, setDragOver]       = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [success, setSuccess]         = useState(false);
  const [reportResult, setReportResult] = useState(null);

  // ── AI state ──────────────────────────────────────────────────────────────
  const [aiAnalyzing, setAiAnalyzing]     = useState(false);
  const [aiSuggestion, setAiSuggestion]   = useState(null);
  const [authenticity, setAuthenticity]   = useState(null);

  // ── Location & State Hierarchy ────────────────────────────────────────────
  const [locationVerified, setLocationVerified] = useState(false);
  const [coords, setCoords]                     = useState({ lat: null, lng: null, accuracy: null });
  const [geoDetails, setGeoDetails]             = useState(null);
  const [selectedState, setSelectedState]       = useState('Telangana');
  const [selectedDistrict, setSelectedDistrict] = useState(user?.district || 'Hyderabad');
  const [selectedMunicipality, setSelectedMunicipality] = useState(MUNICIPAL_CORPORATIONS['Hyderabad'] || 'Greater Hyderabad Municipal Corporation (GHMC)');
  const [selectedMandal, setSelectedMandal]     = useState('Khairatabad');
  const [selectedWard, setSelectedWard]         = useState('Ward 1 - Central Administrative Circle');
  const [areaLocality, setAreaLocality]         = useState('');
  const [landmark, setLandmark]                 = useState('');
  const [locationError, setLocationError]       = useState(null);
  const [zoneStatus, setZoneStatus]             = useState(null);

  useEffect(() => {
    loadYoloModel().catch(console.error);
  }, []);

  // Update municipality and mandals when district changes
  const handleDistrictChange = (dist) => {
    setSelectedDistrict(dist);
    setSelectedMunicipality(MUNICIPAL_CORPORATIONS[dist] || `${dist} Municipality`);
    const mandals = DISTRICT_MANDALS[dist] || [];
    setSelectedMandal(mandals[0] || 'Urban Mandal');
  };

  const handleLocationVerified = async ({ lat, lng, accuracy }) => {
    setLocationVerified(true);
    setCoords({ lat, lng, accuracy });
    setLocationError(null);

    // OpenStreetMap Reverse Geocoding
    try {
      const geo = await reverseGeocode(lat, lng);
      setGeoDetails(geo);

      if (geo.state) setSelectedState(geo.state);
      if (geo.district) {
        const matchedDist = TELANGANA_DISTRICTS.find(d => d.toLowerCase() === geo.district.toLowerCase()) || geo.district;
        setSelectedDistrict(matchedDist);
        if (MUNICIPAL_CORPORATIONS[matchedDist]) {
          setSelectedMunicipality(MUNICIPAL_CORPORATIONS[matchedDist]);
        }
      }
      if (geo.ward) {
        setAreaLocality(geo.ward);
      }
    } catch (err) {
      console.warn('Geocoding notice:', err);
    }

    // Fetch zone activity status
    try {
      const res = await fetch(`${API_BASE_URL}/api/zones/check-status?lat=${lat}&lng=${lng}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setZoneStatus(data);
      }
    } catch (err) {
      console.error('Failed to check zone status', err);
    }
  };

  const handleLocationFailed = (error) => {
    setLocationVerified(false);
    setLocationError(error);
  };

  // ── Handle photo selection + AI analysis ─────────────────────────────────
  const handleFile = async (file) => {
    if (!file) return;
    const result = validateImageFile(file);
    if (!result.ok) {
      notify({ type: 'error', title: 'Invalid File', message: result.error, duration: 4000 });
      return;
    }
    setFileObj(file);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(file);

    setAiSuggestion(null);
    setAuthenticity(null);

    // Client-side EXIF inspection
    try {
      const authReport = await inspectImageAuthenticity(file, Boolean(file.isLiveCameraCapture));
      setAuthenticity(authReport);
      if (!authReport.isAuthentic) {
        notify({
          type: 'warning',
          title: 'Authenticity Alert',
          message: authReport.badgeDesc || 'Potential synthetic or digital screen capture detected.',
          duration: 6000
        });
      }
    } catch (err) {
      console.warn('Authenticity check skipped:', err);
    }

    // Server AI pre-analysis
    setAiAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res  = await fetch(`${API_BASE_URL}/api/reports/analyze-photo`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}` },
        body:    formData,
      });
      const data = await res.json();
      if (res.ok && data.success && data.aiResult?.aiAvailable) {
        setAiSuggestion(data.aiResult);

        if (data.aiResult.isFake || data.aiResult.isAiGenerated || data.aiResult.isScreenPhoto) {
          notify({
            type: 'error',
            title: data.aiResult.isAiGenerated ? 'Synthetic Image Alert' : 'Photo Verification Notice',
            message: data.aiResult.fakeReason || 'Image appears to be synthetic, a screenshot, or non-garbage.',
            duration: 7000
          });
        }
      } else {
        throw new Error(data.aiResult?.reason || 'Cloud AI unavailable');
      }
    } catch (err) {
      console.log('Falling back to on-device YOLO classifier...', err.message);
      try {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        await new Promise((resolve) => { img.onload = resolve; });
        const localResult = await analyzeImageLocal(img);
        setAiSuggestion(localResult);
      } catch (yoloErr) {
        setAiSuggestion({ aiAvailable: false, reason: 'AI analysis optional — manual categorization active' });
      }
    } finally {
      setAiAnalyzing(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  };

  // ── Submit Report ────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!coords.lat || !coords.lng) {
      notify({
        type: 'error',
        title: 'Location Required',
        message: 'Please allow GPS location or use current location before submitting.',
        duration: 5000
      });
      return;
    }

    if (!description.trim() || description.trim().length < 5) {
      notify({
        type: 'error',
        title: 'Description Needed',
        message: 'Please provide a short description (at least 5 characters).',
        duration: 4000
      });
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('zone_id', 1);
      formData.append('waste_type', selectedCategory.label);
      formData.append('description', description);
      formData.append('priority', priority.toLowerCase());
      formData.append('user_id', user?.id || 1);
      formData.append('latitude', coords.lat);
      formData.append('longitude', coords.lng);
      formData.append('gps_accuracy', coords.accuracy || '');
      formData.append('state', selectedState);
      formData.append('district', selectedDistrict);
      formData.append('city_municipality', selectedMunicipality);
      formData.append('mandal', selectedMandal);
      formData.append('ward_number', selectedWard);
      formData.append('area_locality', areaLocality || geoDetails?.ward || 'Central Locality');
      formData.append('landmark', landmark);
      formData.append('pincode', geoDetails?.pincode || '500001');

      const locSummary = [
        landmark,
        areaLocality || geoDetails?.ward,
        selectedWard,
        selectedMunicipality,
        selectedDistrict,
        selectedState
      ].filter(Boolean).join(', ');
      formData.append('location', locSummary);
      formData.append('formatted_address', geoDetails?.formattedAddress || locSummary);

      if (fileObj) {
        const compressed = await compressImage(fileObj);
        formData.append('image', compressed);
      }

      const res = await fetch(`${API_BASE_URL}/api/reports/submit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();

      if (!res.ok && data.isFake) {
        setSubmitting(false);
        setReportResult({ isFake: true, reason: data.reason });
        setSuccess(true);
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || data.message || 'Submission failed');
      }

      setReportResult({
        id: `RPT-00${data.reportId}`,
        category: selectedCategory.label,
        location: locSummary,
        lat: coords.lat,
        lng: coords.lng,
        accuracy: coords.accuracy,
        status: 'Submitted / Pending Verification',
        submittedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        points: data.pointsEarned || 0,
        photoPoints: data.photoPointsEarned || 0,
        reportPoints: data.reportPointsEarned || 0,
        aiResult: data.aiResult || null,
        photoUrl: data.photoUrl,
        newTotalPoints: data.newTotalPoints,
      });

      if (data.pointsEarned && user) {
        setUser({ ...user, total_points: data.newTotalPoints || (user.total_points || 0) + data.pointsEarned });
      }
      refreshPoints();
      setSubmitting(false);
      setSuccess(true);
      notify({
        type: 'success',
        title: 'Civic Report Registered!',
        message: `Report for ${selectedDistrict} submitted successfully.`,
        category: 'report',
        icon: '🏛️',
        duration: 5000
      });
    } catch (err) {
      setSubmitting(false);
      notify({
        type: 'error',
        title: 'Submission Error',
        message: err.message || 'Could not submit report. Ensure backend is running.',
        duration: 6000
      });
    }
  };

  const resetForm = () => {
    setPreview(null);
    setFileObj(null);
    setDesc('');
    setAreaLocality('');
    setLandmark('');
    setAiSuggestion(null);
    setReportResult(null);
    setSuccess(false);
  };

  const progress = [
    !!selectedCategory,
    !!preview,
    !!(coords.lat && coords.lng),
    description.trim().length >= 5
  ].filter(Boolean).length;

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-header flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/citizen')} id="back-to-dashboard">
              <ArrowLeft size={16} /> Dashboard
            </button>
            <div>
              <h1>🏛️ Report Civic Cleanliness Issue</h1>
              <p>Submit garbage, sanitation, or infrastructure complaints with automatic GPS geo-tagging</p>
            </div>
          </div>
          <span className="badge badge-primary" style={{ padding: '6px 14px', fontSize: '0.85rem' }}>
            +15 Municipal Tax Rebate Points
          </span>
        </div>

        {/* 6-Step Workflow Progress Bar */}
        <div className="glass-card" style={{ padding: '16px 20px', marginBottom: '24px' }}>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold">Civic Report Workflow ({progress}/4 steps completed)</span>
            <span className="text-sm text-accent font-bold">{Math.round((progress / 4) * 100)}%</span>
          </div>
          <div style={{ height: '6px', background: 'var(--glass-border)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${(progress / 4) * 100}%`, height: '100%', background: 'var(--gradient-primary)', borderRadius: '4px', transition: 'width 0.4s ease' }} />
          </div>
          <div className="flex gap-4 mt-2 flex-wrap" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <span style={{ color: selectedCategory ? 'var(--accent-green)' : 'inherit' }}>1. Select Issue</span>
            <span style={{ color: preview ? 'var(--accent-green)' : 'inherit' }}>2. Photo Evidence</span>
            <span style={{ color: coords.lat ? 'var(--accent-green)' : 'inherit' }}>3. Detect Location</span>
            <span style={{ color: description.trim().length >= 5 ? 'var(--accent-green)' : 'inherit' }}>4. Description &amp; Submit</span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="glass-card report-form-card" style={{ padding: '24px' }}>

            {/* STEP 1: Select Civic Issue Category */}
            <div className="form-section mb-6">
              <label className="form-label font-bold text-sm mb-3 block" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Tag size={16} style={{ color: 'var(--accent-green)' }} />
                STEP 1: SELECT CIVIC ISSUE CATEGORY
              </label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
                  gap: '10px'
                }}
              >
                {CIVIC_ISSUE_CATEGORIES.map((cat) => {
                  const isSelected = selectedCategory?.id === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(cat);
                        setPriority(cat.defaultPriority);
                      }}
                      className="glass-card"
                      style={{
                        padding: '12px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        borderRadius: '10px',
                        border: isSelected ? '2px solid var(--accent-green)' : '1px solid var(--glass-border)',
                        background: isSelected ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-card)',
                        color: 'var(--text-primary)',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <span style={{ fontSize: '1.4rem' }}>{cat.icon}</span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: isSelected ? 700 : 500, lineHeight: 1.2 }}>
                          {cat.label}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* STEP 2: Photo Capture & AI Classification */}
            <div className="form-section mb-6">
              <label className="form-label font-bold text-sm mb-3 block" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Camera size={16} style={{ color: '#38bdf8' }} />
                STEP 2: CAPTURE OR UPLOAD EVIDENCE PHOTO
              </label>

              <CameraCapture onCapture={handleFile} />

              <div className="camera-divider">or choose from device storage</div>

              <div
                className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                style={{
                  border: '2px dashed var(--glass-border)',
                  borderRadius: '12px',
                  padding: '24px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)'
                }}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                  style={{ display: 'none' }}
                />
                <Upload size={32} style={{ margin: '0 auto 8px', color: 'var(--text-muted)' }} />
                <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>Click to browse or drag &amp; drop an image</p>
                <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>JPEG, PNG, WebP up to 10MB</p>
              </div>

              {preview && (
                <div style={{ marginTop: '16px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ width: '120px', height: '120px', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
                    <img src={preview} alt="Upload preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: '220px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span className="badge badge-green">✓ Photo Loaded</span>
                      {authenticity?.badgeDesc && (
                        <span className="badge badge-blue">🛡️ {authenticity.badgeDesc}</span>
                      )}
                    </div>
                    {aiAnalyzing && (
                      <p style={{ fontSize: '0.82rem', color: '#a78bfa', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="spinner" style={{ width: '14px', height: '14px' }} />
                        Analyzing photo with Gemini AI...
                      </p>
                    )}
                    {aiSuggestion?.wasteType && (
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        AI Identified: <strong style={{ color: '#a78bfa' }}>{aiSuggestion.wasteType}</strong> ({aiSuggestion.confidence || 90}% confidence)
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* STEP 3 & 4: Automatic Location Detection + REPORT LOCATION Form Details */}
            <div className="form-section mb-6">
              <label className="form-label font-bold text-sm mb-3 block" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Navigation size={16} style={{ color: '#a78bfa' }} />
                STEP 3 &amp; 4: REPORT LOCATION (AUTOMATIC GPS &amp; ADMINISTRATIVE DETAILS)
              </label>

              <LocationVerifier
                onLocationVerified={handleLocationVerified}
                onLocationFailed={handleLocationFailed}
                geoDetails={geoDetails}
              />

              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '12px',
                  padding: '20px',
                  marginTop: '16px'
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                  {/* State */}
                  <div>
                    <label className="form-label text-xs text-muted block mb-1">State</label>
                    <input
                      type="text"
                      className="input-field"
                      value={selectedState}
                      readOnly
                      style={{ opacity: 0.9, backgroundColor: 'rgba(255,255,255,0.03)' }}
                    />
                  </div>

                  {/* District */}
                  <div>
                    <label className="form-label text-xs text-muted block mb-1">District</label>
                    <select
                      className="input-field"
                      value={selectedDistrict}
                      onChange={(e) => handleDistrictChange(e.target.value)}
                    >
                      {TELANGANA_DISTRICTS.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  {/* Municipality */}
                  <div>
                    <label className="form-label text-xs text-muted block mb-1">Municipality / Corporation</label>
                    <input
                      type="text"
                      className="input-field"
                      value={selectedMunicipality}
                      onChange={(e) => setSelectedMunicipality(e.target.value)}
                    />
                  </div>

                  {/* Mandal */}
                  <div>
                    <label className="form-label text-xs text-muted block mb-1">Mandal</label>
                    <select
                      className="input-field"
                      value={selectedMandal}
                      onChange={(e) => setSelectedMandal(e.target.value)}
                    >
                      {(DISTRICT_MANDALS[selectedDistrict] || ['Urban Mandal', 'Rural Mandal']).map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  {/* Ward */}
                  <div>
                    <label className="form-label text-xs text-muted block mb-1">Ward Number / Name</label>
                    <select
                      className="input-field"
                      value={selectedWard}
                      onChange={(e) => setSelectedWard(e.target.value)}
                    >
                      {DEFAULT_WARDS.map(w => (
                        <option key={w} value={w}>{w}</option>
                      ))}
                    </select>
                  </div>

                  {/* Area / Locality */}
                  <div>
                    <label className="form-label text-xs text-muted block mb-1">Area / Locality / Street</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. Near Bus Stand, Main Road"
                      value={areaLocality}
                      onChange={(e) => setAreaLocality(e.target.value)}
                    />
                  </div>

                  {/* Landmark */}
                  <div>
                    <label className="form-label text-xs text-muted block mb-1">Landmark (Optional)</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. Opposite State Bank, Near Metro Pillar"
                      value={landmark}
                      onChange={(e) => setLandmark(e.target.value)}
                    />
                  </div>

                  {/* GPS Coordinates & Accuracy */}
                  <div>
                    <label className="form-label text-xs text-muted block mb-1">GPS Coordinates &amp; Accuracy</label>
                    <input
                      type="text"
                      className="input-field"
                      readOnly
                      value={coords.lat && coords.lng ? `${coords.lat}, ${coords.lng} (±${coords.accuracy || 10}m)` : 'GPS detecting...'}
                      style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#38bdf8' }}
                    />
                  </div>
                </div>

                {coords.lat && coords.lng && (
                  <div style={{ marginTop: '14px', display: 'flex', gap: '10px' }}>
                    <a
                      href={`https://www.google.com/maps?q=${coords.lat},${coords.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Map size={14} /> View on External Map
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* STEP 5: Description & Priority */}
            <div className="form-section mb-6">
              <label className="form-label font-bold text-sm mb-2 block" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={16} style={{ color: '#ca8a04' }} />
                STEP 5: COMPLAINT DETAILS &amp; SEVERITY
              </label>

              <textarea
                className="input-field"
                rows={3}
                placeholder="Describe the issue in detail (e.g., Overflowing commercial bin causing smell, road access blocked, open drain hazard)..."
                value={description}
                onChange={(e) => setDesc(e.target.value)}
                style={{ width: '100%', marginBottom: '16px' }}
              />

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <label className="text-xs font-semibold text-muted">Priority Level:</label>
                {['Low', 'Medium', 'High', 'Critical'].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className="btn btn-sm"
                    style={{
                      borderRadius: '8px',
                      backgroundColor: priority === p
                        ? p === 'Critical' ? '#dc2626' : p === 'High' ? '#ef4444' : p === 'Medium' ? '#f59e0b' : '#10b981'
                        : 'var(--bg-card)',
                      color: priority === p ? '#fff' : 'var(--text-secondary)',
                      border: '1px solid var(--glass-border)'
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* STEP 6: Submit Report */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => navigate('/citizen')}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting || !coords.lat || !coords.lng || description.trim().length < 5}
                style={{ minWidth: '180px', padding: '12px 24px', fontSize: '0.95rem' }}
              >
                {submitting ? (
                  <><span className="spinner" /> Submitting Report...</>
                ) : (
                  <><Send size={18} /> Register Civic Report</>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Post-Submission Modal */}
        {success && reportResult && (
          <div className="success-overlay" onClick={() => setSuccess(false)}>
            <div className="glass-card success-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px', width: '92%' }}>
              {reportResult.isFake ? (
                <>
                  <div style={{ fontSize: '3rem', marginBottom: '8px' }}>❌</div>
                  <h2 style={{ color: '#ef4444' }}>Photo Verification Notice</h2>
                  <p>Please upload an authentic photo of actual civic waste or infrastructure issues.</p>
                  {reportResult.reason && (
                    <div style={{ margin: '12px 0', padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', fontSize: '0.85rem', color: '#f87171' }}>
                      {reportResult.reason}
                    </div>
                  )}
                  <button className="btn btn-primary" style={{ marginTop: '20px' }} onClick={() => { setSuccess(false); resetForm(); }}>
                    Try Again
                  </button>
                </>
              ) : (
                <>
                  <div className="success-icon">🎉</div>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Civic Report Submitted Successfully!</h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>
                    Your complaint has been registered in the Telangana municipal grievance dispatch system.
                  </p>

                  <div
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '12px',
                      padding: '16px',
                      textAlign: 'left',
                      marginBottom: '16px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span className="text-muted text-xs">Report ID:</span>
                      <strong style={{ fontFamily: 'monospace', color: '#38bdf8' }}>{reportResult.id}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span className="text-muted text-xs">Issue Category:</span>
                      <strong>{reportResult.category}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span className="text-muted text-xs">Location:</span>
                      <span style={{ fontSize: '0.8rem', maxWidth: '65%', textAlign: 'right' }}>{reportResult.location}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span className="text-muted text-xs">GPS Coordinates:</span>
                      <span style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: '#38bdf8' }}>{reportResult.lat}, {reportResult.lng} (±{reportResult.accuracy || 10}m)</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span className="text-muted text-xs">Status:</span>
                      <span className="badge badge-yellow">{reportResult.status}</span>
                    </div>
                  </div>

                  {reportResult.photoUrl && (
                    <div style={{ margin: '14px 0', borderRadius: '10px', overflow: 'hidden' }}>
                      <SafeImage
                        src={reportResult.photoUrl}
                        alt="Submitted evidence"
                        style={{ width: '100%', height: '160px', objectFit: 'cover' }}
                      />
                    </div>
                  )}

                  {reportResult.points > 0 && (
                    <div style={{ margin: '12px 0', padding: '12px 16px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '10px', color: 'var(--accent-green)', fontWeight: 700 }}>
                      ⭐ You earned +{reportResult.points} Municipal Tax Rebate Points!
                    </div>
                  )}

                  <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
                    <button type="button" className="btn btn-outline" onClick={resetForm}>
                      Submit Another Report
                    </button>
                    <button type="button" className="btn btn-primary" onClick={() => navigate('/citizen')} id="go-to-dashboard">
                      View in Citizen Dashboard
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
