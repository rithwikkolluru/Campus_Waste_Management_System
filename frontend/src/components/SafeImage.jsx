import { useState } from 'react';
import { ImageOff } from 'lucide-react';
import { getMediaUrl } from '../utils/helpers';
import ImageModal from './ImageModal';

export default function SafeImage({
  src,
  alt = 'Report photo',
  className = '',
  style = {},
  clickable = true,
  fallbackText = 'No image',
  metadata = {},
  width,
  height
}) {
  const [hasError, setHasError] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const resolvedUrl = getMediaUrl(src);

  if (!resolvedUrl || hasError) {
    return (
      <div
        className={`safe-image-fallback ${className}`}
        style={{
          width: width || style.width || '44px',
          height: height || style.height || '44px',
          borderRadius: style.borderRadius || '8px',
          backgroundColor: 'var(--bg-card, rgba(255,255,255,0.04))',
          border: '1px solid var(--glass-border, rgba(255,255,255,0.1))',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted, #64748b)',
          fontSize: '0.65rem',
          textAlign: 'center',
          padding: '4px',
          flexShrink: 0,
          ...style
        }}
        title="Image unavailable"
      >
        <ImageOff size={typeof (width || style.width) === 'number' && (width || style.width) < 40 ? 14 : 18} />
        {style.height && parseInt(style.height, 10) > 60 && (
          <span style={{ marginTop: '2px' }}>{fallbackText}</span>
        )}
      </div>
    );
  }

  return (
    <>
      <div
        style={{
          position: 'relative',
          display: 'inline-block',
          width: width || style.width,
          height: height || style.height,
          flexShrink: 0,
        }}
      >
        {!loaded && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: style.borderRadius || '8px',
              backgroundColor: 'rgba(255,255,255,0.05)',
              animation: 'pulse 1.5s infinite',
            }}
          />
        )}
        <img
          src={resolvedUrl}
          alt={alt}
          className={className}
          style={{
            ...style,
            width: width || style.width || '100%',
            height: height || style.height || '100%',
            objectFit: style.objectFit || 'cover',
            borderRadius: style.borderRadius || '8px',
            cursor: clickable ? 'pointer' : 'default',
            display: 'block',
            transition: 'opacity 0.2s ease, transform 0.2s ease',
            opacity: loaded ? 1 : 0,
          }}
          onLoad={() => setLoaded(true)}
          onError={() => {
            setHasError(true);
            setLoaded(true);
          }}
          onClick={() => {
            if (clickable) setModalOpen(true);
          }}
          title={clickable ? 'Click to enlarge' : alt}
        />
      </div>

      {clickable && (
        <ImageModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          imageUrl={resolvedUrl}
          title={alt || 'Civic Report Photo'}
          metadata={{
            reportId: metadata.reportId,
            location: metadata.location,
            category: metadata.category,
            date: metadata.date,
          }}
        />
      )}
    </>
  );
}
