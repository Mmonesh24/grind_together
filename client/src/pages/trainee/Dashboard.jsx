import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import StatCard from '../../components/ui/StatCard';
import GlassCard from '../../components/ui/GlassCard';
import StreakBadge from '../../components/ui/StreakBadge';
import ProgressRing from '../../components/ui/ProgressRing';
import api from '../../services/api';
import ActivityFeed from '../../components/social/ActivityFeed';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './Dashboard.css';

export default function Dashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [todayLog, setTodayLog] = useState(null);
  const [history, setHistory] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [logRes, histRes, lbRes] = await Promise.allSettled([
          api.get('/logs/today'),
          api.get('/logs/history?range=7'),
          api.get('/leaderboard?limit=5'),
        ]);
        if (logRes.status === 'fulfilled') setTodayLog(logRes.value.data.data);
        if (histRes.status === 'fulfilled') setHistory(histRes.value.data.data);
        if (lbRes.status === 'fulfilled') setLeaderboard(lbRes.value.data.data);
      } catch {}
      setLoading(false);
    };
    fetchData();
  }, []);

  const gam = user?.gamification || {};
  const weeklyWorkouts = history.filter((l) => l.checklist?.workout).length;

  const chartData = history
    .slice()
    .reverse()
    .map((l) => ({
      day: new Date(l.date).toLocaleDateString('en', { weekday: 'short' }),
      calories: l.metrics?.caloriesBurned || 0,
    }));

  const checklistDone = todayLog
    ? [todayLog.checklist?.water, todayLog.checklist?.protein, todayLog.checklist?.workout].filter(Boolean).length
    : 0;

  return (
    <div className="dashboard page-enter">
      <div className="dashboard__header">
        <div>
          <h1 className="dashboard__greeting">
            Hey, {user?.profile?.name || 'Athlete'} 👋
          </h1>
          <p className="dashboard__subtitle">Let's crush it today</p>
        </div>
        <StreakBadge streak={gam.currentStreak || 0} />
      </div>

      {/* Stat Cards Row */}
      <div className="dashboard__stats">
        <StatCard icon="🔥" label="Current Streak" value={gam.currentStreak || 0} className="stagger-1 page-enter" />
        <StatCard icon="⭐" label="Total Points" value={gam.totalPoints || 0} className="stagger-2 page-enter" />
        <StatCard icon="💪" label="Weekly Workouts" value={`${weeklyWorkouts}/7`} className="stagger-3 page-enter" />
      </div>

      <div className="dashboard__grid">
        {/* Daily Checklist */}
        <GlassCard className="dashboard__checklist stagger-4 page-enter">
          <h3 className="dashboard__section-title">Today's Checklist</h3>
          <div className="checklist-items">
            <div className={`checklist-item ${todayLog?.checklist?.water ? 'done' : ''}`}>
              <span className="checklist-item__icon">💧</span>
              <span>Hydration</span>
              <span className="checklist-item__status">{todayLog?.checklist?.water ? '✅' : '○'}</span>
            </div>
            <div className={`checklist-item ${todayLog?.checklist?.protein ? 'done' : ''}`}>
              <span className="checklist-item__icon">🥩</span>
              <span>Protein Intake</span>
              <span className="checklist-item__status">{todayLog?.checklist?.protein ? '✅' : '○'}</span>
            </div>
            <div className={`checklist-item ${todayLog?.checklist?.workout ? 'done' : ''}`}>
              <span className="checklist-item__icon">🏋️</span>
              <span>Workout</span>
              <span className="checklist-item__status">{todayLog?.checklist?.workout ? '✅' : '○'}</span>
            </div>
          </div>
          <div className="checklist-progress">
            <ProgressRing progress={(checklistDone / 3) * 100} size={60} />
            <span className="checklist-progress__text">{checklistDone}/3 complete</span>
          </div>
          <button className="dashboard__log-btn" onClick={() => navigate('/log')}>
            {todayLog ? '📝 Update Log' : '📝 Log Activity'}
          </button>
        </GlassCard>

        {/* Activity Chart */}
        <GlassCard className="dashboard__chart stagger-5 page-enter">
          <h3 className="dashboard__section-title">Calories This Week</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="day" stroke="#8888a0" fontSize={12} />
                <YAxis stroke="#8888a0" fontSize={12} />
                <Tooltip
                  contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', color: '#e8e8f0' }}
                />
                <Bar dataKey="calories" fill="#00e676" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="empty-state">No data yet. Start logging!</p>
          )}
        </GlassCard>

        {/* Mini Leaderboard */}
        <GlassCard className="dashboard__leaderboard stagger-6 page-enter">
          <h3 className="dashboard__section-title">🏆 Top 5</h3>
          <div className="mini-leaderboard">
            {leaderboard.map((entry) => (
              <div key={entry.id} className={`mini-leaderboard__row ${entry.id === user?.id ? 'me' : ''}`}>
                <span className="mini-leaderboard__rank">
                  {entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : `#${entry.rank}`}
                </span>
                <span className="mini-leaderboard__name">{entry.name || 'Anonymous'}</span>
                <span className="mini-leaderboard__points">{entry.totalPoints} pts</span>
              </div>
            ))}
            {leaderboard.length === 0 && <p className="empty-state">No users yet</p>}
          </div>
          <button className="dashboard__view-all" onClick={() => navigate('/leaderboard')}>
            View Full Leaderboard →
          </button>
        </GlassCard>

        {/* Live Activity Feed */}
        <GlassCard className="dashboard__feed page-enter stagger-6">
          <ActivityFeed />
        </GlassCard>
      </div>
    </div>
  );
}
