import { useEffect } from 'react';
import { X, ExternalLink, MapPin, Calendar, Tag } from 'lucide-react';

export default function ImageModal({ isOpen, onClose, imageUrl, title = 'Civic Report Image', metadata = {} }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !imageUrl) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: 'relative',
          maxWidth: '900px',
          width: '100%',
          maxHeight: '90vh',
          backgroundColor: 'var(--bg-secondary, #0f172a)',
          border: '1px solid var(--glass-border, rgba(255,255,255,0.12))',
          borderRadius: '16px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--glass-border, rgba(255,255,255,0.1))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(255,255,255,0.02)'
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary, #f8fafc)' }}>
              {title}
            </h3>
            {metadata.reportId && (
              <span style={{ fontSize: '0.8rem', color: 'var(--accent-green, #10b981)', fontWeight: 600 }}>
                {metadata.reportId}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <a
              href={imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost btn-sm"
              title="Open full image in new tab"
              style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 10px', fontSize: '0.8rem' }}
            >
              <ExternalLink size={15} /> Open Original
            </a>
            <button
              onClick={onClose}
              className="btn btn-ghost btn-sm"
              aria-label="Close modal"
              style={{ padding: '6px 8px', borderRadius: '8px', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Image Content */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#000000',
            minHeight: '260px',
            maxHeight: '65vh'
          }}
        >
          <img
            src={imageUrl}
            alt={title}
            style={{
              maxWidth: '100%',
              maxHeight: '65vh',
              objectFit: 'contain',
              display: 'block'
            }}
          />
        </div>

        {/* Footer with Metadata */}
        {(metadata.location || metadata.date || metadata.category) && (
          <div
            style={{
              padding: '14px 20px',
              borderTop: '1px solid var(--glass-border, rgba(255,255,255,0.1))',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '16px',
              fontSize: '0.85rem',
              color: 'var(--text-secondary, #94a3b8)',
              background: 'rgba(255,255,255,0.02)'
            }}
          >
            {metadata.location && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MapPin size={15} style={{ color: 'var(--accent-green, #10b981)' }} />
                <span>{metadata.location}</span>
              </div>
            )}
            {metadata.category && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Tag size={15} style={{ color: '#38bdf8' }} />
                <span>{metadata.category}</span>
              </div>
            )}
            {metadata.date && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={15} style={{ color: '#a78bfa' }} />
                <span>{metadata.date}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
