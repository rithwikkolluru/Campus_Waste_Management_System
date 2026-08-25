import { useState, useEffect, useCallback } from 'react';

const useMapData = (token) => {
  const [markers, setMarkers]   = useState([]);
  const [heatPoints, setHeat]   = useState([]);
  const [stats, setStats]       = useState(null);
  const [history, setHistory]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('all');
  const [days, setDays]         = useState(30);
  const [showMine, setShowMine] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };
  const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

  const fetchMarkers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ days });
      if (filter !== 'all') params.append('status', filter);

      const [markersRes, heatRes, statsRes, historyRes] =
        await Promise.all([
          fetch(`${BASE_URL}/maps/reports?${params}`, { headers }),
          fetch(`${BASE_URL}/maps/heatmap?days=${days}`, { headers }),
          fetch(`${BASE_URL}/maps/stats`, { headers }),
          fetch(`${BASE_URL}/maps/history?mine=${showMine}`, { headers }),
        ]);

      const [m, h, s, hist] = await Promise.all([
        markersRes.json(),
        heatRes.json(),
        statsRes.json(),
        historyRes.json(),
      ]);

      setMarkers(m.markers || []);
      setHeat(h.points || []);
      setStats(s);
      setHistory(hist.reports || []);
    } catch (err) {
      console.error('Map data error:', err);
    } finally {
      setLoading(false);
    }
  }, [token, filter, days, showMine]);

  useEffect(() => {
    fetchMarkers();
  }, [fetchMarkers]);

  return {
    markers, heatPoints, stats, history,
    loading, filter, setFilter,
    days, setDays,
    showMine, setShowMine,
    refresh: fetchMarkers,
  };
};

export default useMapData;
