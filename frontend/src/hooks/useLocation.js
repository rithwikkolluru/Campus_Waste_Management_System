import { useState, useEffect, useCallback } from 'react';

/**
 * Calculate geodesic distance between two GPS points in meters (Haversine formula)
 */
export const getDistanceMeters = (lat1, lng1, lat2, lng2) => {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export default function useLocation() {
  const [location, setLocation] = useState({
    lat: null,
    lng: null,
    accuracy: null,
    timestamp: null,
    status: 'idle', // 'idle' | 'loading' | 'success' | 'denied' | 'error'
    error: null,
  });

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocation((prev) => ({
        ...prev,
        status: 'error',
        error: 'GPS Geolocation is not supported by your browser or device.',
      }));
      return;
    }

    setLocation((prev) => ({ ...prev, status: 'loading', error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setLocation({
          lat: parseFloat(latitude.toFixed(6)),
          lng: parseFloat(longitude.toFixed(6)),
          accuracy: Math.round(accuracy),
          timestamp: new Date(position.timestamp).toISOString(),
          status: 'success',
          error: null,
        });
      },
      (err) => {
        let errorMsg = 'Could not determine GPS coordinates.';
        let status = 'error';

        if (err.code === 1) { // PERMISSION_DENIED
          status = 'denied';
          errorMsg = 'Location permission was denied. Please allow location access in your browser settings to automatically capture the report coordinates.';
        } else if (err.code === 2) { // POSITION_UNAVAILABLE
          status = 'error';
          errorMsg = 'GPS signal unavailable. Please ensure device location is turned on.';
        } else if (err.code === 3) { // TIMEOUT
          status = 'error';
          errorMsg = 'Location detection timed out. Please click "Detect Location" to retry.';
        }

        setLocation((prev) => ({
          ...prev,
          status,
          error: errorMsg,
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 10000,
      }
    );
  }, []);

  // Request location on mount
  useEffect(() => {
    getLocation();
  }, [getLocation]);

  return { location, getLocation, setLocation };
}
