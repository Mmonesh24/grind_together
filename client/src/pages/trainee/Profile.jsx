import useAuthStore from '../../store/authStore';
import GlassCard from '../../components/ui/GlassCard';
import StatCard from '../../components/ui/StatCard';
import StreakBadge from '../../components/ui/StreakBadge';
import './Profile.css';

export default function Profile() {
  const { user } = useAuthStore();
  const p = user?.profile || {};
  const g = user?.gamification || {};
  const ss = p.startingStats || {};

  return (
    <div className="profile-page page-enter">
      {/* Hero */}
      <GlassCard className="profile-hero" glow>
        <div className="profile-hero__avatar">
          {p.name?.charAt(0)?.toUpperCase() || '?'}
        </div>
        <div className="profile-hero__info">
          <h1 className="profile-hero__name">{p.name || 'Anonymous'}</h1>
          <span className="profile-hero__branch">📍 {p.gymBranch || 'No branch'}</span>
          <span className="profile-hero__role">{user?.role?.toUpperCase()}</span>
        </div>
        <StreakBadge streak={g.currentStreak || 0} />
      </GlassCard>

      {/* Stats */}
      <div className="profile-stats">
        <StatCard icon="⭐" label="Total Points" value={g.totalPoints || 0} className="page-enter stagger-1" />
        <StatCard icon="🔥" label="Current Streak" value={g.currentStreak || 0} className="page-enter stagger-2" />
        <StatCard icon="🏅" label="Longest Streak" value={g.longestStreak || 0} className="page-enter stagger-3" />
      </div>

      {/* Starting Stats */}
      <GlassCard className="profile-starting page-enter stagger-4">
        <h3>Starting Stats</h3>
        <div className="profile-starting__grid">
          <div className="profile-stat-item">
            <span className="profile-stat-item__label">Weight</span>
            <span className="profile-stat-item__value">{ss.weight ? `${ss.weight} kg` : '—'}</span>
          </div>
          <div className="profile-stat-item">
            <span className="profile-stat-item__label">Body Fat</span>
            <span className="profile-stat-item__value">{ss.bodyFatPct ? `${ss.bodyFatPct}%` : '—'}</span>
          </div>
          <div className="profile-stat-item">
            <span className="profile-stat-item__label">Goal</span>
            <span className="profile-stat-item__value">{ss.fitnessGoal || '—'}</span>
          </div>
        </div>
      </GlassCard>

      {/* QR Code */}
      <GlassCard className="profile-qr page-enter stagger-5">
        <h3>QR Check-In Code</h3>
        <div className="profile-qr__code">
          <div className="profile-qr__placeholder">
            <span>📱</span>
            <span className="profile-qr__id">{p.qrCode || user?.id}</span>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
