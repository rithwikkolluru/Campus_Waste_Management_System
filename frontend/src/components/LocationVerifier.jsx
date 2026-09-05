import { useEffect } from 'react';
import useLocation from '../hooks/useLocation';

const LocationVerifier = ({ onLocationVerified, onLocationFailed }) => {
  const { location, getLocation } = useLocation();

  useEffect(() => {
    if (location.status === 'success') {
      onLocationVerified({ lat: location.lat, lng: location.lng, accuracy: location.accuracy });
    } else if (location.status === 'outside' || location.status === 'denied' || location.status === 'error') {
      onLocationFailed(location.error);
    }
  }, [location.status, location.lat, location.lng, location.accuracy, location.error, onLocationVerified, onLocationFailed]);

  if (location.status === 'idle' || location.status === 'loading') {
    return (
      <div className="location-card loading">
        <div className="location-spinner" />
        <div>
          <p className="location-title">📡 Getting your location...</p>
          <p className="location-subtitle">Please allow location access if prompted</p>
        </div>
      </div>
    );
  }

  if (location.status === 'success') {
    return (
      <div className="location-card success">
        <span className="location-icon">✅</span>
        <div>
          <p className="location-title">Location Verified</p>
          <p className="location-subtitle">
            📍 Location verified · Accuracy: ±{location.accuracy}m
          </p>
        </div>
      </div>
    );
  }

  if (location.status === 'outside') {
    return (
      <div className="location-card error">
        <span className="location-icon">❌</span>
        <div>
          <p className="location-title">Outside State Service Boundary</p>
          <p className="location-subtitle">
            You are {location.distanceFromCampus}m from the active municipal zone.
            Please ensure you are within the monitored service area to report waste.
          </p>
          <button type="button" onClick={getLocation} className="btn-retry-location">
            🔄 Check Again
          </button>
        </div>
      </div>
    );
  }

  if (location.status === 'denied' || location.status === 'error') {
    return (
      <div className="location-card warning">
        <span className="location-icon">⚠️</span>
        <div>
          <p className="location-title">Location Access Needed</p>
          <p className="location-subtitle">{location.error}</p>
          <p className="location-hint">
            In Chrome: Click the 🔒 lock icon in address bar → 
            Site settings → Location → Allow
          </p>
          <button type="button" onClick={getLocation} className="btn-retry-location">
            🔄 Try Again
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default LocationVerifier;
