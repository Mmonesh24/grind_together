import { useState } from 'react';
import { createPortal } from 'react-dom';
import useAuthStore from '../../store/authStore';
import GlassCard from '../../components/ui/GlassCard';
import StatCard from '../../components/ui/StatCard';
import StreakBadge from '../../components/ui/StreakBadge';
import api from '../../services/api';
import './Profile.css';

export default function Profile() {
  const { user, fetchProfile } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const p = user?.profile || {};
  const g = user?.gamification || {};
  const ss = p.startingStats || {};

  const [editData, setEditData] = useState({
    weight: ss.weight || '',
    height: ss.height || '',
    bodyFatPct: ss.bodyFatPct || '',
    fitnessGoal: ss.fitnessGoal || '',
    activity_level: ss.activity_level || '',
    calorieGoal: ss.calorieGoal || '',
  });

  const handleSave = async () => {
    setLoading(true);
    try {
      const payload = {
        ...(editData.weight      && { weight:       parseFloat(editData.weight) }),
        ...(editData.height      && { height:       parseFloat(editData.height) }),
        ...(editData.bodyFatPct  && { bodyFatPct:   parseFloat(editData.bodyFatPct) }),
        ...(editData.fitnessGoal && { fitnessGoal:  editData.fitnessGoal }),
        ...(editData.activity_level && { activity_level: editData.activity_level }),
        ...(editData.calorieGoal !== '' && { calorieGoal: parseFloat(editData.calorieGoal) || 0 }),
      };
      await api.put('/profile', payload);
      await fetchProfile();
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update stats', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="profile-page page-enter">
      {/* Hero */}
      <GlassCard className="profile-hero" glow>
        <div className="profile-hero__avatar">
          {p.name?.charAt(0)?.toUpperCase() || '?'}
        </div>
        <div className="profile-hero__info">
          <h1 className="profile-hero__name">{p.name || 'Anonymous'}</h1>
          <span className="profile-hero__branch">📍 {p.gymBranch || 'No branch'}</span>
          <span className="profile-hero__role">{user?.role?.toUpperCase()}</span>
        </div>
        <div className="profile-hero__actions">
          <button className="btn-outline btn-outline--sm" onClick={() => setIsEditing(true)}>
            ⚙️ Edit Stats
          </button>
          <StreakBadge streak={g.currentStreak || 0} />
        </div>
      </GlassCard>

      {/* Stats */}
      <div className="profile-stats">
        <StatCard icon="⭐" label="Total Points" value={g.totalPoints || 0} className="page-enter stagger-1" />
        <StatCard icon="🔥" label="Current Streak" value={g.currentStreak || 0} className="page-enter stagger-2" />
        <StatCard icon="🏅" label="Longest Streak" value={g.longestStreak || 0} className="page-enter stagger-3" />
      </div>

      {/* Starting Stats */}
      <GlassCard className="profile-starting page-enter stagger-4">
        <div className="section-header">
          <h3>Fitness Profile &amp; Goals</h3>
        </div>
        <div className="profile-starting__grid">
          <div className="profile-stat-item">
            <span className="profile-stat-item__label">Weight</span>
            <span className="profile-stat-item__value">{ss.weight ? `${ss.weight} kg` : '—'}</span>
          </div>
          <div className="profile-stat-item">
            <span className="profile-stat-item__label">Height</span>
            <span className="profile-stat-item__value">{ss.height ? `${ss.height} cm` : '—'}</span>
          </div>
          <div className="profile-stat-item">
            <span className="profile-stat-item__label">Activity</span>
            <span className="profile-stat-item__value" style={{ textTransform: 'capitalize' }}>{ss.activity_level || '—'}</span>
          </div>
          <div className="profile-stat-item">
            <span className="profile-stat-item__label">Fitness Goal</span>
            <span className="profile-stat-item__value">{ss.fitnessGoal || '—'}</span>
          </div>
          <div className="profile-stat-item highlight">
            <span className="profile-stat-item__label">Calorie Goal</span>
            <span className="profile-stat-item__value">{ss.calorieGoal > 0 ? `${ss.calorieGoal} kcal (Manual)` : 'Calculated'}</span>
          </div>
        </div>
      </GlassCard>

      {/* QR Code */}
      <GlassCard className="profile-qr page-enter stagger-5">
        <h3>QR Check-In Code</h3>
        <div className="profile-qr__code">
          <div className="profile-qr__placeholder">
            <span>📱</span>
            <span className="profile-qr__id">{p.qrCode || user?.id}</span>
          </div>
        </div>
      </GlassCard>
    </div>

    {/* Edit Modal — Portalled to document.body to escape z-index stacking context */}
    {isEditing && createPortal(
      <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setIsEditing(false)}>
        <GlassCard className="edit-modal page-enter">
          <div className="modal-header">
            <h2>Edit Fitness Stats</h2>
            <button className="close-btn" onClick={() => setIsEditing(false)}>✕</button>
          </div>
          
          <div className="modal-body">
            <div className="input-group">
              <label>Weight (kg)</label>
              <input type="number" value={editData.weight} onChange={(e) => setEditData({...editData, weight: e.target.value})} />
            </div>
            <div className="input-group">
              <label>Height (cm)</label>
              <input type="number" value={editData.height} onChange={(e) => setEditData({...editData, height: e.target.value})} />
            </div>
            <div className="input-group">
              <label>Activity Level</label>
              <select value={editData.activity_level} onChange={(e) => setEditData({...editData, activity_level: e.target.value})}>
                <option value="low">Low (Sedentary)</option>
                <option value="medium">Medium (Moderate)</option>
                <option value="high">High (Active)</option>
              </select>
            </div>
            <div className="input-group">
              <label>Fitness Goal</label>
              <select value={editData.fitnessGoal} onChange={(e) => setEditData({...editData, fitnessGoal: e.target.value})}>
                <option value="weight_loss">Weight Loss</option>
                <option value="muscle_gain">Muscle Gain</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
            <div className="input-group highlighted-input">
              <label>🎯 Manual Calorie Goal (Optional)</label>
              <p className="input-hint">Leave at 0 to use auto-calculation</p>
              <input type="number" value={editData.calorieGoal} onChange={(e) => setEditData({...editData, calorieGoal: e.target.value})} placeholder="e.g. 2500" />
            </div>
          </div>

          <div className="modal-footer">
            <button className="btn-ghost" onClick={() => setIsEditing(false)}>Cancel</button>
            <button className="btn-fire" onClick={handleSave} disabled={loading}>
              {loading ? 'Saving...' : 'Update Stats'}
            </button>
          </div>
        </GlassCard>
      </div>,
      document.body
    )}
    </>
  );
}
