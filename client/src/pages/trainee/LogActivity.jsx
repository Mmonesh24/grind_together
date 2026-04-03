import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../../components/ui/GlassCard';
import api from '../../services/api';
import { getSocket } from '../../services/socket';
import './LogActivity.css';

export default function LogActivity() {
  const navigate = useNavigate();
  const [existing, setExisting] = useState(null);
  const [todayPlan, setTodayPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Only user input required
  const [weightKg, setWeightKg] = useState('');
  const [notes, setNotes] = useState('');

  const fetchPlan = async () => {
    try {
      // Correct route is GET /api/daily-plan (no /today suffix)
      const { data: planData } = await api.get('/daily-plan');
      if (planData.data) setTodayPlan(planData.data);
    } catch {}
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: logData } = await api.get('/logs/today');
        if (logData.data) {
          setExisting(logData.data);
          setWeightKg(logData.data.metrics?.weightKg || '');
          setNotes(logData.data.notes || '');
        }
      } catch {}

      await fetchPlan();
      setLoading(false);
    };
    fetchData();

    // Real-time: re-fetch plan whenever an exercise/meal/water completes
    const socket = getSocket();
    if (socket) {
      socket.on('plan:update', fetchPlan);
      socket.on('log:update', fetchPlan);
    }
    return () => {
      if (socket) {
        socket.off('plan:update', fetchPlan);
        socket.off('log:update', fetchPlan);
      }
    };
  }, []);

  // Derive checklist and metrics from plan automatically
  const derivedFromPlan = () => {
    if (!todayPlan) return null;

    const meals = todayPlan.meals || [];
    const exercises = todayPlan.exercises || [];
    const completedMeals = meals.filter(m => m.completed);
    const completedExercises = exercises.filter(e => e.completed);

    const waterDone = (todayPlan.waterConsumed || 0) >= (todayPlan.waterTarget || 3);
    const proteinDone = (todayPlan.protein_target > 0) && (meals.reduce((sum, m) => sum + (m.completed ? m.protein : 0), 0) >= todayPlan.protein_target);
    const workoutDone = exercises.length > 0 && completedExercises.length === exercises.length;

    // Direct metrics from Plan
    const caloriesConsumed = todayPlan.calories_consumed || 0;
    const proteinConsumed = meals.reduce((sum, m) => sum + (m.completed ? (m.protein || 0) : 0), 0);
    const caloriesBurned = completedExercises.length * 75; // Estimate
    
    // Muscle split from completed exercises
    const muscleGroups = [...new Set(
      completedExercises.map(e => e.muscle_group).filter(Boolean)
    )];
    let muscleSplit = '';
    if (muscleGroups.length > 0) {
      const g = muscleGroups[0]?.toLowerCase() || '';
      if (g.includes('chest') || g.includes('shoulder') || g.includes('tricep')) muscleSplit = 'Push';
      else if (g.includes('back') || g.includes('bicep')) muscleSplit = 'Pull';
      else if (g.includes('leg') || g.includes('quad') || g.includes('glute')) muscleSplit = 'Legs';
      else muscleSplit = 'Full Body';
    }

    return {
      checklist: { travel: false, water: waterDone, protein: proteinDone, workout: workoutDone },
      metrics: {
        caloriesConsumed,
        proteinConsumed,
        caloriesBurned,
        muscleSplit,
        waterConsumed: todayPlan.waterConsumed || 0,
        waterTarget: todayPlan.waterTarget || 3,
        completedMeals: completedMeals.length,
        totalMeals: meals.length,
        completedExercises: completedExercises.length,
        totalExercises: exercises.length,
      },
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    const derived = derivedFromPlan();
    const payload = {
      checklist: derived?.checklist || { water: false, protein: false, workout: false },
      metrics: {
        caloriesBurned: derived?.metrics?.caloriesBurned || 0,
        muscleSplit: derived?.metrics?.muscleSplit || '',
        weightKg: parseFloat(weightKg) || 0,
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
      setError(err.response?.data?.message || 'Failed to save log');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="log-loading">⏳ Loading your plan data...</div>;

  const plan = derivedFromPlan();

  return (
    <div className="log-page page-enter">
      <h1 className="log-page__title">
        {existing ? '📝 Update Today\'s Log' : '📝 Log Today\'s Activity'}
      </h1>
      <p className="log-page__sub">Data is automatically pulled from your Daily Plan. Just add your weight and any notes.</p>

      {success && (
        <div className="log-page__success">
          🎉 Activity logged! Points earned. Keep grinding!
        </div>
      )}
      {error && <div className="log-page__error">{error}</div>}

      {/* Auto-collected Summary from Daily Plan */}
      <div className="log-auto-summary">
        <div className="auto-summary-header">
          <div>
            <h3 className="auto-summary-title">Today's Activity Summary</h3>
            <p className="auto-summary-sub">Auto-synced from your Daily Plan</p>
          </div>
          <span className="auto-sync-badge">⚡ Live</span>
        </div>

        {/* Top stat row */}
        <div className="summary-stat-row">
          <div className="summary-stat-card stat-meal">
            <span className="ssc-icon">🍴</span>
            <span className="ssc-val">{plan?.metrics?.caloriesConsumed ?? 0}</span>
            <span className="ssc-lbl">kcal in</span>
          </div>
          <div className="summary-stat-card stat-protein">
            <span className="ssc-icon">🥩</span>
            <span className="ssc-val">{plan?.metrics?.proteinConsumed ?? 0}g</span>
            <span className="ssc-lbl">protein</span>
          </div>
          <div className="summary-stat-card stat-fire">
            <span className="ssc-icon">🔥</span>
            <span className="ssc-val">{plan?.metrics?.caloriesBurned ?? 0}</span>
            <span className="ssc-lbl">kcal out</span>
          </div>
          <div className="summary-stat-card stat-water">
            <span className="ssc-icon">💧</span>
            <span className="ssc-val">{plan?.metrics?.waterConsumed ?? 0}L</span>
            <span className="ssc-lbl">hydration</span>
          </div>
        </div>

        {/* Progress bars */}
        <div className="summary-progress-list">
          <div className="spl-item">
            <div className="spl-info">
              <span>💧 Hydration</span>
              <span className={plan?.checklist?.water ? 'spl-done' : 'spl-pct'}>
                {plan?.checklist?.water ? 'Goal Met ✅' : `${Math.round(((plan?.metrics?.waterConsumed ?? 0) / (plan?.metrics?.waterTarget ?? 3)) * 100)}%`}
              </span>
            </div>
            <div className="spl-bar">
              <div
                className="spl-fill spl-fill--blue"
                style={{ width: `${Math.min(100, Math.round(((plan?.metrics?.waterConsumed ?? 0) / (plan?.metrics?.waterTarget ?? 3)) * 100))}%` }}
              />
            </div>
          </div>

          <div className="spl-item">
            <div className="spl-info">
              <span>🥗 Meals</span>
              <span className={plan?.checklist?.protein ? 'spl-done' : 'spl-pct'}>
                {plan?.checklist?.protein ? 'All Done ✅' : `${plan?.metrics?.completedMeals ?? 0} / ${plan?.metrics?.totalMeals ?? 0}`}
              </span>
            </div>
            <div className="spl-bar">
              <div
                className="spl-fill spl-fill--green"
                style={{ width: `${plan?.metrics?.totalMeals ? Math.round(((plan?.metrics?.completedMeals ?? 0) / plan.metrics.totalMeals) * 100) : 0}%` }}
              />
            </div>
          </div>

          <div className="spl-item">
            <div className="spl-info">
              <span>🏋️ Workout</span>
              <span className={plan?.checklist?.workout ? 'spl-done' : 'spl-pct'}>
                {plan?.checklist?.workout ? 'Complete ✅' : `${plan?.metrics?.completedExercises ?? 0} / ${plan?.metrics?.totalExercises ?? 0}`}
              </span>
            </div>
            <div className="spl-bar">
              <div
                className="spl-fill spl-fill--orange"
                style={{ width: `${plan?.metrics?.totalExercises ? Math.round(((plan?.metrics?.completedExercises ?? 0) / plan.metrics.totalExercises) * 100) : 0}%` }}
              />
            </div>
          </div>
        </div>

        {plan?.metrics?.muscleSplit && (
          <div className="summary-split-tag">
            💪 Today's Split: <strong>{plan.metrics.muscleSplit}</strong>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="log-form">
        {/* Weight — the only data they need to add */}
        <GlassCard className="log-section">
          <h3>⚖️ Current Weight</h3>
          <p className="log-hint">Optional — used to track body weight progress over time.</p>
          <div className="log-field-single">
            <input
              type="number"
              step="0.1"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              placeholder="e.g. 75.5"
            />
            <span className="log-unit">kg</span>
          </div>
        </GlassCard>

        {/* Notes */}
        <GlassCard className="log-section">
          <h3>📝 Notes</h3>
          <p className="log-hint">How did it go today? Any thoughts, victories, or struggles?</p>
          <textarea
            className="log-textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Felt strong on deadlifts today. Missed lunch..."
            rows={4}
          />
        </GlassCard>

        <button className="log-submit" type="submit" disabled={saving}>
          {saving ? 'Saving...' : existing ? '✅ Update Log' : '🔥 Save & Earn Points'}
        </button>
      </form>
    </div>
  );
}
