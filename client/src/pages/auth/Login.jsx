import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import './Auth.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(email, password);
      if (!data.user.profile?.onboardingComplete) {
        navigate('/onboarding');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
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
            Turn your gym into a competitive, accountable social ecosystem.
          </p>
        </div>
        <div className="auth-page__decoration">
          <div className="auth-page__glow-orb orb-1"></div>
          <div className="auth-page__glow-orb orb-2"></div>
        </div>
      </div>

      <div className="auth-page__right">
        <form className="auth-form glass-card-component" onSubmit={handleSubmit}>
          <h2 className="auth-form__title">Welcome Back</h2>
          <p className="auth-form__subtitle">Log in to continue your grind</p>

          {error && <div className="auth-form__error">{error}</div>}

          <div className="auth-form__field">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@gym.com"
              required
            />
          </div>

          <div className="auth-form__field">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button className="auth-form__submit" type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Log In'}
          </button>

          <p className="auth-form__footer">
            New here? <Link to="/register">Create Account</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
