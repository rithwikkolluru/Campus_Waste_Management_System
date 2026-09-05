import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { Trophy, Medal, Award, TrendingUp, Map, Users, BarChart2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config';
import './Dashboard.css';

// Mock district vs district data (derived from real leaderboard, grouped by district)
const DISTRICT_MOCK = [
  { district: 'Hyderabad', state: 'Telangana', citizens: 12, totalReports: 74, resolved: 61, avgPoints: 2140, swachhScore: 82 },
  { district: 'Rangareddy', state: 'Telangana', citizens: 8, totalReports: 48, resolved: 39, avgPoints: 1750, swachhScore: 73 },
  { district: 'Medchal-Malkajgiri', state: 'Telangana', citizens: 6, totalReports: 35, resolved: 26, avgPoints: 1440, swachhScore: 65 },
  { district: 'Warangal', state: 'Telangana', citizens: 5, totalReports: 28, resolved: 18, avgPoints: 1210, swachhScore: 54 },
  { district: 'Nizamabad', state: 'Telangana', citizens: 4, totalReports: 20, resolved: 13, avgPoints: 980, swachhScore: 47 },
  { district: 'Karimnagar', state: 'Telangana', citizens: 4, totalReports: 22, resolved: 16, avgPoints: 1100, swachhScore: 50 },
  { district: 'Khammam', state: 'Telangana', citizens: 3, totalReports: 18, resolved: 11, avgPoints: 860, swachhScore: 42 },
];

export default function LeaderboardPage() {
  const [period, setPeriod] = useState('all_time');
  const [viewMode, setViewMode] = useState('citizens'); // 'citizens' | 'districts'
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
        {/* Header */}
        <div className="page-header page-header-mobile">
          <div>
            <h1>🏆 Telangana Swachh Leaderboards</h1>
            <p>Citizen rankings and district-vs-district civic cleanliness comparison.</p>
          </div>
          <div className="page-header-actions" style={{ background: 'rgba(15,23,42,0.7)', padding: '4px', borderRadius: '10px' }}>
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

        {/* View Mode Toggle */}
        <div className="flex gap-3 mb-6">
          <button
            className={`btn btn-sm flex items-center gap-2 ${viewMode === 'citizens' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setViewMode('citizens')}
          >
            <Users size={14} /> Citizen Rankings
          </button>
          <button
            className={`btn btn-sm flex items-center gap-2 ${viewMode === 'districts' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setViewMode('districts')}
          >
            <Map size={14} /> District vs District
          </button>
        </div>

        {/* ── Citizen Rankings Mode ─────────────────── */}
        {viewMode === 'citizens' && (
          <div className="glass-card" style={{ padding: '24px' }}>
            <div className="flex items-center gap-2 mb-4">
              <Trophy size={18} color="#fbbf24" />
              <h3 className="text-lg font-semibold">Citizen Cleanliness Leaders</h3>
            </div>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                <span className="spinner"></span> Loading rankings...
              </div>
            ) : leaderboard.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                No data available yet. Start reporting civic cleanliness issues to earn points!
              </div>
            ) : (
              <div className="leaderboard-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {leaderboard.map((student) => {
                  const badge = getRankBadge(student.rank);
                  const isMe = user?.id === student.id;
                  return (
                    <div
                      key={student.id}
                      className="leaderboard-item"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '8px',
                        padding: '14px 16px',
                        borderRadius: '12px',
                        background: isMe ? 'rgba(16, 185, 129, 0.1)' : 'var(--glass-bg)',
                        border: isMe ? '1px solid var(--accent-green)' : '1px solid var(--glass-border)'
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex justify-center items-center font-bold" style={{ width: '40px', height: '40px', borderRadius: '50%', background: badge.bg, color: badge.color, fontSize: student.rank <= 3 ? '1.5rem' : '1.1rem', flexShrink: 0 }}>
                          {badge.icon}
                        </div>
                        <div>
                          <div className="font-semibold text-lg flex items-center gap-2 flex-wrap">
                            {student.name || 'Citizen'}
                            {isMe && <span className="badge badge-primary text-xs ml-2">You</span>}
                          </div>
                          <div className="text-sm text-muted">
                            {student.reports_count} reports • {student.badge || 'Civic Seedling'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-xl text-accent">{(student.points || 0).toLocaleString()}</div>
                        <div className="text-xs text-muted">points</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── District vs District Mode ────────────── */}
        {viewMode === 'districts' && (
          <div>
            {/* Top 3 Podium */}
            <div className="grid-3 mb-6">
              {DISTRICT_MOCK.slice(0, 3).map((d, i) => (
                <div key={d.district} className="glass-card" style={{
                  padding: '24px', textAlign: 'center',
                  background: i === 0 ? 'linear-gradient(135deg, rgba(251,191,36,0.12), rgba(251,191,36,0.04))' : 'var(--glass-bg)',
                  border: i === 0 ? '1px solid rgba(251,191,36,0.4)' : '1px solid var(--glass-border)',
                  order: i === 0 ? 1 : i === 1 ? 0 : 2
                }}>
                  <div style={{ fontSize: i === 0 ? '3rem' : '2rem', marginBottom: '8px' }}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                  </div>
                  <h3 className="font-bold text-lg">{d.district}</h3>
                  <p className="text-xs text-muted mb-3">{d.state}</p>
                  <div style={{
                    padding: '8px 16px', borderRadius: '20px', display: 'inline-block', marginBottom: '12px',
                    background: i === 0 ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.06)',
                    color: i === 0 ? '#fbbf24' : 'var(--text-secondary)',
                    fontSize: '1.2rem', fontWeight: 800
                  }}>
                    ⭐ {d.swachhScore} / 100
                  </div>
                  <div className="flex justify-around mt-2" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <div><div className="font-bold text-sm text-green">{d.resolved}</div><div>Resolved</div></div>
                    <div><div className="font-bold text-sm">{d.citizens}</div><div>Citizens</div></div>
                    <div><div className="font-bold text-sm">{d.totalReports}</div><div>Reports</div></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Full Rankings Table */}
            <div className="glass-card" style={{ padding: '24px' }}>
              <div className="flex items-center gap-2 mb-4">
                <BarChart2 size={18} color="#10b981" />
                <h3 className="text-lg font-semibold">Full District Swachh Rankings</h3>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>District</th>
                      <th>Active Citizens</th>
                      <th>Total Reports</th>
                      <th>Resolved</th>
                      <th>Avg Pts/Citizen</th>
                      <th>Swachh Score</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DISTRICT_MOCK.map((d, i) => (
                      <tr key={d.district}>
                        <td>
                          <span style={{ fontWeight: 800, fontSize: i < 3 ? '1.2rem' : '0.9rem' }}>
                            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                          </span>
                        </td>
                        <td className="font-semibold">🏛️ {d.district}</td>
                        <td><span className="badge badge-blue">{d.citizens}</span></td>
                        <td>{d.totalReports}</td>
                        <td><span className="badge badge-green">{d.resolved}</span></td>
                        <td style={{ color: '#10b981', fontWeight: 700 }}>{d.avgPoints.toLocaleString()} pts</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="eff-bar-bg" style={{ flex: 1, height: '8px', minWidth: '60px' }}>
                              <div className="eff-bar-fill" style={{ width: `${d.swachhScore}%`, background: d.swachhScore >= 70 ? '#10b981' : d.swachhScore >= 50 ? '#f59e0b' : '#ef4444' }} />
                            </div>
                            <span className="text-xs font-bold">{d.swachhScore}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${d.swachhScore >= 70 ? 'badge-green' : d.swachhScore >= 50 ? 'badge-yellow' : 'badge-red'}`}>
                            {d.swachhScore >= 70 ? 'Excellent' : d.swachhScore >= 50 ? 'Moderate' : 'Needs Help'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
