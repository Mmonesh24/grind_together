import './GlassCard.css';

export default function GlassCard({ children, className = '', glow = false, onClick, style }) {
  return (
    <div
      className={`glass-card-component ${glow ? 'glow' : ''} ${className}`}
      onClick={onClick}
      style={style}
    >
      {children}
    </div>
  );
}
