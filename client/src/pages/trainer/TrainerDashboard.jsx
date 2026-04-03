import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import StatCard from '../../components/ui/StatCard';
import GlassCard from '../../components/ui/GlassCard';
import api from '../../services/api';
import { getSocket } from '../../services/socket';
import './TrainerDashboard.css';

export default function TrainerDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [stats, setStats] = useState({});
  const [members, setMembers] = useState([]);
  const [pendingProofs, setPendingProofs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [isLive, setIsLive] = useState(true);

  const fetchData = async () => {
    try {
      const [statsRes, membersRes, proofsRes] = await Promise.allSettled([
        api.get('/trainer/stats'),
        api.get('/trainer/members'),
        api.get('/challenges/submissions/pending'),
      ]);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data.data);
      if (membersRes.status === 'fulfilled') setMembers(membersRes.value.data.data);
      if (proofsRes.status === 'fulfilled') setPendingProofs(proofsRes.value.data.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchData();

    // Setup real-time listeners
    const socket = getSocket();
    if (socket) {
      const handleRefresh = () => {
        fetchData();
        setIsLive(true);
      };
      
      socket.on('connect', () => setIsLive(true));
      socket.on('disconnect', () => setIsLive(false));
      socket.on('stats:update', handleRefresh);
      socket.on('proof:new', handleRefresh);
      socket.on('activity:new', handleRefresh);
      socket.on('challenge:update', handleRefresh);
      socket.on('points:update', handleRefresh);

      return () => {
        socket.off('connect');
        socket.off('disconnect');
        socket.off('stats:update', handleRefresh);
        socket.off('proof:new', handleRefresh);
        socket.off('activity:new', handleRefresh);
        socket.off('challenge:update', handleRefresh);
        socket.off('points:update', handleRefresh);
      };
    }
  }, []);

  const handleReview = async (id, status) => {
    const feedback = prompt(`Enter ${status} feedback (optional):`);
    setReviewing(true);
    try {
      await api.post(`/challenges/submissions/${id}/review`, { status, feedback });
      fetchData();
    } catch (err) {
      alert('Failed to review proof');
    } finally {
      setReviewing(false);
    }
  };

  const getFullMediaUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('/uploads')) {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      return `${baseUrl}${url}`;
    }
    return url;
  };

  const MediaRenderer = ({ url }) => {
    if (!url) return null;
    const fullUrl = getFullMediaUrl(url);
    const isYoutube = fullUrl.includes('youtube.com') || fullUrl.includes('youtu.be');
    const isVideo = /\.(mp4|webm|ogg|mov)$|^data:video\//i.test(fullUrl);
    
    if (isYoutube) {
      const videoId = fullUrl.split('v=')[1]?.split('&')[0] || fullUrl.split('/').pop();
      return (
        <div className="proof-media">
          <iframe
            src={`https://www.youtube.com/embed/${videoId}`}
            frameBorder="0"
            allowFullScreen
            title="Proof Video"
          />
        </div>
      );
    }

    if (isVideo) {
      return (
        <div className="proof-media">
          <video src={fullUrl} controls preload="metadata" style={{ width: '100%', borderRadius: 'var(--radius-md)' }} />
        </div>
      );
    }

    return (
      <div className="proof-media">
        <img src={fullUrl} alt="Proof" onError={(e) => e.target.style.display='none'} />
      </div>
    );
  };

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
          <div className="trainer-dash__subtitle-group">
            <p className="trainer-dash__subtitle">{user?.profile?.gymBranch} Branch Overview</p>
            {isLive && <span className="live-badge pulse"><span className="live-dot" /> LIVE SYNC</span>}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="trainer-dash__stats">
        <StatCard key={`online-${stats.onlineCount}`} icon="⚡" label="Online Now" value={stats.onlineCount || 0} className="page-enter animate-pop highlight-cyan" />
        <StatCard key={`members-${stats.totalMembers}`} icon="👥" label="Total Members" value={stats.totalMembers || 0} className="page-enter animate-pop stagger-2" />
        <StatCard key={`logged-${stats.activeToday}`} icon="✅" label="Logged Today" value={stats.activeToday || 0} className="page-enter animate-pop stagger-3" />
        <StatCard key={`att-${stats.attendanceRate}`} icon="📊" label="Attendance" value={`${stats.attendanceRate || 0}%`} className="page-enter animate-pop stagger-4" />
        <StatCard key={`streak-${stats.avgStreak}`} icon="🔥" label="Avg Streak" value={stats.avgStreak || 0} className="page-enter animate-pop stagger-5" />
        <StatCard key={`logs-${stats.weeklyLogs}`} icon="📝" label="Weekly Logs" value={stats.weeklyLogs || 0} className="page-enter animate-pop stagger-6" />
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
            <p className="empty-state">No one has logged a workout yet today. Use the "Nudge" button to motivate them! 💪</p>
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
        {/* Pending Proofs Review */}
        <GlassCard className="trainer-dash__proofs page-enter stagger-6">
          <h3 className="trainer-dash__section-title">
            📬 Proofs to Review ({pendingProofs.length})
          </h3>
          {pendingProofs.length === 0 ? (
            <p className="empty-state">No pending proofs to review. 🎉</p>
          ) : (
            <div className="proof-list">
              {pendingProofs.map((s) => (
                <div key={s._id} className="proof-row">
                  <div className="proof-row__header">
                    <span className="proof-row__name">{s.traineeId.profile.name}</span>
                    <span className="proof-row__challenge">{s.challengeId.title}</span>
                  </div>
                  {s.proofText && <p className="proof-row__text">"{s.proofText}"</p>}
                  <MediaRenderer url={s.proofUrl} />
                  <div className="proof-row__actions">
                    <button 
                      className="proof-btn reject" 
                      onClick={() => handleReview(s._id, 'rejected')}
                      disabled={reviewing}
                    >
                      Reject
                    </button>
                    <button 
                      className="proof-btn accept" 
                      onClick={() => handleReview(s._id, 'accepted')}
                      disabled={reviewing}
                    >
                      Accept (+150 pts)
                    </button>
                  </div>
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
