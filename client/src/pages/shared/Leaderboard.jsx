import { useEffect, useState } from 'react';
import GlassCard from '../../components/ui/GlassCard';
import api from '../../services/api';
import { getSocket } from '../../services/socket';
import useAuthStore from '../../store/authStore';
import './Leaderboard.css';

const TABS = [
  { key: 'points', label: '⭐ Points' },
  { key: 'streaks', label: '🔥 Streaks' },
];

export default function Leaderboard() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState('points');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        const endpoint = tab === 'points' ? '/leaderboard' : '/leaderboard/streaks';
        const { data: res } = await api.get(`${endpoint}?limit=20`);
        setData(res.data);
      } catch {}
      setLoading(false);
    };
    fetchLeaderboard();

    const socket = getSocket();
    if (!socket) return;
    
    // We don't need to setLoading(true) on background refreshes, better UX.
    const refreshLeaderboard = async () => {
      try {
        const endpoint = tab === 'points' ? '/leaderboard' : '/leaderboard/streaks';
        const { data: res } = await api.get(`${endpoint}?limit=20`);
        setData(res.data);
      } catch {}
    };

    socket.on('leaderboard:update', refreshLeaderboard);
    socket.on('points:update', refreshLeaderboard);

    return () => {
      socket.off('leaderboard:update', refreshLeaderboard);
      socket.off('points:update', refreshLeaderboard);
    };
  }, [tab]);

  return (
    <div className="leaderboard-page page-enter">
      <h1 className="leaderboard-page__title">🏆 Leaderboard</h1>

      <div className="leaderboard-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`leaderboard-tab ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Top 3 Podium */}
      {data.length >= 3 && (
        <div className="podium">
          {[1, 0, 2].map((idx) => {
            const entry = data[idx];
            if (!entry) return null;
            return (
              <div key={entry.id} className={`podium__place podium__place--${entry.rank}`}>
                <div className="podium__avatar">
                  {entry.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <span className="podium__medal">
                  {['🥇', '🥈', '🥉'][entry.rank - 1]}
                </span>
                <span className="podium__name">{entry.name || 'Anonymous'}</span>
                <span className="podium__score">
                  {tab === 'points' ? `${entry.totalPoints} pts` : `${entry.currentStreak} days`}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Full Table */}
      <GlassCard className="leaderboard-table-card">
        {loading ? (
          <p className="empty-state">Loading...</p>
        ) : data.length === 0 ? (
          <p className="empty-state">No users yet. Be the first!</p>
        ) : (
          <div className="table-container">
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Name</th>
                  <th>Branch</th>
                  <th>{tab === 'points' ? 'Points' : 'Streak'}</th>
                </tr>
              </thead>
              <tbody>
                {data.map((entry) => (
                  <tr key={entry.id} className={entry.id === user?.id ? 'me' : ''}>
                    <td className="leaderboard-table__rank">
                      {entry.rank <= 3
                        ? ['🥇', '🥈', '🥉'][entry.rank - 1]
                        : `#${entry.rank}`}
                    </td>
                    <td>{entry.name || 'Anonymous'}</td>
                    <td className="leaderboard-table__branch">{entry.gymBranch || '—'}</td>
                    <td className="leaderboard-table__score">
                      {tab === 'points' ? entry.totalPoints : entry.currentStreak}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
