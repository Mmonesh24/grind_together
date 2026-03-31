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
  const [targetType, setTargetType] = useState('workout_days');
  const [targetValue, setTargetValue] = useState('');
  const [duration, setDuration] = useState(7);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
        title, description, targetType,
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
          <h3>Target Type</h3>
          <div className="creator-types">
            {TARGET_TYPES.map((t) => (
              <button key={t.value} type="button" className={`creator-type ${targetType === t.value ? 'active' : ''}`} onClick={() => setTargetType(t.value)}>
                <span className="creator-type__icon">{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
          <div className="creator-field" style={{ marginTop: 'var(--space-md)' }}>
            <label>Target ({TARGET_TYPES.find(t => t.value === targetType)?.unit})</label>
            <input type="number" value={targetValue} onChange={(e) => setTargetValue(e.target.value)} placeholder="e.g. 10" required />
          </div>
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
