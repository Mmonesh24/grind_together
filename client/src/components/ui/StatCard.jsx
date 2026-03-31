import './StatCard.css';

export default function StatCard({ icon, label, value, trend, className = '' }) {
  return (
    <div className={`stat-card glass-card-component ${className}`}>
      <div className="stat-card__icon">{icon}</div>
      <div className="stat-card__content">
        <span className="stat-card__value">{value}</span>
        <span className="stat-card__label">{label}</span>
      </div>
      {trend !== undefined && (
        <span className={`stat-card__trend ${trend >= 0 ? 'up' : 'down'}`}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}
        </span>
      )}
    </div>
  );
}
