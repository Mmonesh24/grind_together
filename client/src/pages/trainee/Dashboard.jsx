import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import StatCard from '../../components/ui/StatCard';
import GlassCard from '../../components/ui/GlassCard';
import StreakBadge from '../../components/ui/StreakBadge';
import ProgressRing from '../../components/ui/ProgressRing';
import api from '../../services/api';
import { getSocket } from '../../services/socket';
import ActivityFeed from '../../components/social/ActivityFeed';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './Dashboard.css';

/* ── Animated counter hook ── */
function useCountUp(target, duration = 1200) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!target) return;
    let start = 0;
    const step = target / (duration / 16);
    const id = setInterval(() => {
      start += step;
      if (start >= target) { setVal(target); clearInterval(id); }
      else setVal(Math.floor(start));
    }, 16);
    return () => clearInterval(id);
  }, [target, duration]);
  return val;
}

/* ── Intersection observer hook ── */
function useReveal() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold: 0.15 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

/* ── Metric pill ── */
function MetricPill({ icon, label, value, unit, color, delay = 0 }) {
  const [ref, visible] = useReveal();
  const counted = useCountUp(visible ? Number(value) : 0);
  return (
    <div
      ref={ref}
      className={`metric-pill ${visible ? 'metric-pill--in' : ''}`}
      style={{ '--delay': `${delay}ms`, '--pill-color': color }}
    >
      <span className="metric-pill__icon">{icon}</span>
      <div className="metric-pill__body">
        <span className="metric-pill__value">{counted}{unit}</span>
        <span className="metric-pill__label">{label}</span>
      </div>
      <div className="metric-pill__bar">
        <div className="metric-pill__bar-fill" style={{ width: visible ? '100%' : '0%' }} />
      </div>
    </div>
  );
}

/* ── Check row ── */
function CheckRow({ icon, label, done, delay }) {
  return (
    <div className={`check-row ${done ? 'check-row--done' : ''}`} style={{ '--delay': `${delay}ms` }}>
      <div className="check-row__bullet">
        {done ? <svg viewBox="0 0 20 20" fill="none"><path d="M4 10l4 4 8-8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg> : null}
      </div>
      <span className="check-row__icon">{icon}</span>
      <span className="check-row__label">{label}</span>
      <span className="check-row__tag">{done ? 'Done' : 'Pending'}</span>
    </div>
  );
}

/* ── Leaderboard row ── */
function LBRow({ rank, name, points, isMe, delay }) {
  const medals = ['🥇', '🥈', '🥉'];
  return (
    <div className={`lb-row ${isMe ? 'lb-row--me' : ''}`} style={{ '--delay': `${delay}ms` }}>
      <span className="lb-row__rank">
        {rank <= 3 ? medals[rank - 1] : <span className="lb-row__num">#{rank}</span>}
      </span>
      <div className="lb-row__avatar">{(name || 'A')[0].toUpperCase()}</div>
      <span className="lb-row__name">{name || 'Anonymous'}</span>
      <span className="lb-row__pts">{points}<em>pts</em></span>
    </div>
  );
}

/* ══════════════════════════════════════
   MAIN DASHBOARD
══════════════════════════════════════ */
export default function Dashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [todayLog, setTodayLog] = useState(null);
  const [todayPlan, setTodayPlan] = useState(null);
  const [history, setHistory]   = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [heroRef, heroVisible]  = useReveal();
  const [chartRef, chartVisible] = useReveal();

  const fetchData = async () => {
    try {
      const [logRes, planRes, histRes, lbRes] = await Promise.allSettled([
        api.get('/logs/today'),
        api.get('/daily-plan'),
        api.get('/logs/history?range=7'),
        api.get('/leaderboard?limit=5'),
      ]);
      if (logRes.status === 'fulfilled') setTodayLog(logRes.value.data.data);
      if (planRes.status === 'fulfilled') setTodayPlan(planRes.value.data.data);
      if (histRes.status === 'fulfilled') setHistory(histRes.value.data.data);
      if (lbRes.status === 'fulfilled') setLeaderboard(lbRes.value.data.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchData();

    const socket = getSocket();
    if (socket) {
      const { fetchProfile } = useAuthStore.getState();
      
      const handlePointsUpdate = () => {
        fetchProfile();
        fetchData();
      };

      const handleProfileUpdate = () => {
        fetchProfile();
        fetchData();
      };

      socket.on('points:update', handlePointsUpdate);
      socket.on('profile:update', handleProfileUpdate);
      socket.on('plan:update', fetchData);
      socket.on('log:update', fetchData);
      socket.on('leaderboard:update', fetchData);

      return () => {
        socket.off('points:update', handlePointsUpdate);
        socket.off('profile:update', handleProfileUpdate);
        socket.off('plan:update', fetchData);
        socket.off('log:update', fetchData);
        socket.off('leaderboard:update', fetchData);
      };
    }
  }, []);

  const gam = user?.gamification || {};
  const weeklyWorkouts = history.filter((l) => l.checklist?.workout).length;
  
  // Real-time metrics from Plan
  const hydrationValue = todayPlan?.waterConsumed || 0;
  const proteinValue = todayPlan?.meals?.reduce((sum, m) => m.completed ? sum + (m.protein || 0) : sum, 0) || 0;
  const caloriesOut = todayLog?.metrics?.caloriesBurned || 0;

  // Unified completion percentage
  const mealPct = todayPlan?.meals?.length ? (todayPlan.meals.filter(m => m.completed).length / todayPlan.meals.length) : 0;
  const exPct = todayPlan?.exercises?.length ? (todayPlan.exercises.filter(e => e.completed).length / todayPlan.exercises.length) : 0;
  const waterPct = todayPlan?.waterTarget ? Math.min(1, todayPlan.waterConsumed / todayPlan.waterTarget) : 0;
  
  const ringPct = Math.round(((mealPct + exPct + waterPct) / 3) * 100);
  const checklistDone = [mealPct === 1, exPct === 1, waterPct >= 1].filter(Boolean).length;

  const chartData = history.slice().reverse().map((l) => ({
    day:      new Date(l.date).toLocaleDateString('en', { weekday: 'short' }),
    calories: l.metrics?.caloriesBurned || 0,
  }));

  /* ── Parallax orb on mouse ── */
  const handleMouseMove = (e) => {
    const orb = document.querySelector('.hero-orb');
    if (!orb) return;
    const { clientX: x, clientY: y } = e;
    orb.style.transform = `translate(${x * 0.02}px, ${y * 0.02}px)`;
  };

  return (
    <div className="dash" onMouseMove={handleMouseMove}>

      {/* ── Decorative background ── */}
      <div className="dash-bg">
        <div className="dash-bg__mesh" />
        <div className="hero-orb" />
        <div className="dash-bg__lines" />
      </div>

      {/* ════════════ HERO ════════════ */}
      <section ref={heroRef} className={`hero ${heroVisible ? 'hero--in' : ''}`}>
        <div className="hero__left">
          <div className="hero__eyebrow">
            <span className="pulse-dot" />
            <span>Live Session Active</span>
          </div>
          <h1 className="hero__title">
            Rise &amp;<br />
            <em>Conquer</em>,<br />
            <span className="hero__name">{user?.profile?.name || 'Athlete'}</span>
          </h1>
          <p className="hero__sub">Your body keeps the score — make it count today.</p>
          <div className="hero__actions">
            <button className="btn-fire" onClick={() => navigate('/log')}>
              <span>🔥</span>
              {todayLog ? "Update Today's Log" : 'Start Logging'}
            </button>
            <button className="btn-ghost" onClick={() => navigate('/workouts')}>
              View Workouts
            </button>
          </div>
        </div>

        <div className="hero__right">
          {/* Big ring */}
          <div className="hero__ring-wrap">
            <svg className="ring-svg" viewBox="0 0 180 180">
              <circle cx="90" cy="90" r="76" fill="none" stroke="#F0E8DC" strokeWidth="12" />
              <circle
                cx="90" cy="90" r="76"
                fill="none"
                stroke="url(#ringGrad)"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 76}`}
                strokeDashoffset={`${2 * Math.PI * 76 * (1 - ringPct / 100)}`}
                transform="rotate(-90 90 90)"
                style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(.4,0,.2,1)' }}
              />
              <defs>
                <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FF5C35" />
                  <stop offset="100%" stopColor="#FF9A3C" />
                </linearGradient>
              </defs>
            </svg>
            <div className="hero__ring-inner">
              <span className="hero__ring-pct">{ringPct}%</span>
              <span className="hero__ring-label">Daily Goal</span>
            </div>
          </div>

          {/* Floating cards */}
          <div className="hero-float hero-float--streak">
            <span>🔥</span>
            <div>
              <strong>{gam.currentStreak || 0}</strong>
              <span>Day Streak</span>
            </div>
          </div>
          <div className="hero-float hero-float--pts">
            <span>⭐</span>
            <div>
              <strong>{gam.totalPoints || 0}</strong>
              <span>Total Points</span>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════ METRICS STRIP ════════════ */}
      <section className="metrics-strip">
        <MetricPill icon="💧" label="Hydration"     value={hydrationValue} unit="L"  color="#3DA9FC" delay={0}   />
        <MetricPill icon="🥩" label="Protein"       value={proteinValue}   unit="g"  color="#FF5C35" delay={80}  />
        <MetricPill icon="🏃" label="Calories Out"  value={caloriesOut}    unit=""   color="#2CB67D" delay={160} />
        <MetricPill icon="💪" label="Weekly Workouts" value={weeklyWorkouts}unit="/7"  color="#7B61FF" delay={240} />
        <MetricPill icon="😴" label="Recovery"      value={todayLog?.metrics?.sleepHours    || 0}   unit="hr" color="#FFB830" delay={320} />
      </section>

      {/* ════════════ MAIN GRID ════════════ */}
      <section className="main-grid">

        {/* ── Checklist card ── */}
        <div className="glass-panel checklist-panel">
          <div className="panel-badge">Today</div>
          <h2 className="panel-title">Daily Checklist</h2>
          <div className="checks">
            <CheckRow icon="🥞" label="All Meals"      done={mealPct === 1}   delay={0}   />
            <CheckRow icon="💧" label="Hydration Goal" done={waterPct >= 1}   delay={60}  />
            <CheckRow icon="🏋️" label="Workout Split"  done={exPct === 1}     delay={120} />
          </div>
          <div className="checklist-footer">
            <div className="mini-ring">
              <svg viewBox="0 0 60 60">
                <circle cx="30" cy="30" r="24" fill="none" stroke="#F0E8DC" strokeWidth="6" />
                <circle
                  cx="30" cy="30" r="24"
                  fill="none"
                  stroke="#FF5C35"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 24}`}
                  strokeDashoffset={`${2 * Math.PI * 24 * (1 - checklistDone / 3)}`}
                  transform="rotate(-90 30 30)"
                  style={{ transition: 'stroke-dashoffset 1s ease' }}
                />
              </svg>
              <span>{checklistDone}/3</span>
            </div>
            <button className="btn-fire btn-fire--sm" onClick={() => navigate('/log')}>
              {todayLog ? '✏️ Update' : '➕ Add Log'}
            </button>
          </div>
        </div>

        {/* ── Chart card ── */}
        <div ref={chartRef} className={`glass-panel chart-panel ${chartVisible ? 'chart-panel--in' : ''}`}>
          <div className="panel-badge panel-badge--teal">Week</div>
          <h2 className="panel-title">Calories Burned</h2>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="4 4" stroke="rgba(0,0,0,0.05)" vertical={false} />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#8A7E72', fontFamily: 'DM Sans', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8A7E72', fontFamily: 'DM Sans', fontSize: 11 }} />
                <Tooltip
                  cursor={{ fill: 'rgba(255,92,53,0.06)', radius: 8 }}
                  contentStyle={{
                    background: 'rgba(255,255,255,0.9)',
                    border: 'none',
                    borderRadius: 12,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                    fontFamily: 'DM Sans',
                    fontSize: 13,
                    color: '#2D2318',
                  }}
                />
                <Bar dataKey="calories" fill="url(#barGrad)" radius={[8, 8, 0, 0]}>
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FF5C35" />
                      <stop offset="100%" stopColor="#FF9A3C" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-gym">
              <span>🏋️</span>
              <p>No data yet — time to sweat!</p>
            </div>
          )}
        </div>

        {/* ── Leaderboard card ── */}
        <div className="glass-panel lb-panel">
          <div className="panel-badge panel-badge--gold">Rankings</div>
          <h2 className="panel-title">🏆 Top Athletes</h2>
          <div className="lb-list">
            {leaderboard.map((e, i) => (
              <LBRow
                key={e.id}
                rank={e.rank}
                name={e.name}
                points={e.totalPoints}
                isMe={e.id === user?.id}
                delay={i * 70}
              />
            ))}
            {leaderboard.length === 0 && (
              <div className="empty-gym"><span>🏅</span><p>No athletes yet</p></div>
            )}
          </div>
          <button className="btn-outline" onClick={() => navigate('/leaderboard')}>
            Full Rankings <span>→</span>
          </button>
        </div>

        {/* ── Activity Feed ── */}
        <div className="glass-panel feed-panel">
          <div className="panel-badge panel-badge--purple">Community</div>
          <h2 className="panel-title">Live Activity</h2>
          <ActivityFeed />
        </div>

      </section>

      {/* ════════════ MOTIVATION BANNER ════════════ */}
      <section className="moto-banner">
        <div className="moto-banner__inner">
          {['Pain is temporary.', 'Glory is forever.', 'You vs. Yesterday.', 'No days off.', 'Push the limit.'].map((t, i) => (
            <span key={i} className="moto-banner__word">{t}</span>
          ))}
        </div>
      </section>

    </div>
  );
}