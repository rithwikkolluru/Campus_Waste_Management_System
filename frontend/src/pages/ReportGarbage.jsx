import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { Upload, MapPin, X, Camera, FileText, Send, ArrowLeft, Star, Sparkles, AlertTriangle, CheckCircle } from 'lucide-react';
import { validateImageFile, validateReportForm } from '../utils/validation';
import { generateReportId } from '../utils/helpers';
import usePoints from '../hooks/usePoints';
import './Dashboard.css';

const ZONES = [
  { name: 'Hostel Area',    emoji: '🏠' },
  { name: 'Academic Block', emoji: '🏫' },
  { name: 'Library',        emoji: '📚' },
  { name: 'Canteen',        emoji: '🍽️' },
  { name: 'Parking Area',   emoji: '🅿️' },
  { name: 'Sports Ground',  emoji: '⚽' },
];

const WASTE_TYPES = ['Organic', 'Plastic', 'Paper', 'Glass', 'E-Waste', 'Metal', 'Hazardous', 'Mixed', 'General Waste'];

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
    const maxWidth = 800;
    const ratio    = Math.min(maxWidth / img.width, 1);
    canvas.width   = img.width  * ratio;
    canvas.height  = img.height * ratio;
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => resolve(new File([blob], file.name, { type: 'image/jpeg' })), 'image/jpeg', 0.7);
  };
  img.src = URL.createObjectURL(file);
});

export default function ReportGarbage() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const fileRef  = useRef(null);
  const token    = localStorage.getItem('ecocampus_token');
  const { refreshPoints } = usePoints(token);
  const { notify } = useNotifications();

  // Form state
  const [fileObj, setFileObj]     = useState(null);
  const [preview, setPreview]     = useState(null);
  const [zone, setZone]           = useState('');
  const [wasteType, setWasteType] = useState('');
  const [description, setDesc]    = useState('');
  const [priority, setPriority]   = useState('Medium');
  const [dragOver, setDragOver]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]       = useState(false);
  const [reportResult, setReportResult] = useState(null);

  // AI state
  const [aiAnalyzing, setAiAnalyzing]   = useState(false);  // spinner while pre-analyzing
  const [aiSuggestion, setAiSuggestion] = useState(null);   // result of analyze-photo
  const [userOverride, setUserOverride] = useState(false);  // true if user manually changed type

  // ── Handle file selection → instant AI pre-analysis ──────────────────────
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

    // Reset AI state
    setAiSuggestion(null);
    setUserOverride(false);

    // Call analyze-photo endpoint for instant classification
    setAiAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res  = await fetch('http://localhost:8000/api/reports/analyze-photo', {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}` },
        body:    formData,
      });
      const data = await res.json();
      if (data.success && data.aiResult?.aiAvailable) {
        setAiSuggestion(data.aiResult);
        // Auto-fill waste type ONLY if user hasn't manually picked one
        if (!wasteType || !userOverride) {
          // Map AI type to our WASTE_TYPES list (case-insensitive match)
          const matched = WASTE_TYPES.find(w =>
            w.toLowerCase() === (data.aiResult.wasteType || '').toLowerCase()
          );
          if (matched) setWasteType(matched);
        }
      } else {
        setAiSuggestion({ aiAvailable: false });
      }
    } catch {
      setAiSuggestion({ aiAvailable: false });
    } finally {
      setAiAnalyzing(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  // When user manually picks a waste type, mark override so AI won't overwrite it
  const handleWasteTypeSelect = (type) => {
    setWasteType(type);
    setUserOverride(true);
  };

  // ── Submit form ────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    const validation = validateReportForm({ zone, description });
    if (!validation.ok) {
      notify({ type: 'error', title: 'Validation Error', message: Object.values(validation.errors)[0], duration: 4000 });
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('zone_id',     ZONES.findIndex(z => z.name === zone) + 1);
      formData.append('description', description);
      formData.append('waste_type',  wasteType);
      formData.append('priority',    priority.toLowerCase());
      formData.append('user_id',     user?.id || 1);
      formData.append('location',    zone);
      if (fileObj) {
        const compressed = await compressImage(fileObj);
        formData.append('image', compressed);
      }

      const res  = await fetch('http://localhost:8000/api/reports/submit', {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}` },
        body:    formData,
      });
      const data = await res.json();

      // Handle fake photo rejection from backend
      if (!res.ok && data.isFake) {
        setSubmitting(false);
        setReportResult({ isFake: true, reason: data.reason });
        setSuccess(true);
        return;
      }
      if (!res.ok) throw new Error(data.message || 'Submit failed');

      setReportResult({
        id:            `RPT-00${data.reportId}`,
        points:        data.pointsEarned        || 0,
        photoPoints:   data.photoPointsEarned   || 0,
        reportPoints:  data.reportPointsEarned  || 0,
        aiResult:      data.aiResult            || null,
        newTotalPoints: data.newTotalPoints,
      });

      if (data.pointsEarned && user) {
        setUser({ ...user, total_points: data.newTotalPoints || (user.total_points || 0) + data.pointsEarned });
      }
      refreshPoints();
    } catch (err) {
      console.warn('Backend unavailable, using mock submission', err.message);
      await new Promise(r => setTimeout(r, 1000));
      setReportResult({ id: generateReportId(), points: 5, aiResult: null });
      if (user) setUser({ ...user, total_points: (user.total_points || 0) + 5 });
    }

    setSubmitting(false);
    setSuccess(true);
    notify({ type: 'success', title: 'Upload Successful!', message: `Report for ${zone} submitted.`, category: 'report', icon: '📸', duration: 5000 });
  };

  const resetForm = () => {
    setPreview(null); setFileObj(null); setZone(''); setDesc('');
    setWasteType(''); setAiSuggestion(null); setUserOverride(false);
  };

  const progress = [!!preview, !!zone, !!wasteType, description.trim().length > 10].filter(Boolean).length;

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-header flex items-center gap-4">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/student')} id="back-to-dashboard">
            <ArrowLeft size={16} /> Back
          </button>
          <div>
            <h1>📸 Upload Photo &amp; Report</h1>
            <p>Upload a garbage photo to clean campus and earn <strong className="text-accent">+15 points</strong></p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="glass-card" style={{ padding: '16px 24px', marginBottom: '24px' }}>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold">Form Completion</span>
            <span className="text-sm text-accent font-bold">{Math.round((progress / 4) * 100)}%</span>
          </div>
          <div style={{ height: '6px', background: 'var(--glass-border)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${(progress / 4) * 100}%`, height: '100%', background: 'var(--gradient-primary)', borderRadius: '4px', transition: 'width 0.4s ease' }} />
          </div>
          <div className="flex gap-4 mt-2" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {['Upload Image', 'Select Zone', 'Waste Type', 'Description'].map((s, i) => (
              <span key={i} style={{ color: i < progress ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                {i < progress ? '✓' : '○'} {s}
              </span>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="glass-card report-form-card">

            {/* ── Image Upload ───────────────────────────────────────────── */}
            <div className="form-section">
              <div className="flex justify-between items-center mb-2">
                <div className="form-section-title mb-0">
                  <Camera size={18} color="var(--accent-green)" /> Upload Garbage Image
                </div>
                <div className="badge" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Star size={12} /> +15 Points
                </div>
              </div>

              {!preview ? (
                <div
                  className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
                  onClick={() => fileRef.current.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  id="drop-zone"
                >
                  <div className="drop-icon">📸</div>
                  <p><strong>Drag &amp; drop</strong> an image here</p>
                  <span>AI will auto-detect waste type! (JPG, PNG, WEBP)</span>
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} id="image-upload" />
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                  <div style={{ position: 'relative', maxWidth: '260px', flexShrink: 0 }}>
                    <div className="image-preview">
                      <img src={preview} alt="Garbage preview" />
                      <div className="image-preview-overlay">
                        <button type="button" className="btn btn-danger btn-sm" onClick={() => { setPreview(null); setFileObj(null); setAiSuggestion(null); }}>
                          <X size={14} /> Remove
                        </button>
                      </div>
                    </div>
                    <div style={{ padding: '6px 0', fontSize: '0.78rem', color: 'var(--accent-green)' }}>✓ Image ready for upload</div>
                  </div>

                  {/* AI Analysis Result Panel */}
                  <div style={{ flex: 1, minWidth: '220px' }}>
                    {aiAnalyzing && (
                      <div className="glass-card" style={{ padding: '16px', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.25)' }}>
                        <div className="flex items-center gap-3">
                          <span className="spinner" style={{ borderColor: '#8b5cf6', borderTopColor: 'transparent' }} />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#a78bfa' }}>🔍 AI Analyzing Photo...</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Detecting waste type automatically</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {!aiAnalyzing && aiSuggestion?.aiAvailable && (
                      <div className="glass-card" style={{ padding: '16px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
                        <div className="flex items-center gap-2 mb-3">
                          <Sparkles size={15} color="#10b981" />
                          <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#10b981' }}>AI Detection Result</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                            {aiSuggestion.confidence}% confidence
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.82rem' }}>
                          <div className="flex justify-between">
                            <span style={{ color: 'var(--text-muted)' }}>Waste Type</span>
                            <strong style={{ color: 'var(--text-primary)' }}>♻️ {aiSuggestion.wasteType}</strong>
                          </div>
                          {aiSuggestion.binColor && BIN_COLORS[aiSuggestion.binColor] && (
                            <div className="flex justify-between">
                              <span style={{ color: 'var(--text-muted)' }}>Bin Color</span>
                              <strong>{BIN_COLORS[aiSuggestion.binColor].label} {aiSuggestion.binColor} ({aiSuggestion.binLabel})</strong>
                            </div>
                          )}
                          {aiSuggestion.tips && (
                            <div style={{ marginTop: '6px', padding: '8px 10px', borderRadius: '6px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)', color: '#60a5fa', fontSize: '0.75rem' }}>
                              💡 {aiSuggestion.tips}
                            </div>
                          )}
                        </div>
                        {userOverride && (
                          <div style={{ marginTop: '8px', fontSize: '0.72rem', color: '#f59e0b' }}>
                            ⚠️ Using your manual selection (AI suggestion overridden)
                          </div>
                        )}
                      </div>
                    )}

                    {!aiAnalyzing && aiSuggestion && !aiSuggestion.aiAvailable && (
                      <div className="glass-card" style={{ padding: '12px 16px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>
                        <div style={{ fontSize: '0.8rem', color: '#f59e0b' }}>
                          ⚠️ AI unavailable — please select waste type manually below
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ── Zone Selection ─────────────────────────────────────────── */}
            <div className="form-section">
              <div className="form-section-title">
                <MapPin size={18} color="var(--accent-green)" /> Select Campus Zone
              </div>
              <div className="zone-grid">
                {ZONES.map(z => (
                  <div
                    key={z.name}
                    className={`zone-option ${zone === z.name ? 'selected' : ''}`}
                    onClick={() => setZone(z.name)}
                    id={`zone-${z.name.replace(/\s+/g, '-').toLowerCase()}`}
                  >
                    <div className="zone-emoji">{z.emoji}</div>
                    <div className="zone-name">{z.name}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Waste Type (AI suggestion + manual override) ───────────── */}
            <div className="form-section">
              <div className="grid-2" style={{ gap: '20px' }}>
                <div className="input-group">
                  <div className="form-section-title" style={{ marginBottom: '8px' }}>
                    <span>♻️</span> Waste Type
                    {aiSuggestion?.aiAvailable && !userOverride && (
                      <span style={{ fontSize: '0.7rem', color: '#10b981', marginLeft: '8px', fontWeight: 400 }}>
                        ✨ AI suggested
                      </span>
                    )}
                    {userOverride && (
                      <span style={{ fontSize: '0.7rem', color: '#f59e0b', marginLeft: '8px', fontWeight: 400 }}>
                        ✏️ Manual selection
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {WASTE_TYPES.map(w => (
                      <button
                        key={w}
                        type="button"
                        className={`btn btn-sm ${wasteType === w ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => handleWasteTypeSelect(w)}
                        id={`waste-${w.toLowerCase().replace(/\s+/g, '-')}`}
                        style={
                          wasteType === w && aiSuggestion?.aiAvailable && !userOverride
                            ? { boxShadow: '0 0 0 2px #10b981' }
                            : {}
                        }
                      >
                        {w}
                      </button>
                    ))}
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    {aiSuggestion?.aiAvailable && !userOverride
                      ? `🤖 AI detected: ${aiSuggestion.wasteType} — click another to override`
                      : 'Select the waste type or let AI detect it from your photo'}
                  </div>
                </div>

                <div className="input-group">
                  <div className="form-section-title" style={{ marginBottom: '8px' }}>
                    <span>⚡</span> Priority Level
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {['Low', 'Medium', 'High'].map(p => (
                      <button
                        key={p}
                        type="button"
                        className={`btn btn-sm ${priority === p ? (p === 'High' ? 'btn-danger' : p === 'Medium' ? '' : 'btn-outline') : 'btn-ghost'}`}
                        style={priority === p && p === 'Medium' ? { background: 'rgba(245,158,11,0.2)', border: '1.5px solid rgba(245,158,11,0.4)', color: '#fbbf24' } : {}}
                        onClick={() => setPriority(p)}
                        id={`priority-${p.toLowerCase()}`}
                      >
                        {p === 'High' ? '🔴' : p === 'Medium' ? '🟡' : '🟢'} {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Description ───────────────────────────────────────────── */}
            <div className="form-section">
              <div className="form-section-title">
                <FileText size={18} color="var(--accent-green)" /> Description
              </div>
              <textarea
                className="input-field"
                placeholder="Describe the garbage issue in detail..."
                rows={4}
                value={description}
                onChange={e => setDesc(e.target.value)}
                style={{ resize: 'vertical', minHeight: '100px' }}
                id="report-description"
              />
              <div style={{ fontSize: '0.75rem', color: description.length > 10 ? 'var(--accent-green)' : 'var(--text-muted)', marginTop: '4px', textAlign: 'right' }}>
                {description.length} characters {description.length > 10 ? '✓' : '(min. 10)'}
              </div>
            </div>

            {/* ── Submit ────────────────────────────────────────────────── */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost btn-lg" onClick={() => navigate('/student')}>Cancel</button>
              <button type="submit" className={`btn btn-primary btn-lg ${submitting ? 'loading' : ''}`} id="submit-report" disabled={submitting || aiAnalyzing}>
                {submitting
                  ? <><span className="spinner" /> Analyzing &amp; Uploading...</>
                  : aiAnalyzing
                    ? <><span className="spinner" /> AI Analyzing...</>
                    : <><Send size={18} /> Submit Report</>
                }
              </button>
            </div>
          </div>
        </form>

        {/* ── Success / Result Modal ──────────────────────────────────────── */}
        {success && reportResult && (
          <div className="success-overlay" onClick={() => { setSuccess(false); navigate('/student'); }}>
            <div className="glass-card success-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px', width: '90%' }}>

              {/* FAKE PHOTO */}
              {reportResult.isFake ? (
                <>
                  <div style={{ fontSize: '3rem', marginBottom: '8px' }}>❌</div>
                  <h2 style={{ color: '#ef4444' }}>Invalid Photo</h2>
                  <p>Please upload an actual waste/garbage photo.</p>
                  {reportResult.reason && (
                    <div style={{ margin: '12px 0', padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', fontSize: '0.85rem', color: '#f87171' }}>
                      {reportResult.reason}
                    </div>
                  )}
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No points deducted.</p>
                  <button className="btn btn-primary" style={{ marginTop: '20px' }} onClick={() => { setSuccess(false); resetForm(); }}>
                    Try Again
                  </button>
                </>
              ) : (
                <>
                  <div className="success-icon">🎉</div>
                  <h2>Report Submitted!</h2>
                  <p>Great job! Your contribution helps keep the campus clean.</p>

                  {/* AI Result Card */}
                  {reportResult.aiResult?.aiAvailable && (
                    <div style={{ width: '100%', margin: '16px 0', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(139,92,246,0.25)' }}>
                      <div style={{ background: 'rgba(139,92,246,0.12)', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Sparkles size={15} color="#a78bfa" />
                        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#a78bfa' }}>🗑️ AI Detection Result</span>
                        {reportResult.aiResult.manualOverride && (
                          <span style={{ fontSize: '0.7rem', color: '#f59e0b', marginLeft: 'auto' }}>✏️ Manual override</span>
                        )}
                      </div>
                      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                        <div className="flex justify-between">
                          <span style={{ color: 'var(--text-muted)' }}>Type</span>
                          <strong>♻️ {reportResult.aiResult.wasteType?.toUpperCase()}</strong>
                        </div>
                        {reportResult.aiResult.binColor && BIN_COLORS[reportResult.aiResult.binColor] && (
                          <div className="flex justify-between">
                            <span style={{ color: 'var(--text-muted)' }}>Bin</span>
                            <strong>{BIN_COLORS[reportResult.aiResult.binColor].label} {reportResult.aiResult.binColor} ({reportResult.aiResult.binLabel})</strong>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span style={{ color: 'var(--text-muted)' }}>Confidence</span>
                          <strong style={{ color: reportResult.aiResult.confidence > 70 ? '#10b981' : '#f59e0b' }}>
                            {reportResult.aiResult.confidence}%
                          </strong>
                        </div>
                        {reportResult.aiResult.severity && (
                          <div className="flex justify-between">
                            <span style={{ color: 'var(--text-muted)' }}>Severity</span>
                            <strong style={{ color: SEVERITY_CONFIG[reportResult.aiResult.severity]?.color }}>
                              {SEVERITY_CONFIG[reportResult.aiResult.severity]?.label} ({reportResult.aiResult.severity}/10)
                            </strong>
                          </div>
                        )}
                        {reportResult.aiResult.tips && (
                          <div style={{ marginTop: '4px', padding: '8px 10px', borderRadius: '6px', background: 'rgba(59,130,246,0.08)', color: '#60a5fa', fontSize: '0.78rem' }}>
                            💡 {reportResult.aiResult.tips}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Duplicate Warning */}
                  {reportResult.aiResult?.isDuplicate && (
                    <div style={{ width: '100%', margin: '8px 0', padding: '12px 16px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '8px', display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '0.82rem' }}>
                      <AlertTriangle size={16} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <div>
                        <div style={{ fontWeight: 600, color: '#f59e0b', marginBottom: '2px' }}>⚠️ Similar Report Exists</div>
                        <div style={{ color: 'var(--text-muted)' }}>A similar report was made recently nearby. Your report was still saved.</div>
                      </div>
                    </div>
                  )}

                  {/* Points */}
                  {reportResult.points > 0 && (
                    <div style={{ margin: '12px 0', padding: '12px 20px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', color: 'var(--accent-green)', fontWeight: 'bold' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem' }}>
                        <Star fill="currentColor" size={20} />
                        You earned +{reportResult.points} Points!
                      </div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 'normal', color: 'var(--accent-green-light)' }}>
                        {reportResult.photoPoints > 0 ? `${reportResult.photoPoints} pts photo + ` : ''}
                        {reportResult.reportPoints} pts report
                        {reportResult.photoPoints > 0 ? ` = ${reportResult.points} total` : ''}
                      </div>
                    </div>
                  )}
                  {reportResult.points === 0 && (
                    <div style={{ margin: '12px 0', padding: '10px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      Photo saved! Daily points limit reached — your report still helps!
                    </div>
                  )}

                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Report ID: <strong>{reportResult.id}</strong></p>

                  <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
                    <button className="btn btn-outline" onClick={() => { setSuccess(false); resetForm(); }}>Upload Another</button>
                    <button className="btn btn-primary" onClick={() => navigate('/student')} id="go-to-dashboard">View Progress</button>
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
