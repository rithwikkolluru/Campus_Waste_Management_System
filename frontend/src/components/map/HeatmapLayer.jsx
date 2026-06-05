import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';

const HeatmapLayer = ({ points, visible }) => {
  const map = useMap();

  useEffect(() => {
    if (!visible || !points || points.length === 0) return;

    // Convert to leaflet.heat format [lat, lng, intensity]
    const heatData = points.map(p => [p.lat, p.lng, p.intensity]);

    const heatLayer = L.heatLayer(heatData, {
      radius: 35,
      blur: 25,
      maxZoom: 18,
      max: 1.0,
      gradient: {
        0.2: '#3b82f6', // blue — low
        0.4: '#22c55e', // green — medium-low
        0.6: '#eab308', // yellow — medium
        0.8: '#f97316', // orange — high
        1.0: '#ef4444', // red — critical
      },
    });

    heatLayer.addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, points, visible]);

  return null;
};

export default HeatmapLayer;
