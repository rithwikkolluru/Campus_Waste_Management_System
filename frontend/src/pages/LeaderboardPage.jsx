import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { Trophy, Medal, Award, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config';
import './Dashboard.css';

export default function LeaderboardPage() {
  const [period, setPeriod] = useState('all_time'); // 'weekly', 'monthly', 'all_time'
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const token = localStorage.getItem('ecocampus_token');

  useEffect(() => {
    fetchLeaderboard();
  }, [period]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/leaderboard?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data.leaderboard);
      }
    } catch (err) {
      console.error('Leaderboard error', err);
    } finally {
      setLoading(false);
    }
  };

  const getRankBadge = (rank) => {
    if (rank === 1) return { icon: '👑', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.2)' };
    if (rank === 2) return { icon: '🥈', color: '#9ca3af', bg: 'rgba(156, 163, 175, 0.2)' };
    if (rank === 3) return { icon: '🥉', color: '#b45309', bg: 'rgba(180, 83, 9, 0.2)' };
    return { icon: rank, color: 'var(--text-muted)', bg: 'rgba(255, 255, 255, 0.05)' };
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-header flex justify-between items-center">
          <div>
            <h1>🏆 Campus Leaderboard</h1>
            <p>See who is leading the clean campus initiative.</p>
          </div>
          
          <div className="flex gap-2 p-1 bg-slate-800 rounded-lg">
            {['weekly', 'monthly', 'all_time'].map(p => (
              <button 
                key={p}
                className={`btn btn-sm ${period === p ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setPeriod(p)}
                style={{ borderRadius: '6px' }}
              >
                {p === 'weekly' ? 'This Week' : p === 'monthly' ? 'This Month' : 'All Time'}
              </button>
            ))}
          </div>
        </div>

        <div className="glass-card" style={{ padding: '24px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <span className="spinner"></span> Loading rankings...
            </div>
          ) : leaderboard.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              No data available yet.
            </div>
          ) : (
            <div className="leaderboard-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {leaderboard.map((student) => {
                const badge = getRankBadge(student.rank);
                const isMe = user?.id === student.id;
                return (
                  <div 
                    key={student.id} 
                    className="leaderboard-item flex items-center justify-between"
                    style={{ 
                      padding: '16px', 
                      borderRadius: '12px', 
                      background: isMe ? 'rgba(16, 185, 129, 0.1)' : 'var(--glass-bg)',
                      border: isMe ? '1px solid var(--accent-green)' : '1px solid var(--glass-border)'
                    }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex justify-center items-center font-bold" style={{ width: '40px', height: '40px', borderRadius: '50%', background: badge.bg, color: badge.color, fontSize: student.rank <= 3 ? '1.5rem' : '1.1rem' }}>
                        {badge.icon}
                      </div>
                      <div>
                        <div className="font-semibold text-lg flex items-center gap-2">
                          {student.name || 'Student'}
                          {isMe && <span className="badge badge-primary text-xs ml-2">You</span>}
                        </div>
                        <div className="text-sm text-muted">
                          {student.reports_count} reports • {student.badge}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-xl text-accent">{student.points.toLocaleString()}</div>
                      <div className="text-xs text-muted">points</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
