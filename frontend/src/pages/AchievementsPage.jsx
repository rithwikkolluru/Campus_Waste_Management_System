import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config';
import usePoints from '../hooks/usePoints';
import { Award, Gift, Target, CheckCircle2, Lock } from 'lucide-react';
import './Dashboard.css';

export const BADGE_TIERS = [
  { points: 25000,  title: 'Ward Volunteer 3',   icon: '🥉', color: 'linear-gradient(135deg, #cd7f32, #8c561b)' },
  { points: 50000,  title: 'Ward Volunteer 2',   icon: '🥉', color: 'linear-gradient(135deg, #cd7f32, #8c561b)' },
  { points: 75000,  title: 'Ward Volunteer 1',   icon: '🥉', color: 'linear-gradient(135deg, #cd7f32, #8c561b)' },
  { points: 100000, title: 'Municipal Steward 3', icon: '🥈', color: 'linear-gradient(135deg, #c0c0c0, #737373)' },
  { points: 125000, title: 'Municipal Steward 2', icon: '🥈', color: 'linear-gradient(135deg, #c0c0c0, #737373)' },
  { points: 150000, title: 'Municipal Steward 1', icon: '🥈', color: 'linear-gradient(135deg, #c0c0c0, #737373)' },
  { points: 175000, title: 'District Cleanliness Leader 3', icon: '🏅', color: 'linear-gradient(135deg, #ffd700, #b8860b)' },
  { points: 200000, title: 'District Cleanliness Leader 2', icon: '🏅', color: 'linear-gradient(135deg, #ffd700, #b8860b)' },
  { points: 225000, title: 'District Cleanliness Leader 1', icon: '🏅', color: 'linear-gradient(135deg, #ffd700, #b8860b)' },
  { points: 250000, title: 'State Swachh Ambassador 3',  icon: '💎', color: 'linear-gradient(135deg, #b9f2ff, #4dd2ff)' },
  { points: 275000, title: 'State Swachh Ambassador 2',  icon: '💎', color: 'linear-gradient(135deg, #b9f2ff, #4dd2ff)' },
  { points: 300000, title: 'State Swachh Ambassador 1',  icon: '💎', color: 'linear-gradient(135deg, #b9f2ff, #4dd2ff)' },
  { points: 325000, title: 'Telangana Eco Champion 3', icon: '👑', color: 'linear-gradient(135deg, #e5e4e2, #a09d98)' },
  { points: 350000, title: 'Telangana Eco Champion 2', icon: '👑', color: 'linear-gradient(135deg, #e5e4e2, #a09d98)' },
  { points: 375000, title: 'Telangana Eco Champion 1', icon: '👑', color: 'linear-gradient(135deg, #e5e4e2, #a09d98)' },
  { points: 400000, title: 'Statewide Swachh Icon',   icon: '🏆', color: 'linear-gradient(135deg, #ffeb3b, #f57f17)', isUltimate: true },
];

export default function AchievementsPage() {
  const { user }  = useAuth();
  const token = localStorage.getItem('ecocampus_token');
  const { points } = usePoints(token);
  const totalPoints = points.total_points || 0;
  const [districtRank, setDistrictRank] = useState(null);

  useEffect(() => {
    if (!token || !user?.id) return;
    fetch(`${API_BASE_URL}/api/leaderboard?period=all_time`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const me = data?.leaderboard?.find((s) => Number(s.id) === Number(user.id));
        if (me) setDistrictRank(me.rank);
      })
      .catch(() => {});
  }, [token, user?.id]);

  // Milestone logic
  const totalEarnedRs = Math.floor(totalPoints / 1000) * 10;
  const municipalTaxRebate = Math.floor(totalPoints / 2500) * 50;
  const pointsToNextRs = 1000 - (totalPoints % 1000);
  const rsProgress = (totalPoints % 1000) / 1000 * 100;

  // Rank logic
  let currentRank = { title: 'Civic Seedling', icon: '🌱', color: 'linear-gradient(135deg, #4ade80, #16a34a)' };
  let nextRank = BADGE_TIERS[0];
  let rankIndex = -1;

  for (let i = 0; i < BADGE_TIERS.length; i++) {
    if (totalPoints >= BADGE_TIERS[i].points) {
      currentRank = BADGE_TIERS[i];
      rankIndex = i;
    } else {
      nextRank = BADGE_TIERS[i];
      break;
    }
  }

  // Calculate progress to next rank
  const prevRankPoints = rankIndex >= 0 ? BADGE_TIERS[rankIndex].points : 0;
  const nextRankPoints = nextRank ? nextRank.points : prevRankPoints;
  const rankProgress = nextRank ? ((totalPoints - prevRankPoints) / (nextRankPoints - prevRankPoints)) * 100 : 100;

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-header flex justify-between items-center">
          <div>
            <h1>🏅 Civic Rewards & Municipal Achievements</h1>
            <p>Earn municipal property tax rebates, utility discounts, and Swachh civic recognition.</p>
          </div>
          <div className="badge badge-primary" style={{ fontSize: '1.1rem', padding: '10px 16px' }}>
            <Award size={18} /> {totalPoints.toLocaleString()} Total Points
          </div>
        </div>

        <div className="grid-2 mb-6" style={{ alignItems: 'stretch' }}>
          {/* Current Rank Card */}
          <div className="glass-card" style={{ padding: '32px', textAlign: 'center', background: currentRank.isUltimate ? 'linear-gradient(145deg, rgba(255,235,59,0.1), rgba(245,127,23,0.05))' : 'var(--glass-bg)', border: currentRank.isUltimate ? '1px solid rgba(255,235,59,0.3)' : '1px solid var(--glass-border)' }}>
            <h3 className="text-lg font-semibold mb-6 text-left">Civic Cleanliness Rank</h3>
            <div style={{
              width: '120px', height: '120px', margin: '0 auto 20px', borderRadius: '50%',
              background: currentRank.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '4rem', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', position: 'relative'
            }}>
              {currentRank.icon}
              {currentRank.isUltimate && (
                <div style={{ position: 'absolute', inset: -10, border: '2px dashed #ffeb3b', borderRadius: '50%', animation: 'spin 10s linear infinite' }} />
              )}
            </div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '8px' }}>
              {currentRank.title}
            </h2>
            {districtRank != null && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                background: 'rgba(251, 191, 36, 0.15)', border: '1px solid rgba(251, 191, 36, 0.35)',
                borderRadius: '20px', padding: '6px 14px', marginBottom: '12px',
                fontSize: '0.95rem', fontWeight: 600, color: '#fbbf24',
              }}>
                🏆 District Rank #{districtRank}
              </div>
            )}
            <p className="text-muted" style={{ marginBottom: '24px' }}>
              {currentRank.isUltimate 
                ? "You've achieved the ultimate Statewide Swachh Icon status! Thank you for transforming our state!"
                : "Keep reporting civic cleanliness issues to unlock higher municipal tax rebates!"}
            </p>

            {!currentRank.isUltimate && nextRank && (
              <div style={{ textAlign: 'left', background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px' }}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold">Next: {nextRank.title}</span>
                  <span className="text-xs text-muted">{totalPoints.toLocaleString()} / {nextRankPoints.toLocaleString()}</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-3 mb-2">
                  <div className="h-3 rounded-full" style={{ width: `${Math.min(100, Math.max(0, rankProgress))}%`, background: nextRank.color, transition: 'width 1s ease-in-out' }}></div>
                </div>
                <p className="text-xs text-muted text-right">{nextRankPoints - totalPoints} points remaining</p>
              </div>
            )}
          </div>

          {/* Municipal Vouchers & Rewards Card */}
          <div className="glass-card" style={{ padding: '32px' }}>
             <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Gift className="text-green" /> Civic Vouchers & Tax Rebates</h3>
             <div style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.02))', padding: '20px', borderRadius: '16px', border: '1px solid rgba(16,185,129,0.2)', textAlign: 'center', marginBottom: '16px' }}>
                <span className="text-muted" style={{ display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.75rem' }}>Municipal Property Tax Rebate</span>
                <span style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--accent-green)', lineHeight: 1 }}>₹{municipalTaxRebate}</span>
                <p className="text-xs mt-3 text-secondary">Redeemable against GHMC / Municipal Property Tax & Water Utility Bills.</p>
             </div>

             <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '14px', marginBottom: '16px' }}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-semibold flex items-center gap-1"><Target size={14} /> Direct Cash Reward: ₹{totalEarnedRs}</span>
                  <span className="text-xs font-bold text-green">{totalPoints % 1000} / 1000</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 mb-1">
                  <div className="h-2 rounded-full bg-green-500" style={{ width: `${rsProgress}%` }}></div>
                </div>
                <p className="text-xs text-muted text-right">{pointsToNextRs} points to next ₹10</p>
             </div>
          </div>
        </div>

        {/* Badge Journey */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 className="text-lg font-semibold mb-6">The Road to Statewide Swachh Icon</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {BADGE_TIERS.map((tier, idx) => {
              const isUnlocked = totalPoints >= tier.points;
              const isCurrent = currentRank.title === tier.title;
              return (
                <div key={idx} style={{ 
                  display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', borderRadius: '12px',
                  background: isCurrent ? 'rgba(255,255,255,0.05)' : 'transparent',
                  border: isCurrent ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent',
                  opacity: isUnlocked ? 1 : 0.5,
                  transition: 'all 0.3s'
                }}>
                  <div style={{ 
                    width: '60px', height: '60px', borderRadius: '50%', flexShrink: 0,
                    background: isUnlocked ? tier.color : '#333', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem',
                    filter: isUnlocked ? 'none' : 'grayscale(100%)'
                  }}>
                    {isUnlocked ? tier.icon : <Lock size={20} color="#888" />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: isUnlocked ? '#fff' : '#888' }}>
                      {tier.title} {isCurrent && <span className="badge badge-primary" style={{ marginLeft: '8px', fontSize: '0.65rem' }}>Current</span>}
                    </h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Requires {tier.points.toLocaleString()} points</p>
                  </div>
                  {isUnlocked && <CheckCircle2 size={24} color="var(--accent-green)" />}
                </div>
              );
            })}
          </div>
        </div>

      </main>
    </div>
  );
}
