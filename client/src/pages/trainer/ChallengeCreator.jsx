import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../../components/ui/GlassCard';
import useAuthStore from '../../store/authStore';
import api from '../../services/api';
import './ChallengeCreator.css';

export default function ChallengeCreator() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [challengeType, setChallengeType] = useState('manual');
  const [targetType, setTargetType] = useState('manual');
  const [targetValue, setTargetValue] = useState('1');
  const [duration, setDuration] = useState(7);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const getFullMediaUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('/uploads')) {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      return `${baseUrl}${url}`;
    }
    return url;
  };

  const MediaPreview = ({ url }) => {
    if (!url) return null;
    const fullUrl = getFullMediaUrl(url);
    const isYoutube = fullUrl.includes('youtube.com') || fullUrl.includes('youtu.be');
    const isVideo = /\.(mp4|webm|ogg|mov)$|^data:video\//i.test(fullUrl);

    return (
      <div className="creator-media-preview brutal-card">
        {isYoutube ? (
          <p className="preview-note">📺 YouTube Link Detected</p>
        ) : isVideo ? (
          <video src={fullUrl} controls style={{ width: '100%', borderRadius: '8px' }} />
        ) : (
          <img src={fullUrl} alt="Preview" style={{ width: '100%', borderRadius: '8px' }} />
        )}
        <button type="button" className="remove-media" onClick={() => setMediaUrl('')}>Remove ×</button>
      </div>
    );
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploading(true);
    setError('');
    const formData = new FormData();
    formData.append('file', file);

    try {
      const { data } = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setMediaUrl(data.data.url);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!title || !targetValue) { setError('Title and target are required'); return; }
    setLoading(true);

    const start = new Date();
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + duration);

    try {
      await api.post('/challenges', {
        title, 
        description, 
        mediaUrl,
        challengeType,
        targetType: challengeType === 'manual' ? 'manual' : targetType,
        targetValue: parseFloat(targetValue),
        gymBranch: user?.profile?.gymBranch || '',
        startDate: start.toISOString(),
        expiryDate: expiry.toISOString(),
      });
      navigate('/challenges');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create');
    } finally {
      setLoading(false);
    }
  };

  const TARGET_TYPES = [
    { value: 'manual', icon: '📝', label: 'Manual Review', unit: 'proofs' },
    { value: 'workout_days', icon: '💪', label: 'Workout Days', unit: 'days' },
    { value: 'cardio_km', icon: '🏃', label: 'Cardio Distance', unit: 'km' },
    { value: 'calories', icon: '🔥', label: 'Calories Burned', unit: 'cal' },
  ];

  const DURATIONS = [7, 14, 21, 30, 60];

  return (
    <div className="creator-page page-enter">
      <h1 className="creator-page__title">🏆 Create Challenge</h1>
      <p className="creator-page__subtitle">Challenge your branch members to push harder</p>

      <form onSubmit={handleSubmit} className="creator-form">
        {error && <div className="auth-form__error">{error}</div>}

        <GlassCard className="creator-section">
          <h3>Challenge Info</h3>
          <div className="creator-field">
            <label>Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. January Shred Challenge" required />
          </div>
          <div className="creator-field">
            <label>Description (optional)</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the challenge..." rows={2} />
          </div>
        </GlassCard>

        <GlassCard className="creator-section">
          <h3>Challenge Type & Target</h3>
          <div className="creator-field">
             <label>Review Type</label>
             <div className="creator-durations" style={{ marginBottom: '15px' }}>
                <button type="button" className={`creator-duration ${challengeType === 'manual' ? 'active' : ''}`} onClick={() => { setChallengeType('manual'); setTargetType('manual'); }}>
                  Manual Review 📝
                </button>
                <button type="button" className={`creator-duration ${challengeType === 'automatic' ? 'active' : ''}`} onClick={() => { setChallengeType('automatic'); setTargetType('workout_days'); }}>
                  Automatic Tracking ⚡
                </button>
             </div>
          </div>

          {challengeType === 'automatic' && (
            <>
              <label>System Metric</label>
              <div className="creator-types">
                {TARGET_TYPES.filter(t => t.value !== 'manual').map((t) => (
                  <button key={t.value} type="button" className={`creator-type ${targetType === t.value ? 'active' : ''}`} onClick={() => setTargetType(t.value)}>
                    <span className="creator-type__icon">{t.icon}</span>
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="creator-field" style={{ marginTop: 'var(--space-md)' }}>
            <label>Target Value ({TARGET_TYPES.find(t => t.value === targetType)?.unit})</label>
            <input type="number" value={targetValue} onChange={(e) => setTargetValue(e.target.value)} placeholder="e.g. 1" required />
          </div>
        </GlassCard>

        <GlassCard className="creator-section">
          <h3>Media & Instructions</h3>
          <div className="creator-field">
            <label>Instructional File (Upload Image/Video)</label>
            <input type="file" onChange={handleFileUpload} accept="image/*,video/*" />
            {uploading && <p className="uploading-text">Uploading media... ⏳</p>}
          </div>

          <div className="creator-field" style={{ marginTop: '15px' }}>
            <label>OR Use Media URL (YouTube/Direct Link)</label>
            <input type="text" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." />
          </div>
          <MediaPreview url={mediaUrl} />
          <p className="creator-field-hint">Upload a tutorial video or paste a link to a motivational photo.</p>
        </GlassCard>

        <GlassCard className="creator-section">
          <h3>Duration</h3>
          <div className="creator-durations">
            {DURATIONS.map((d) => (
              <button key={d} type="button" className={`creator-duration ${duration === d ? 'active' : ''}`} onClick={() => setDuration(d)}>
                {d} days
              </button>
            ))}
          </div>
        </GlassCard>

        <button className="creator-submit" type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Launch Challenge 🚀'}
        </button>
      </form>
    </div>
  );
}
