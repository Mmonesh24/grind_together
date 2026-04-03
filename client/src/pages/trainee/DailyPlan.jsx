import { useEffect, useState } from 'react';
import api from '../../services/api';
import { getSocket } from '../../services/socket';
import useNotificationStore from '../../store/notificationStore';
import './DailyPlan.css';

export default function DailyPlan() {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);

  const { addToast } = useNotificationStore();

  useEffect(() => {
    fetchPlan();
    
    // Offline Push Notification Poller (runs every 15 minutes)
    const offlinePoller = setInterval(() => {
      if (!window.navigator.onLine && plan) {
        if (plan.waterConsumed >= (plan.waterTarget || 3)) {
          clearInterval(offlinePoller); // Stop polling if hydrated
          return;
        }
        checkOfflineHydration(plan);
      }
    }, 900000);

    return () => clearInterval(offlinePoller);
  }, [plan]);

  useEffect(() => {
    const socket = getSocket();
    if (socket) {
      socket.on('plan:update', (data) => {
        if (data?.plan) {
          setPlan(data.plan);
          localStorage.setItem('grind_daily_plan', JSON.stringify(data.plan));
        }
      });
      return () => socket.off('plan:update');
    }
  }, []);

  useEffect(() => {
    // Check for day change every 60 seconds
    const dayChangePoller = setInterval(() => {
      if (plan?.date) {
        const planDate = new Date(plan.date).toDateString();
        const currentDate = new Date().toDateString();
        if (planDate !== currentDate) {
          console.log('🌅 Day changed! Refreshing plan...');
          fetchPlan();
        }
      }
    }, 60000);

    return () => clearInterval(dayChangePoller);
  }, [plan]);

  const checkOfflineHydration = (cachedPlan) => {
    const totalTarget = cachedPlan.waterTarget || 3;
    const consumed = cachedPlan.waterConsumed || 0;
    const hour = new Date().getHours();
    if (hour < 8 || hour > 22) return;
    
    const expected = totalTarget * Math.min((hour - 8) / 14, 1.0);
    if (consumed < expected) {
      addToast({
        type: 'info',
        title: '📡 Tracking Offline',
        message: `Grab some water! Expected: ${expected.toFixed(1)}L, Current: ${consumed.toFixed(1)}L`
      });
    }
  };

  const fetchPlan = async () => {
    try {
      if (!window.navigator.onLine) {
        throw new Error('Offline');
      }
      const { data } = await api.get('/daily-plan');
      setPlan(data.data);
      localStorage.setItem('grind_daily_plan', JSON.stringify(data.data));
    } catch (err) {
      console.warn('Network error, attempting offline fallback:', err);
      const cached = localStorage.getItem('grind_daily_plan');
      if (cached) {
        setPlan(JSON.parse(cached));
      } else {
        console.error('No offline cache available');
      }
    }
    setLoading(false);
  };

  const completeExercise = async (exId) => {
    try {
      const { data } = await api.post(`/daily-plan/exercise/${exId}/complete`, { planId: plan._id });
      setPlan(data.data);
    } catch {}
  };

  const completeMeal = async (mealId) => {
    try {
      const { data } = await api.post(`/daily-plan/meal/${mealId}/complete`, { planId: plan._id });
      setPlan(data.data);
      localStorage.setItem('grind_daily_plan', JSON.stringify(data.data));
    } catch {}
  };

  const logWater = async (amount) => {
    // Optimistic UI
    const updated = { ...plan, waterConsumed: Math.max(0, (plan.waterConsumed || 0) + amount) };
    setPlan(updated);
    try {
      const { data } = await api.post('/daily-plan/water', { planId: plan._id, amount });
      setPlan(data.data);
      localStorage.setItem('grind_daily_plan', JSON.stringify(data.data));
    } catch {}
  };

  if (loading) return <div className="page-loading">Generating Plan...</div>;
  if (!plan) return <div className="page-loading">Failed to load plan. Check connection.</div>;

  const exercisesDone = plan.exercises.filter(e => e.completed).length;
  const exercisesTotal = plan.exercises.length;
  const workoutPct = exercisesTotal ? Math.round((exercisesDone / exercisesTotal) * 100) : 0;

  const mealsDone = plan.meals.filter(m => m.completed).length;
  const mealsTotal = plan.meals.length;
  const mealPct = mealsTotal ? Math.round((mealsDone / mealsTotal) * 100) : 0;
  
  const calsConsumed = plan.calories_consumed || 0;
  const calsTarget = plan.calories_target || 0;
  const calPct = calsTarget ? Math.min(Math.round((calsConsumed / calsTarget) * 100), 100) : 0;
  
  const waterConsumed = plan.waterConsumed || 0;
  const waterTarget = plan.waterTarget || 3;

  // Motivational Pointers
  const totalTasks = exercisesTotal + mealsTotal;
  const doneTasks = exercisesDone + mealsDone;
  const taskPct = totalTasks ? (doneTasks / totalTasks) : 0;
  const hour = new Date().getHours();
  
  let motivationMsg = "Let's crush today's grind!";
  if (plan.isCompleted) motivationMsg = "Incredible work! Rest up.";
  else if (hour >= 18 && taskPct < 0.5) motivationMsg = `⚠️ You're behind! Complete ${totalTasks - doneTasks} more tasks!`;
  else if (hour <= 12 && taskPct >= 0.5) motivationMsg = "🔥 You're ahead today! Great momentum!";
  else if (totalTasks - doneTasks <= 2) motivationMsg = `🎯 Just ${totalTasks - doneTasks} tasks left! Push through!`;

  return (
    <div className="daily-plan-container animate-fade-in neon-border">
      {(!window.navigator.onLine) && (
        <div className="dp-offline-banner glass-card">
          📡 OFFLINE MODE: SYNCING FROM LOCAL CACHE
        </div>
      )}
      
      <header className="dp-header">
        <div className="header-content">
          <h1>🎯 DAILY MISSION</h1>
          <div className="dp-meta">
            <span className="dp-goal-tag">{plan.goal.replace('_', ' ').toUpperCase()}</span>
            <span className="dp-motivation neon-text">{motivationMsg}</span>
          </div>
        </div>
      </header>

      {plan.isCompleted && (
        <div className="dp-bonus-banner animate-bounce">
          🏆 FULL DAY COMPLETED! +50 BONUS POINTS EARNED! 🏆
        </div>
      )}

      {/* Progress Tracker Area */}
      <section className="dp-progress-tracker brutal-card">
        <h2>📊 DIRECTIVES STATUS</h2>
        <div className="dp-rings">
          <div className="dp-ring">
            <div className="ring-circle" style={{ '--pct': `${workoutPct}%`, '--color': '#7b61ff' }}>
              <span>{workoutPct}%</span>
            </div>
            <p>Workout</p>
          </div>
          <div className="dp-ring">
            <div className="ring-circle" style={{ '--pct': `${mealPct}%`, '--color': '#2cb67d' }}>
              <span>{mealPct}%</span>
            </div>
            <p>Meals</p>
          </div>
          <div className="dp-ring">
            <div className="ring-circle" style={{ '--pct': `${calPct}%`, '--color': '#ff5c35' }}>
              <span>{calsConsumed}</span>
            </div>
            <p>Cals / {calsTarget}</p>
          </div>
        {/* Dynamic Macro Goal Summary */}
        <div className="dp-macro-summary brutal-card">
          <div className="macro-goal-card pro">
            <span className="label">🥩 PROTEIN</span>
            <span className="value">{plan.protein_target || 0}g</span>
          </div>
          <div className="macro-goal-card carb">
            <span className="label">🌾 CARBS</span>
            <span className="value">{plan.carbs_target || 0}g</span>
          </div>
          <div className="macro-goal-card fat">
            <span className="label">🥑 FATS</span>
            <span className="value">{plan.fats_target || 0}g</span>
          </div>
        </div>

        <div className="dp-hydration brutal-card">
            <h4>💧 HYDRATION STATUS</h4>
            <div className="water-tank">
              <div 
                className="wave-container" 
                style={{ '--fill': `${Math.min((waterConsumed / waterTarget) * 100, 100)}%` }}
              >
                <div className="wave"></div>
              </div>
            </div>
            <div className="dp-water-reading">{waterConsumed.toFixed(1)} / {waterTarget}L</div>
            
            <div className="dp-water-actions">
              <div className="dp-presets">
                <button className="preset-btn" onClick={() => logWater(0.25)}>+250ml</button>
                <button className="preset-btn" onClick={() => logWater(0.5)}>+500ml</button>
                <button className="preset-btn" onClick={() => logWater(1.0)}>+1L</button>
              </div>
              <div className="dp-water-controls">
                <button disabled={waterConsumed <= 0} onClick={() => logWater(-0.5)}>-</button>
                <button onClick={() => logWater(0.5)}>+</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="dp-grid">
        {/* Workout Plan */}
        <section className="dp-section brutal-card">
          <h2>🏋️ Workout Plan</h2>
          <div className="dp-list">
            {plan.exercises.map((ex) => (
              <label key={ex._id} className={`dp-item ${ex.completed ? 'completed' : ''}`}>
                <input 
                  type="checkbox" 
                  checked={ex.completed} 
                  disabled={ex.completed}
                  onChange={() => completeExercise(ex._id)}
                />
                <div className="dp-item-details">
                  <h4>{ex.name} <span>({ex.muscle_group})</span></h4>
                  <p>{ex.sets} Sets × {ex.reps} Reps</p>
                  {ex.instructions && <small>{ex.instructions}</small>}
                </div>
              </label>
            ))}
          </div>
        </section>

        {/* Nutritional Plan */}
        <section className="dp-section brutal-card">
          <h2>🍛 SOUTH INDIAN DIET</h2>
          <div className="dp-list">
            {plan.meals.map((meal) => (
              <label key={meal._id} className={`dp-item ${meal.completed ? 'completed' : ''}`}>
                <input 
                  type="checkbox" 
                  checked={meal.completed} 
                  disabled={meal.completed}
                  onChange={() => completeMeal(meal._id)}
                />
                <div className="dp-item-details">
                  <h4>{meal.name} <span>({meal.mealType})</span></h4>
                  <div className="dp-macro-pills">
                    <span className="macro-pill cal">🔥 {meal.calories}k</span>
                    <span className="macro-pill pro">🥩 {meal.protein}g P</span>
                    <span className="macro-pill carb">🌾 {meal.carbs}g C</span>
                    <span className="macro-pill fat">🥑 {meal.fats}g F</span>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
