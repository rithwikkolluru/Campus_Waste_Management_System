import { useState, useEffect, useCallback } from 'react';

const usePoints = (token) => {
  const [points, setPoints] = useState({
    total_points: 0,
    daily_earned: 0,
    monthly_earned: 0,
    daily_limit: 50,
    monthly_limit: 500,
    recent_history: [],
  });

  const fetchPoints = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('http://localhost:8000/api/auth/rewards/my-points', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPoints(data);
      }
    } catch (err) {
      console.error('Points fetch error:', err);
    }
  }, [token]);

  // Fetch immediately when token is available
  useEffect(() => {
    fetchPoints();
  }, [fetchPoints]);

  // Poll every 30 seconds (less server load)
  useEffect(() => {
    if (!token) return;
    const interval = setInterval(fetchPoints, 30000);
    return () => clearInterval(interval);
  }, [fetchPoints]);

  return { points, refreshPoints: fetchPoints };
};

export default usePoints;
