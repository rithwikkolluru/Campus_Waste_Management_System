import { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, Image } from 'lucide-react';

const CameraCapture = ({ onPhotoCapture, onError }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [mode, setMode] = useState('idle');
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [capturedPreview, setCapturedPreview] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [facingMode, setFacingMode] = useState('environment');

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setMode('camera');
    } catch (err) {
      console.error('Camera error:', err);
      if (err.name === 'NotAllowedError') {
        setCameraError('Camera permission denied. Please allow camera access and try again.');
      } else if (err.name === 'NotFoundError') {
        setCameraError('No camera found on this device.');
      } else {
        setCameraError('Could not open camera. Try uploading from gallery instead.');
      }
      setMode('idle');
      if (onError) onError(err);
    }
  }, [facingMode, onError]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      const file = new File([blob], `waste-capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
      const previewUrl = URL.createObjectURL(blob);
      setCapturedPhoto(file);
      setCapturedPreview(previewUrl);
      stopCamera();
      setMode('preview');
    }, 'image/jpeg', 0.85);
  }, [stopCamera]);

  const usePhoto = useCallback(() => {
    if (!capturedPhoto) return;
    onPhotoCapture(capturedPhoto, capturedPreview);
    setCapturedPhoto(null);
    setCapturedPreview(null);
    setMode('idle');
  }, [capturedPhoto, capturedPreview, onPhotoCapture]);

  const retakePhoto = useCallback(() => {
    setCapturedPhoto(null);
    setCapturedPreview(null);
    startCamera();
  }, [startCamera]);

  const switchCamera = useCallback(() => {
    const newFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newFacing);
    if (mode === 'camera') {
      stopCamera();
      setTimeout(() => startCamera(), 300);
    }
  }, [facingMode, mode, stopCamera, startCamera]);

  const handleGalleryUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    onPhotoCapture(file, URL.createObjectURL(file));
    e.target.value = '';
  };

  useEffect(() => () => stopCamera(), [stopCamera]);

  if (mode === 'idle') {
    return (
      <div className="upload-capture-section">
        {cameraError && <div className="camera-error">⚠️ {cameraError}</div>}
        <button type="button" onClick={startCamera} className="btn-upload-camera">
          <Camera size={20} /> Open Camera
        </button>
        <div className="upload-or-divider"><span>OR</span></div>
        <label className="btn-upload-gallery" htmlFor="gallery-input">
          <Image size={20} /> Upload from Gallery
        </label>
        <input
          id="gallery-input"
          type="file"
          accept="image/*"
          onChange={handleGalleryUpload}
          style={{ display: 'none' }}
        />
      </div>
    );
  }

  if (mode === 'camera') {
    return (
      <div className="camera-container">
        <div className="camera-viewfinder">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ width: '100%', maxHeight: '400px', objectFit: 'cover', borderRadius: '12px', display: 'block' }}
          />
          <div className="camera-guide-frame" />
        </div>
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        <div className="camera-controls">
          <button onClick={() => { stopCamera(); setMode('idle'); }} className="btn-camera-cancel" type="button">✕ Cancel</button>
          <button onClick={capturePhoto} className="btn-capture" type="button"><span className="capture-circle" /></button>
          <button onClick={switchCamera} className="btn-switch-camera" type="button">🔄 Flip</button>
        </div>
        <p style={{ textAlign: 'center', fontSize: '13px', color: '#888', marginTop: '8px' }}>Point camera at the waste area</p>
      </div>
    );
  }

  if (mode === 'preview') {
    return (
      <div className="camera-container">
        <div className="camera-preview">
          <img src={capturedPreview} alt="Captured waste" style={{ width: '100%', maxHeight: '400px', objectFit: 'cover', borderRadius: '12px', display: 'block' }} />
          <div className="preview-badge">✓ Photo captured</div>
        </div>
        <div className="camera-controls">
          <button onClick={retakePhoto} className="btn-retake" type="button">🔄 Retake</button>
          <button onClick={usePhoto} className="btn-use-photo" type="button">✅ Use This Photo</button>
        </div>
      </div>
    );
  }
};

export default CameraCapture;
