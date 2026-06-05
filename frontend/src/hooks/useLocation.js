import { useState, useEffect, useCallback } from 'react';

// JNTUH Campus boundary coordinates
// These are the 4 corners of JNTUH Hyderabad main campus
const JNTUH_BOUNDS = {
  north: 17.4960,
  south: 17.4880,
  east:  78.3950,
  west:  78.3870,
};

// Calculate distance between two GPS points in meters
const getDistanceMeters = (lat1, lng1, lat2, lng2) => {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// Check if coordinates are inside JNTUH campus
const isInsideJNTUH = (lat, lng) => {
  return (
    lat >= JNTUH_BOUNDS.south &&
    lat <= JNTUH_BOUNDS.north &&
    lng >= JNTUH_BOUNDS.west &&
    lng <= JNTUH_BOUNDS.east
  );
};

const useLocation = () => {
  const [location, setLocation] = useState({
    lat: null,
    lng: null,
    accuracy: null,
    isInsideCampus: false,
    distanceFromCampus: null,
    status: 'idle',
    // status: idle | loading | success | denied | error | outside
    error: null,
  });

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocation(prev => ({
        ...prev,
        status: 'error',
        error: 'GPS not supported on this device',
      }));
      return;
    }

    setLocation(prev => ({ ...prev, status: 'loading', error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude: lat, longitude: lng, accuracy } = position.coords;
        const insideCampus = isInsideJNTUH(lat, lng);

        // Calculate distance from campus center
        const campusCenterLat = (JNTUH_BOUNDS.north + JNTUH_BOUNDS.south) / 2;
        const campusCenterLng = (JNTUH_BOUNDS.east + JNTUH_BOUNDS.west) / 2;
        const distance = getDistanceMeters(lat, lng, campusCenterLat, campusCenterLng);

        setLocation({
          lat,
          lng,
          accuracy: Math.round(accuracy),
          isInsideCampus: insideCampus,
          distanceFromCampus: Math.round(distance),
          status: insideCampus ? 'success' : 'outside',
          error: insideCampus
            ? null
            : `You are ${Math.round(distance)}m from JNTUH campus. You must be on campus to submit a report.`,
        });
      },
      (err) => {
        let errorMsg = 'Could not get your location.';
        if (err.code === 1) {
          errorMsg = 'Location permission denied. Please enable GPS and allow location access.';
        } else if (err.code === 2) {
          errorMsg = 'GPS signal not found. Please go outside or enable location services.';
        } else if (err.code === 3) {
          errorMsg = 'Location request timed out. Please try again.';
        }

        setLocation(prev => ({
          ...prev,
          status: 'denied',
          error: errorMsg,
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000, // cache location for 30 seconds
      }
    );
  }, []);

  // Get location automatically when hook is used
  useEffect(() => {
    getLocation();
  }, [getLocation]);

  return { location, getLocation, isInsideJNTUH, getDistanceMeters };
};

export default useLocation;
export { isInsideJNTUH, getDistanceMeters };
