import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import StatCard from '../../components/ui/StatCard';
import GlassCard from '../../components/ui/GlassCard';
import api from '../../services/api';
import './TrainerDashboard.css';

export default function TrainerDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [stats, setStats] = useState({});
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, membersRes] = await Promise.allSettled([
          api.get('/trainer/stats'),
          api.get('/trainer/members'),
        ]);
        if (statsRes.status === 'fulfilled') setStats(statsRes.value.data.data);
        if (membersRes.status === 'fulfilled') setMembers(membersRes.value.data.data);
      } catch {}
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleNudge = async (userId, name) => {
    try {
      await api.post('/trainer/nudge', { userId, message: `Hey ${name}, your trainer misses you! Get back to the gym! 💪` });
      alert(`Nudge sent to ${name}!`);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to nudge');
    }
  };

  const inactive = members.filter((m) => m.status === 'inactive');
  const active = members.filter((m) => m.status === 'active');

  return (
    <div className="trainer-dash page-enter">
      <div className="trainer-dash__header">
        <div>
          <h1 className="trainer-dash__greeting">Coach {user?.profile?.name || ''} 🎯</h1>
          <p className="trainer-dash__subtitle">{user?.profile?.gymBranch} Branch Overview</p>
        </div>
      </div>

      {/* Stats */}
      <div className="trainer-dash__stats">
        <StatCard icon="👥" label="Total Members" value={stats.totalMembers || 0} className="page-enter stagger-1" />
        <StatCard icon="✅" label="Active Today" value={stats.activeToday || 0} className="page-enter stagger-2" />
        <StatCard icon="📊" label="Attendance Rate" value={`${stats.attendanceRate || 0}%`} className="page-enter stagger-3" />
        <StatCard icon="🔥" label="Avg Streak" value={stats.avgStreak || 0} className="page-enter stagger-4" />
        <StatCard icon="📝" label="Weekly Logs" value={stats.weeklyLogs || 0} className="page-enter stagger-5" />
      </div>

      <div className="trainer-dash__grid">
        {/* Inactive Members Alert */}
        <GlassCard className="trainer-dash__inactive page-enter stagger-4">
          <h3 className="trainer-dash__section-title">
            ⚠️ Needs Attention ({inactive.length})
          </h3>
          {inactive.length === 0 ? (
            <p className="empty-state">All members are on track! 🎉</p>
          ) : (
            <div className="member-alert-list">
              {inactive.slice(0, 8).map((m) => (
                <div key={m.id} className="member-alert-row">
                  <div className="member-alert-row__avatar">{m.name.charAt(0).toUpperCase()}</div>
                  <div className="member-alert-row__info">
                    <span className="member-alert-row__name">{m.name}</span>
                    <span className="member-alert-row__days">
                      {m.daysSinceActive !== null ? `${m.daysSinceActive} days inactive` : 'Never logged'}
                    </span>
                  </div>
                  <button className="member-alert-row__nudge" onClick={() => handleNudge(m.id, m.name)}>
                    📢 Nudge
                  </button>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Active Members Today */}
        <GlassCard className="trainer-dash__active page-enter stagger-5">
          <h3 className="trainer-dash__section-title">
            🟢 Active Today ({active.length})
          </h3>
          {active.length === 0 ? (
            <p className="empty-state">No one has logged yet today</p>
          ) : (
            <div className="member-active-list">
              {active.map((m) => (
                <div key={m.id} className="member-active-row">
                  <div className="member-active-row__avatar">{m.name.charAt(0).toUpperCase()}</div>
                  <span className="member-active-row__name">{m.name}</span>
                  <span className="member-active-row__streak">🔥 {m.currentStreak}</span>
                  <span className="member-active-row__points">{m.totalPoints} pts</span>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      {/* Quick Actions */}
      <div className="trainer-dash__actions">
        <button className="trainer-action-btn" onClick={() => navigate('/members')}>
          👥 View All Members
        </button>
        <button className="trainer-action-btn accent" onClick={() => navigate('/create-challenge')}>
          🏆 Create Challenge
        </button>
      </div>
    </div>
  );
}
