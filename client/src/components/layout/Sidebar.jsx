import { NavLink, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import useUiStore from '../../store/uiStore';
import './Sidebar.css';

const TRAINEE_NAV = [
  { to: '/dashboard', icon: '📊', label: 'Dashboard' },
  { to: '/log', icon: '📝', label: 'Log Activity' },
  { to: '/analytics', icon: '📈', label: 'Analytics' },
  { to: '/challenges', icon: '🏆', label: 'Challenges' },
  { to: '/leaderboard', icon: '🥇', label: 'Leaderboard' },
  { to: '/chat', icon: '💬', label: 'Chat' },
  { to: '/profile', icon: '👤', label: 'Profile' },
];

const TRAINER_NAV = [
  { to: '/trainer', icon: '🎯', label: 'Dashboard' },
  { to: '/members', icon: '👥', label: 'Members' },
  { to: '/create-challenge', icon: '🏆', label: 'Create Challenge' },
  { to: '/challenges', icon: '📋', label: 'All Challenges' },
  { to: '/leaderboard', icon: '🥇', label: 'Leaderboard' },
  { to: '/chat', icon: '💬', label: 'Chat' },
  { to: '/profile', icon: '👤', label: 'Profile' },
];

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const { sidebarOpen, toggleSidebar } = useUiStore();
  const navigate = useNavigate();

  const isTrainer = user?.role === 'trainer' || user?.role === 'admin';
  const navItems = isTrainer ? TRAINER_NAV : TRAINEE_NAV;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className={`sidebar ${sidebarOpen ? 'open' : 'collapsed'}`}>
      <div className="sidebar__header">
        <div className="sidebar__logo">
          <span className="sidebar__logo-icon">💪</span>
          {sidebarOpen && <span className="sidebar__logo-text">GrindTogether</span>}
        </div>
        <button className="sidebar__toggle" onClick={toggleSidebar}>
          {sidebarOpen ? '◀' : '▶'}
        </button>
      </div>

      {sidebarOpen && isTrainer && (
        <div className="sidebar__role-badge">🎯 TRAINER MODE</div>
      )}

      <nav className="sidebar__nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `sidebar__link ${isActive ? 'active' : ''}`
            }
          >
            <span className="sidebar__link-icon">{item.icon}</span>
            {sidebarOpen && <span className="sidebar__link-label">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar__footer">
        {sidebarOpen && user && (
          <div className="sidebar__user">
            <div className="sidebar__user-avatar">
              {user.profile?.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="sidebar__user-info">
              <span className="sidebar__user-name">{user.profile?.name || user.email}</span>
              <span className="sidebar__user-role">{user.role}</span>
            </div>
          </div>
        )}
        <button className="sidebar__logout" onClick={handleLogout}>
          <span>🚪</span>
          {sidebarOpen && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
