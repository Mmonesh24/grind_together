import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import useAuthStore from './store/authStore';
import useNotificationStore from './store/notificationStore';
import { connectSocket, disconnectSocket, getSocket } from './services/socket';

import PageWrapper from './components/layout/PageWrapper';
import ToastNotification from './components/social/ToastNotification';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Onboarding from './pages/auth/Onboarding';
import Dashboard from './pages/trainee/Dashboard';
import LogActivity from './pages/trainee/LogActivity';
import Profile from './pages/trainee/Profile';
import Leaderboard from './pages/shared/Leaderboard';
import Challenges from './pages/shared/Challenges';
import Chat from './pages/shared/Chat';

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

function AppInit({ children }) {
  const { fetchProfile, isAuthenticated } = useAuthStore();
  const { addFeedItem, addToast } = useNotificationStore();

  // Fetch profile on mount
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      fetchProfile();
    } else {
      useAuthStore.setState({ isLoading: false });
    }
  }, []);

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

    return () => {
      disconnectSocket();
    };
  }, [isAuthenticated]);

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
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/log" element={<LogActivity />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/challenges" element={<Challenges />} />
              <Route path="/chat" element={<Chat />} />
            </Route>

            {/* Default redirect */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AppInit>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
