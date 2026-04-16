import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { Upload, MapPin, X, Camera, FileText, Send, ArrowLeft, Star } from 'lucide-react';
import { validateImageFile, validateReportForm } from '../utils/validation';
import { generateReportId } from '../utils/helpers';
import './Dashboard.css';

const ZONES = [
  { name: 'Hostel Area',    emoji: '🏠' },
  { name: 'Academic Block', emoji: '🏫' },
  { name: 'Library',        emoji: '📚' },
  { name: 'Canteen',        emoji: '🍽️' },
  { name: 'Parking Area',   emoji: '🅿️' },
  { name: 'Sports Ground',  emoji: '⚽' },
];

const WASTE_TYPES = ['Organic', 'Plastic', 'Paper', 'Glass', 'E-Waste', 'Mixed', 'Hazardous'];

export default function ReportGarbage() {
  const navigate    = useNavigate();
  const { user, setUser } = useAuth();
  const fileRef     = useRef(null);
  const [fileObj, setFileObj]   = useState(null);
  const [preview, setPreview]   = useState(null);
  const [zone, setZone]         = useState('');
  const [wasteType, setWasteType] = useState('');
  const [description, setDesc]  = useState('');
  const [priority, setPriority] = useState('Medium');
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]   = useState(false);
  const [reportResult, setReportResult] = useState({ id: '', points: 0 });
  const { notify } = useNotifications();

  const handleFile = (file) => {
    if(!file) return;
    const result = validateImageFile(file);
    if (!result.ok) { notify({ type: 'error', title: 'Invalid File', message: result.error, duration: 4000 }); return; }
    setFileObj(file);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validation = validateReportForm({ zone, description });
    if (!validation.ok) {
      const firstError = Object.values(validation.errors)[0];
      notify({ type: 'error', title: 'Validation Error', message: firstError, duration: 4000 });
      return;
    }
    
    setSubmitting(true);
    
    // Try sending to real backend
    try {
       const formData = new FormData();
       formData.append('zone_id', ZONES.findIndex(z => z.name === zone) + 1);
       formData.append('description', description);
       formData.append('waste_type', wasteType);
       formData.append('priority', priority.toLowerCase());
       formData.append('user_id', user?.id || 1);
       if (fileObj) formData.append('image', fileObj);

       const res = await fetch('http://localhost:8000/api/reports', {
         method: 'POST',
         headers: {
           'Authorization': `Bearer ${localStorage.getItem('eco_token')}`
         },
         body: formData
       });
       const data = await res.json();
       if(!res.ok) throw new Error(data.message || 'Submit failed');
       
       setReportResult({ id: `RPT-00${data.report.id}`, points: data.points_earned || 5 });
       
       // Update user context total points globally
       if (data.points_earned && user) {
          setUser({ ...user, total_points: (user.total_points || 0) + data.points_earned });
       }
    } catch(err) {
       console.warn('Backend unavailable, using mock submission', err.message);
       // Mock fallback
       await new Promise(r => setTimeout(r, 1000));
       const mockId = generateReportId();
       setReportResult({ id: mockId, points: 5 }); // default 5 pts in mock
       if(user) {
          setUser({ ...user, total_points: (user.total_points || 0) + 5 });
       }
    }

    setSubmitting(false);
    setSuccess(true);
    notify({
      type: 'success',
      title: 'Upload Successful!',
      message: `Your photo and report for ${zone} have been submitted.`,
      category: 'report',
      icon: '📸',
      duration: 5000,
    });
  };

  const progress = [
    !!preview,
    !!zone,
    !!wasteType,
    description.trim().length > 10,
  ].filter(Boolean).length;

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-header flex items-center gap-4">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/student')} id="back-to-dashboard">
            <ArrowLeft size={16} /> Back
          </button>
          <div>
            <h1>📸 Upload Photo & Report</h1>
            <p>Upload a garbage photo to clean campus and earn <strong className="text-accent">+5 points</strong></p>
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
            {/* Image upload */}
            <div className="form-section">
               <div className="flex justify-between items-center mb-2">
                 <div className="form-section-title mb-0">
                   <Camera size={18} color="var(--accent-green)" />
                   Upload Garbage Image
                 </div>
                 <div className="badge" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Star size={12} /> Unlimited Uploads
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
                  <p><strong>Drag & drop</strong> an image here</p>
                  <span>Earn up to 50 points daily! (JPG, PNG, WEBP)</span>
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} id="image-upload" />
                </div>
              ) : (
                <div style={{ position: 'relative', maxWidth: '400px' }}>
                  <div className="image-preview">
                    <img src={preview} alt="Garbage preview" />
                    <div className="image-preview-overlay">
                      <button type="button" className="btn btn-danger btn-sm" onClick={() => { setPreview(null); setFileObj(null); }}>
                        <X size={14} /> Remove
                      </button>
                    </div>
                  </div>
                  <div style={{ padding: '8px 0', fontSize: '0.8rem', color: 'var(--accent-green)' }}>✓ Image ready for upload</div>
                </div>
              )}
            </div>

            {/* Zone selection */}
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

            {/* Waste type & Priority */}
            <div className="form-section">
              <div className="grid-2" style={{ gap: '20px' }}>
                <div className="input-group">
                  <div className="form-section-title" style={{ marginBottom: '12px' }}>
                    <span>♻️</span> Waste Type
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {WASTE_TYPES.map(w => (
                      <button
                        key={w}
                        type="button"
                        className={`btn btn-sm ${wasteType === w ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setWasteType(w)}
                        id={`waste-${w.toLowerCase()}`}
                      >
                        {w}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="input-group">
                  <div className="form-section-title" style={{ marginBottom: '12px' }}>
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

            {/* Description */}
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

            {/* Submit */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost btn-lg" onClick={() => navigate('/student')}>Cancel</button>
              <button type="submit" className={`btn btn-primary btn-lg ${submitting ? 'loading' : ''}`} id="submit-report" disabled={submitting}>
                {submitting ? <><span className="spinner" /> Uploading...</> : <><Send size={18} /> Upload Photo</>}
              </button>
            </div>
          </div>
        </form>

        {/* Success modal */}
        {success && (
          <div className="success-overlay" onClick={() => { setSuccess(false); navigate('/student'); }}>
            <div className="glass-card success-card" onClick={e => e.stopPropagation()}>
              <div className="success-icon">🎉</div>
              <h2>Photo Uploaded!</h2>
              <p>Great job! Your contribution helps keep the campus clean.</p>
              
              {reportResult.points > 0 && (
                 <div style={{ margin: '16px auto', padding: '12px 20px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--accent-green)', fontWeight: 'bold' }}>
                    <Star fill="currentColor" size={20} />
                    You earned {reportResult.points} Points!
                 </div>
              )}
              {reportResult.points === 0 && (
                 <div style={{ margin: '16px auto', padding: '12px 20px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    You have reached your daily or monthly points limit, but your photo was still uploaded!
                 </div>
              )}

              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Report ID: <strong>{reportResult.id}</strong></p>

              <div style={{ marginTop: '24px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button className="btn btn-outline" onClick={() => { setSuccess(false); setPreview(null); setFileObj(null); setZone(''); setDesc(''); setWasteType(''); }}>Upload Another</button>
                <button className="btn btn-primary" onClick={() => navigate('/student')} id="go-to-dashboard">View Progress</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
