import { useEffect, useState } from 'react';
import GlassCard from '../../components/ui/GlassCard';
import ProgressRing from '../../components/ui/ProgressRing';
import api from '../../services/api';
import useAuthStore from '../../store/authStore';
import './Challenges.css';

export default function Challenges() {
  const { user } = useAuthStore();
  const [challenges, setChallenges] = useState([]);
  const [tab, setTab] = useState('active');
  const [loading, setLoading] = useState(true);

  const fetchChallenges = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/challenges?status=${tab}`);
      setChallenges(data.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchChallenges(); }, [tab]);

  const handleJoin = async (id) => {
    try {
      await api.post(`/challenges/${id}/join`);
      fetchChallenges();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to join');
    }
  };

  const getTargetIcon = (type) => {
    if (type === 'cardio_km') return '🏃';
    if (type === 'workout_days') return '💪';
    return '🔥';
  };

  const getDaysLeft = (expiry) => {
    const diff = Math.ceil((new Date(expiry) - new Date()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  return (
    <div className="challenges-page page-enter">
      <h1 className="challenges-page__title">🏆 Challenges</h1>

      <div className="challenges-tabs">
        {['active', 'completed', 'expired'].map((t) => (
          <button key={t} className={`challenges-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="empty-state">Loading...</p>
      ) : challenges.length === 0 ? (
        <p className="empty-state">No {tab} challenges</p>
      ) : (
        <div className="challenges-grid">
          {challenges.map((c) => {
            const myParticipation = c.participants?.find(
              (p) => (p.userId?._id || p.userId)?.toString() === user?.id
            );
            const progress = myParticipation
              ? (myParticipation.currentProgress / c.targetValue) * 100
              : 0;

            return (
              <GlassCard key={c._id} className="challenge-card">
                <div className="challenge-card__header">
                  <span className="challenge-card__icon">{getTargetIcon(c.targetType)}</span>
                  <div>
                    <h3 className="challenge-card__title">{c.title}</h3>
                    {c.description && (
                      <p className="challenge-card__desc">{c.description}</p>
                    )}
                  </div>
                </div>

                <div className="challenge-card__meta">
                  <span className="challenge-card__target">
                    Target: {c.targetValue} {c.targetType === 'cardio_km' ? 'km' : c.targetType === 'workout_days' ? 'days' : 'cal'}
                  </span>
                  <span className="challenge-card__days">
                    ⏰ {getDaysLeft(c.expiryDate)} days left
                  </span>
                </div>

                {myParticipation && (
                  <div className="challenge-card__progress">
                    <ProgressRing progress={progress} size={50} strokeWidth={5} />
                    <span>{myParticipation.currentProgress} / {c.targetValue}</span>
                  </div>
                )}

                <div className="challenge-card__footer">
                  <span className="challenge-card__participants">
                    👥 {c.participants?.length || 0} joined
                  </span>
                  {tab === 'active' && !myParticipation && (
                    <button className="challenge-card__join" onClick={() => handleJoin(c._id)}>
                      Join Challenge
                    </button>
                  )}
                  {myParticipation && (
                    <span className="challenge-card__joined">✅ Joined</span>
                  )}
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
