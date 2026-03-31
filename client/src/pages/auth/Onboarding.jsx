import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import './Auth.css';

const GOALS = [
  { value: 'Lose Weight', icon: '🏃', label: 'Lose Weight' },
  { value: 'Build Muscle', icon: '💪', label: 'Build Muscle' },
  { value: 'Get Fit', icon: '🎯', label: 'Get Fit' },
  { value: 'Endurance', icon: '🚴', label: 'Endurance' },
];

const BRANCHES = ['Downtown', 'Uptown', 'Westside', 'Eastside', 'Central'];

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [gymBranch, setGymBranch] = useState('');
  const [weight, setWeight] = useState('');
  const [bodyFatPct, setBodyFatPct] = useState('');
  const [fitnessGoal, setFitnessGoal] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { completeOnboarding } = useAuthStore();
  const navigate = useNavigate();

  const handleNext = () => {
    if (step === 1 && (!name || !gymBranch)) {
      setError('Please fill in all fields');
      return;
    }
    setError('');
    setStep(step + 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      await completeOnboarding({
        name,
        gymBranch,
        weight: weight ? parseFloat(weight) : undefined,
        bodyFatPct: bodyFatPct ? parseFloat(bodyFatPct) : undefined,
        fitnessGoal: fitnessGoal || undefined,
      });
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-page__left">
        <div className="auth-page__brand">
          <span className="auth-page__brand-icon">🚀</span>
          <h1 className="auth-page__brand-title">Let's Set Up</h1>
          <p className="auth-page__brand-tagline">Just a few details to personalize your experience.</p>
        </div>
        <div className="auth-page__decoration">
          <div className="auth-page__glow-orb orb-1"></div>
          <div className="auth-page__glow-orb orb-2"></div>
        </div>
      </div>

      <div className="auth-page__right">
        <div className="auth-form glass-card-component">
          <div className="onboarding-progress">
            <div className={`onboarding-progress__step ${step >= 1 ? 'active' : ''}`}></div>
            <div className={`onboarding-progress__step ${step >= 2 ? 'active' : ''}`}></div>
          </div>

          {error && <div className="auth-form__error">{error}</div>}

          {step === 1 && (
            <>
              <h2 className="auth-form__title">Your Profile</h2>
              <p className="auth-form__subtitle">Who are you?</p>
              <div className="auth-form__field">
                <label htmlFor="onb-name">Full Name</label>
                <input id="onb-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" required />
              </div>
              <div className="auth-form__field">
                <label htmlFor="onb-branch">Gym Branch</label>
                <select id="onb-branch" value={gymBranch} onChange={(e) => setGymBranch(e.target.value)} required style={{ background: 'var(--bg-elevated)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <option value="">Select branch...</option>
                  {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <button className="auth-form__submit" type="button" onClick={handleNext}>Next →</button>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="auth-form__title">Starting Stats</h2>
              <p className="auth-form__subtitle">Optional — helps track your progress</p>
              <div className="auth-form__field">
                <label htmlFor="onb-weight">Weight (kg)</label>
                <input id="onb-weight" type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="75" />
              </div>
              <div className="auth-form__field">
                <label htmlFor="onb-bf">Body Fat %</label>
                <input id="onb-bf" type="number" value={bodyFatPct} onChange={(e) => setBodyFatPct(e.target.value)} placeholder="20" />
              </div>
              <div className="auth-form__field">
                <label>Fitness Goal</label>
                <div className="goal-cards">
                  {GOALS.map((g) => (
                    <button key={g.value} type="button" className={`goal-card ${fitnessGoal === g.value ? 'active' : ''}`} onClick={() => setFitnessGoal(g.value)}>
                      <span className="goal-card__icon">{g.icon}</span>
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>
              <button className="auth-form__submit" type="button" onClick={handleSubmit} disabled={loading}>
                {loading ? 'Saving...' : 'Start Grinding 🔥'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
