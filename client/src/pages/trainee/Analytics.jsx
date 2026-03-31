import { useEffect, useState } from 'react';
import GlassCard from '../../components/ui/GlassCard';
import api from '../../services/api';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import './Analytics.css';

const COLORS = ['#00e676', '#7c4dff', '#ff5252', '#ffb74d', '#40c4ff', '#ff4081', '#b388ff'];

const fmt = (d) => new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric' });

export default function Analytics() {
  const [weight, setWeight] = useState([]);
  const [calories, setCalories] = useState([]);
  const [workouts, setWorkouts] = useState([]);
  const [cardio, setCardio] = useState([]);
  const [heatmapDates, setHeatmapDates] = useState([]);
  const [report, setReport] = useState(null);
  const [range, setRange] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      const results = await Promise.allSettled([
        api.get(`/analytics/weight?range=${range}`),
        api.get(`/analytics/calories?range=${range}`),
        api.get(`/analytics/workouts?range=${range}`),
        api.get(`/analytics/cardio?range=${range}`),
        api.get('/analytics/heatmap'),
        api.get('/analytics/weekly-report'),
      ]);
      if (results[0].status === 'fulfilled') setWeight(results[0].value.data.data);
      if (results[1].status === 'fulfilled') setCalories(results[1].value.data.data);
      if (results[2].status === 'fulfilled') setWorkouts(results[2].value.data.data);
      if (results[3].status === 'fulfilled') setCardio(results[3].value.data.data);
      if (results[4].status === 'fulfilled') setHeatmapDates(results[4].value.data.data);
      if (results[5].status === 'fulfilled') setReport(results[5].value.data.data);
      setLoading(false);
    };
    fetchAll();
  }, [range]);

  const handleExport = async () => {
    try {
      const res = await api.get(`/analytics/export?range=${range}`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `grindtogether_export_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } catch {}
  };

  // Build heatmap grid (past 365 days)
  const buildHeatmap = () => {
    const today = new Date();
    const cells = [];
    const dateSet = new Set(heatmapDates);
    for (let i = 364; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      cells.push({ date: key, active: dateSet.has(key) });
    }
    return cells;
  };

  const heatmapCells = buildHeatmap();

  return (
    <div className="analytics-page page-enter">
      <div className="analytics-header">
        <h1 className="analytics-title">📈 Analytics</h1>
        <div className="analytics-controls">
          <select value={range} onChange={(e) => setRange(parseInt(e.target.value))} className="analytics-range">
            <option value={7}>7 Days</option>
            <option value={30}>30 Days</option>
            <option value={90}>90 Days</option>
          </select>
          <button className="analytics-export" onClick={handleExport}>📥 Export CSV</button>
        </div>
      </div>

      {/* Weekly Report Card */}
      {report && (
        <GlassCard className="report-card page-enter stagger-1" glow>
          <h3>📋 Weekly Report Card</h3>
          <div className="report-grid">
            <div className="report-stat"><span className="report-stat__val">{report.daysLogged}</span><span className="report-stat__lbl">Days Logged</span></div>
            <div className="report-stat"><span className="report-stat__val">{report.workoutDays}</span><span className="report-stat__lbl">Workout Days</span></div>
            <div className="report-stat"><span className="report-stat__val">{report.fullChecklistDays}</span><span className="report-stat__lbl">Full Checklist</span></div>
            <div className="report-stat"><span className="report-stat__val">{report.totalCalories.toLocaleString()}</span><span className="report-stat__lbl">Calories Burned</span></div>
            <div className="report-stat"><span className="report-stat__val">{report.totalDistance}</span><span className="report-stat__lbl">km Cardio</span></div>
            <div className="report-stat"><span className="report-stat__val">🔥 {report.currentStreak}</span><span className="report-stat__lbl">Streak</span></div>
          </div>
        </GlassCard>
      )}

      <div className="analytics-grid">
        {/* Weight Trend */}
        <GlassCard className="chart-card page-enter stagger-2">
          <h3>⚖️ Weight Trend</h3>
          {weight.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={weight.map(d => ({ ...d, date: fmt(d.date) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="date" stroke="#8888a0" fontSize={11} />
                <YAxis stroke="#8888a0" fontSize={11} domain={['auto', 'auto']} />
                <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', color: '#e8e8f0' }} />
                <Line type="monotone" dataKey="weight" stroke="#00e676" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <p className="empty-state">No weight data yet</p>}
        </GlassCard>

        {/* Calorie Trend */}
        <GlassCard className="chart-card page-enter stagger-3">
          <h3>🔥 Calories: Burned vs Goal</h3>
          {calories.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={calories.map(d => ({ ...d, date: fmt(d.date) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="date" stroke="#8888a0" fontSize={11} />
                <YAxis stroke="#8888a0" fontSize={11} />
                <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', color: '#e8e8f0' }} />
                <Area type="monotone" dataKey="goal" fill="rgba(124,77,255,0.2)" stroke="#7c4dff" name="Goal" />
                <Area type="monotone" dataKey="burned" fill="rgba(0,230,118,0.2)" stroke="#00e676" name="Burned" />
                <Legend />
              </AreaChart>
            </ResponsiveContainer>
          ) : <p className="empty-state">No calorie data yet</p>}
        </GlassCard>

        {/* Workout Split Pie */}
        <GlassCard className="chart-card page-enter stagger-4">
          <h3>💪 Workout Split</h3>
          {workouts.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={workouts} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {workouts.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', color: '#e8e8f0' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="empty-state">No workout split data</p>}
        </GlassCard>

        {/* Cardio Progress */}
        <GlassCard className="chart-card page-enter stagger-5">
          <h3>🏃 Cardio Progress</h3>
          {cardio.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={cardio.map(d => ({ ...d, date: fmt(d.date) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="date" stroke="#8888a0" fontSize={11} />
                <YAxis yAxisId="left" stroke="#8888a0" fontSize={11} />
                <YAxis yAxisId="right" orientation="right" stroke="#8888a0" fontSize={11} />
                <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', color: '#e8e8f0' }} />
                <Bar yAxisId="left" dataKey="distance" fill="#40c4ff" name="km" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="time" fill="#7c4dff" name="min" radius={[4, 4, 0, 0]} />
                <Legend />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="empty-state">No cardio data yet</p>}
        </GlassCard>
      </div>

      {/* Heatmap */}
      <GlassCard className="heatmap-card page-enter stagger-6">
        <h3>🗓️ Activity Heatmap</h3>
        <p className="heatmap-subtitle">{heatmapDates.length} active days in the past year</p>
        <div className="heatmap-grid">
          {heatmapCells.map((cell, i) => (
            <div
              key={i}
              className={`heatmap-cell ${cell.active ? 'active' : ''}`}
              title={cell.date}
            />
          ))}
        </div>
        <div className="heatmap-legend">
          <span>Less</span>
          <div className="heatmap-cell" />
          <div className="heatmap-cell active" style={{ opacity: 0.4 }} />
          <div className="heatmap-cell active" style={{ opacity: 0.7 }} />
          <div className="heatmap-cell active" />
          <span>More</span>
        </div>
      </GlassCard>
    </div>
  );
}
