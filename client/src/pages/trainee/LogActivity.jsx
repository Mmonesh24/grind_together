import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../../components/ui/GlassCard';
import api from '../../services/api';
import './LogActivity.css';

const SPLITS = ['Push', 'Pull', 'Legs', 'Full Body', 'Upper', 'Lower', 'Rest'];

export default function LogActivity() {
  const navigate = useNavigate();
  const [existing, setExisting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [water, setWater] = useState(false);
  const [protein, setProtein] = useState(false);
  const [workout, setWorkout] = useState(false);
  const [caloriesBurned, setCaloriesBurned] = useState('');
  const [calorieGoal, setCalorieGoal] = useState('');
  const [muscleSplit, setMuscleSplit] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [cardioDistanceKm, setCardioDistanceKm] = useState('');
  const [cardioTimeMin, setCardioTimeMin] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const fetchToday = async () => {
      try {
        const { data } = await api.get('/logs/today');
        const log = data.data;
        setExisting(log);
        setWater(log.checklist?.water || false);
        setProtein(log.checklist?.protein || false);
        setWorkout(log.checklist?.workout || false);
        setCaloriesBurned(log.metrics?.caloriesBurned || '');
        setCalorieGoal(log.metrics?.calorieGoal || '');
        setMuscleSplit(log.metrics?.muscleSplit || '');
        setWeightKg(log.metrics?.weightKg || '');
        setCardioDistanceKm(log.metrics?.cardioDistanceKm || '');
        setCardioTimeMin(log.metrics?.cardioTimeMin || '');
        setNotes(log.notes || '');
      } catch {}
      setLoading(false);
    };
    fetchToday();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const payload = {
      checklist: { water, protein, workout },
      metrics: {
        caloriesBurned: parseFloat(caloriesBurned) || 0,
        calorieGoal: parseFloat(calorieGoal) || 0,
        muscleSplit,
        weightKg: parseFloat(weightKg) || 0,
        cardioDistanceKm: parseFloat(cardioDistanceKm) || 0,
        cardioTimeMin: parseFloat(cardioTimeMin) || 0,
      },
      notes,
    };

    try {
      if (existing) {
        await api.put(`/logs/${existing._id}`, payload);
      } else {
        await api.post('/logs', payload);
      }
      setSuccess(true);
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="empty-state">Loading...</div>;

  return (
    <div className="log-page page-enter">
      <h1 className="log-page__title">{existing ? '📝 Update Today\'s Log' : '📝 Log Today\'s Activity'}</h1>

      {success && (
        <div className="log-page__success">
          🎉 Activity logged! Points earned. Keep grinding!
        </div>
      )}

      {error && <div className="auth-form__error">{error}</div>}

      <form onSubmit={handleSubmit} className="log-form">
        {/* Daily Checks */}
        <GlassCard className="log-section">
          <h3>Daily Checks</h3>
          <div className="toggle-cards">
            <button type="button" className={`toggle-card ${water ? 'active' : ''}`} onClick={() => setWater(!water)}>
              <span className="toggle-card__icon">💧</span><span>Water</span>
            </button>
            <button type="button" className={`toggle-card ${protein ? 'active' : ''}`} onClick={() => setProtein(!protein)}>
              <span className="toggle-card__icon">🥩</span><span>Protein</span>
            </button>
            <button type="button" className={`toggle-card ${workout ? 'active' : ''}`} onClick={() => setWorkout(!workout)}>
              <span className="toggle-card__icon">🏋️</span><span>Workout</span>
            </button>
          </div>
        </GlassCard>

        {/* Workout Details */}
        <GlassCard className="log-section">
          <h3>Workout Details</h3>
          <div className="split-pills">
            {SPLITS.map((s) => (
              <button key={s} type="button" className={`split-pill ${muscleSplit === s ? 'active' : ''}`} onClick={() => setMuscleSplit(s)}>
                {s}
              </button>
            ))}
          </div>
        </GlassCard>

        {/* Nutrition */}
        <GlassCard className="log-section">
          <h3>Nutrition & Metrics</h3>
          <div className="log-fields">
            <div className="log-field">
              <label>Calories Burned</label>
              <input type="number" value={caloriesBurned} onChange={(e) => setCaloriesBurned(e.target.value)} placeholder="0" />
            </div>
            <div className="log-field">
              <label>Calorie Goal</label>
              <input type="number" value={calorieGoal} onChange={(e) => setCalorieGoal(e.target.value)} placeholder="0" />
            </div>
            <div className="log-field">
              <label>Weight (kg)</label>
              <input type="number" step="0.1" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} placeholder="0" />
            </div>
          </div>
        </GlassCard>

        {/* Cardio */}
        <GlassCard className="log-section">
          <h3>Cardio</h3>
          <div className="log-fields">
            <div className="log-field">
              <label>Distance (km)</label>
              <input type="number" step="0.1" value={cardioDistanceKm} onChange={(e) => setCardioDistanceKm(e.target.value)} placeholder="0" />
            </div>
            <div className="log-field">
              <label>Time (min)</label>
              <input type="number" value={cardioTimeMin} onChange={(e) => setCardioTimeMin(e.target.value)} placeholder="0" />
            </div>
          </div>
        </GlassCard>

        {/* Notes */}
        <GlassCard className="log-section">
          <h3>Notes</h3>
          <textarea className="log-textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="How was your workout today?" rows={3} />
        </GlassCard>

        <button className="log-submit" type="submit" disabled={saving}>
          {saving ? 'Saving...' : existing ? 'Update Log' : 'Save & Earn Points 🔥'}
        </button>
      </form>
    </div>
  );
}
