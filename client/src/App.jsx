import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import useAuthStore from './store/authStore';
import useNotificationStore from './store/notificationStore';
import { connectSocket, disconnectSocket, getSocket } from './services/socket';
import { registerPushNotifications } from './services/pushNotification';

import PageWrapper from './components/layout/PageWrapper';
import ToastNotification from './components/social/ToastNotification';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Onboarding from './pages/auth/Onboarding';
import Dashboard from './pages/trainee/Dashboard';
import Analytics from './pages/trainee/Analytics';
import DailyPlan from './pages/trainee/DailyPlan';
import LogActivity from './pages/trainee/LogActivity';
import Profile from './pages/trainee/Profile';
import Leaderboard from './pages/shared/Leaderboard';
import Challenges from './pages/shared/Challenges';
import Chat from './pages/shared/Chat';
import TrainerDashboard from './pages/trainer/TrainerDashboard';
import ChallengeCreator from './pages/trainer/ChallengeCreator';
import MemberTable from './pages/trainer/MemberTable';

import './styles/globals.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-muted)' }}>
        <div style={{ animation: 'spin 1s linear infinite', fontSize: '2rem' }}>💪</div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function AuthGuard({ children }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  if (isLoading) return null;
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
}

function DashboardSwitcher() {
  const { user } = useAuthStore();
  if (user?.role === 'trainer' || user?.role === 'admin') {
    return <TrainerDashboard />;
  }
  return <Dashboard />;
}

function AppInit({ children }) {
  const { user, fetchProfile, isAuthenticated } = useAuthStore();
  const { addFeedItem, addToast } = useNotificationStore();

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      fetchProfile();
      syncOfflineNotifications();
      registerPushNotifications();
    } else {
      useAuthStore.setState({ isLoading: false });
    }

    const handleOnline = () => {
      if (isAuthenticated) syncOfflineNotifications();
    };
    window.addEventListener('online', handleOnline);

    return () => window.removeEventListener('online', handleOnline);
  }, [isAuthenticated]);

  const syncOfflineNotifications = async () => {
    try {
      // Dynamic import to prevent circular or top-level hydration issues if api isn't ready
      const api = (await import('./services/api')).default;
      const { data } = await api.get('/profile/sync-notifications');
      if (data && data.data) {
        data.data.forEach(notification => {
          setTimeout(() => {
            addToast({ type: 'info', title: notification.title, message: notification.message });
          }, 500); // Stagger Toasts slightly
        });
      }
    } catch {}
  };

  // Connect Socket.io when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const socket = connectSocket(token);

    socket.on('activity:new', (data) => {
      addFeedItem(data);
      addToast({
        type: 'info',
        title: `${data.name}`,
        message: data.summary,
      });
    });

    socket.on('notification:personal', (data) => {
      addToast({
        type: 'info',
        title: data.title,
        message: data.message,
      });
    });

    return () => {
      disconnectSocket();
    };
  }, [isAuthenticated]);

  // Handle branch room joining dynamically and on reconnection
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !user?.profile?.gymBranch) return;

    const joinBranch = () => {
      const branch = user.profile.gymBranch.toLowerCase();
      socket.emit('join:branch', { branch });
      console.log('Joined branch room:', branch);
    };

    // Join immediately if already connected
    if (socket.connected) joinBranch();

    // Re-join on every reconnection
    socket.on('connect', joinBranch);

    return () => {
      socket.off('connect', joinBranch);
    };
  }, [user?.profile?.gymBranch]);

  return children;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppInit>
          <ToastNotification />
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<AuthGuard><Login /></AuthGuard>} />
            <Route path="/register" element={<AuthGuard><Register /></AuthGuard>} />
            <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />

            {/* Protected routes with sidebar */}
            <Route element={<ProtectedRoute><PageWrapper /></ProtectedRoute>}>
              <Route path="/dashboard" element={<DashboardSwitcher />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/daily-plan" element={<DailyPlan />} />
              <Route path="/log" element={<LogActivity />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/challenges" element={<Challenges />} />
              <Route path="/chat" element={<Chat />} />
              
              {/* Trainer & Admin Routes */}
              <Route path="/trainer" element={<TrainerDashboard />} />
              <Route path="/members" element={<MemberTable />} />
              <Route path="/create-challenge" element={<ChallengeCreator />} />
            </Route>

            {/* Default redirect */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AppInit>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
