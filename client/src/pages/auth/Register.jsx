import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import './Auth.css';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [role, setRole] = useState('trainee');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await register(email, password, role);
      navigate('/onboarding');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-page__left">
        <div className="auth-page__brand">
          <span className="auth-page__brand-icon">💪</span>
          <h1 className="auth-page__brand-title">GrindTogether</h1>
          <p className="auth-page__brand-tagline">
            Join the community. Track your progress. Compete with friends.
          </p>
        </div>
        <div className="auth-page__decoration">
          <div className="auth-page__glow-orb orb-1"></div>
          <div className="auth-page__glow-orb orb-2"></div>
        </div>
      </div>

      <div className="auth-page__right">
        <form className="auth-form glass-card-component" onSubmit={handleSubmit}>
          <h2 className="auth-form__title">Create Account</h2>
          <p className="auth-form__subtitle">Start your fitness journey</p>

          {error && <div className="auth-form__error">{error}</div>}

          <div className="auth-form__field">
            <label htmlFor="reg-email">Email</label>
            <input id="reg-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@gym.com" required />
          </div>

          <div className="auth-form__field">
            <label htmlFor="reg-password">Password</label>
            <input id="reg-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 characters" required />
          </div>

          <div className="auth-form__field">
            <label htmlFor="reg-confirm">Confirm Password</label>
            <input id="reg-confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" required />
          </div>

          <div className="auth-form__field">
            <label>I am a...</label>
            <div className="auth-form__roles">
              <button type="button" className={`role-pill ${role === 'trainee' ? 'active' : ''}`} onClick={() => setRole('trainee')}>🏋️ Trainee</button>
              <button type="button" className={`role-pill ${role === 'trainer' ? 'active' : ''}`} onClick={() => setRole('trainer')}>🎯 Trainer</button>
            </div>
          </div>

          <button className="auth-form__submit" type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Account'}
          </button>

          <p className="auth-form__footer">
            Already have an account? <Link to="/login">Log In</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
