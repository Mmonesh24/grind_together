import { useEffect, useState } from 'react';
import GlassCard from '../../components/ui/GlassCard';
import ProgressRing from '../../components/ui/ProgressRing';
import api from '../../services/api';
import useAuthStore from '../../store/authStore';
import ChallengeSubmissionModal from '../../components/challenges/ChallengeSubmissionModal';
import { getSocket } from '../../services/socket';
import './Challenges.css';

export default function Challenges() {
  const { user } = useAuthStore();
  const [challenges, setChallenges] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [tab, setTab] = useState('active');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState(null);

  const fetchChallenges = async () => {
    setLoading(true);
    try {
      const [{ data: cRes }, { data: sRes }] = await Promise.all([
        api.get(`/challenges?status=${tab}`),
        api.get('/challenges/submissions')
      ]);
      setChallenges(cRes.data);
      setSubmissions(sRes.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchChallenges(); }, [tab]);

  useEffect(() => {
    const socket = getSocket();
    if (socket) {
      const handleRefresh = () => fetchChallenges();
      socket.on('challenge:update', handleRefresh);
      socket.on('proof:status_update', handleRefresh);
      
      return () => {
        socket.off('challenge:update', handleRefresh);
        socket.off('proof:status_update', handleRefresh);
      };
    }
  }, []);

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
        <div className="challenge-media">
          <iframe
            src={`https://www.youtube.com/embed/${videoId}`}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="Instructional Video"
          />
        </div>
      );
    }

    if (isVideo) {
      return (
        <div className="challenge-media">
          <video src={fullUrl} controls preload="metadata" style={{ width: '100%', borderRadius: 'var(--radius-md)' }} />
        </div>
      );
    }

    return (
      <div className="challenge-media">
        <img src={fullUrl} alt="Challenge Instruction" onError={(e) => e.target.style.display='none'} />
      </div>
    );
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
      ) : (
        <div className="challenges-grid">
          {(tab === 'completed' 
            ? challenges.filter(c => 
                c.status === 'completed' || 
                submissions.some(s => s.challengeId?._id === c._id && s.status === 'accepted')
              )
            : challenges
          ).map((c) => {
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
                    Target: {c.challengeType === 'manual' ? 'Manual Proof' : `${c.targetValue} ${c.targetType === 'cardio_km' ? 'km' : c.targetType === 'workout_days' ? 'days' : 'cal'}`}
                  </span>
                  <span className="challenge-card__days">
                    ⏰ {getDaysLeft(c.expiryDate)} days left
                  </span>
                </div>

                <MediaRenderer url={c.mediaUrl} />

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
                    <div className="challenge-card__status-group">
                      {c.challengeType === 'manual' ? (
                        (() => {
                          const submission = submissions.find(s => s.challengeId._id === c._id);
                          if (!submission) {
                            return (
                              <button className="challenge-card__submit-proof" onClick={() => { setSelectedChallenge(c); setShowModal(true); }}>
                                Submit Proof 📤
                              </button>
                            );
                          }
                          return (
                            <span className={`challenge-submission-status ${submission.status}`}>
                              {submission.status === 'pending' ? '⏳ Pending Review' : 
                               submission.status === 'accepted' ? '✅ Approved (+150 pts)' : 
                               '❌ Rejected'}
                            </span>
                          );
                        })()
                      ) : (
                        <span className="challenge-card__joined">✅ Joined</span>
                      )}
                    </div>
                  )}
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {showModal && selectedChallenge && (
        <ChallengeSubmissionModal 
          challenge={selectedChallenge} 
          onClose={() => { setShowModal(false); setSelectedChallenge(null); }}
          onSuccess={() => { setShowModal(false); setSelectedChallenge(null); fetchChallenges(); }}
        />
      )}
    </div>
  );
}
