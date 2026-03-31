import './StreakBadge.css';

export default function StreakBadge({ streak }) {
  return (
    <div className="streak-badge">
      <span className="streak-badge__flame">🔥</span>
      <span className="streak-badge__count">{streak}</span>
      <span className="streak-badge__label">day streak</span>
    </div>
  );
}
