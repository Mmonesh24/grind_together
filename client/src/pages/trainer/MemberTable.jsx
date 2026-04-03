import { useEffect, useState } from 'react';
import GlassCard from '../../components/ui/GlassCard';
import api from '../../services/api';
import { getSocket } from '../../services/socket';
import './MemberTable.css';

export default function MemberTable() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('totalPoints');
  const [filter, setFilter] = useState('all');

  const fetchMembers = async () => {
    try {
      const { data } = await api.get('/trainer/members');
      setMembers(data.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchMembers();

    const socket = getSocket();
    if (socket) {
      socket.on('stats:update', fetchMembers);
      socket.on('points:update', fetchMembers);
      socket.on('challenge:update', fetchMembers);
      socket.on('profile:update', fetchMembers);

      return () => {
        socket.off('stats:update', fetchMembers);
        socket.off('points:update', fetchMembers);
        socket.off('challenge:update', fetchMembers);
        socket.off('profile:update', fetchMembers);
      };
    }
  }, []);

  const handleNudge = async (userId, name) => {
    try {
      await api.post('/trainer/nudge', { userId });
      alert(`Nudge sent to ${name}!`);
    } catch {}
  };

  const handleExport = () => {
    const header = 'Name,Email,Points,Current Streak,Longest Streak,Status,Last Active\n';
    const rows = filtered.map((m) =>
      [m.name, m.email, m.totalPoints, m.currentStreak, m.longestStreak, m.status, m.lastActiveDate || 'Never'].join(',')
    );
    const csv = header + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `members_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const filtered = members
    .filter((m) => filter === 'all' || m.status === filter)
    .sort((a, b) => {
      if (sort === 'totalPoints') return b.totalPoints - a.totalPoints;
      if (sort === 'currentStreak') return b.currentStreak - a.currentStreak;
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'daysSinceActive') return (a.daysSinceActive ?? 999) - (b.daysSinceActive ?? 999);
      return 0;
    });

  const statusColor = (s) => s === 'active' ? 'var(--accent-primary)' : s === 'idle' ? 'var(--warning)' : s === 'inactive' ? 'var(--danger)' : 'var(--text-muted)';

  return (
    <div className="members-page page-enter">
      <h1 className="members-page__title">👥 Branch Members</h1>

      <div className="members-toolbar">
        <div className="members-filters">
          {['all', 'active', 'idle', 'inactive', 'new'].map((f) => (
            <button key={f} className={`members-filter ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              {f !== 'all' && ` (${members.filter(m => m.status === f).length})`}
            </button>
          ))}
        </div>
        <div className="members-actions">
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="members-sort">
            <option value="totalPoints">Sort: Points</option>
            <option value="currentStreak">Sort: Streak</option>
            <option value="name">Sort: Name</option>
            <option value="daysSinceActive">Sort: Activity</option>
          </select>
          <button className="members-export" onClick={handleExport}>📥 Export CSV</button>
        </div>
      </div>

      <GlassCard className="table-card">
        {loading ? (
          <p className="empty-state">Loading members...</p>
        ) : filtered.length === 0 ? (
          <p className="empty-state">No members found</p>
        ) : (
          <div className="table-container">
            <table className="members-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Points</th>
                  <th>Streak</th>
                  <th>Status</th>
                  <th>Today</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <div className="member-cell">
                        <div className="member-cell__avatar">{m.name.charAt(0).toUpperCase()}</div>
                        <div>
                          <div className="member-cell__name">{m.name}</div>
                          <div className="member-cell__email">{m.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="member-points">{m.totalPoints}</td>
                    <td>🔥 {m.currentStreak}</td>
                    <td>
                      <span className="member-status" style={{ color: statusColor(m.status), borderColor: statusColor(m.status) }}>
                        {m.status}
                      </span>
                    </td>
                    <td>{m.loggedToday ? '✅' : '○'}</td>
                    <td>
                      {m.status === 'inactive' && (
                        <button className="nudge-btn" onClick={() => handleNudge(m.id, m.name)}>📢 Nudge</button>
                      )}
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
