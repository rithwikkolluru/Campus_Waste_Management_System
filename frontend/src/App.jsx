import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import StudentDashboard from './pages/StudentDashboard';
import ReportGarbage from './pages/ReportGarbage';
import CoordinatorDashboard from './pages/CoordinatorDashboard';
import AdminDashboard from './pages/AdminDashboard';
import LeaderboardPage from './pages/LeaderboardPage';
import NotificationsPage from './pages/NotificationsPage';
import CampusMapPage from './pages/CampusMapPage';
import AchievementsPage from './pages/AchievementsPage';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import ToastContainer from './components/ToastNotification';

const PrivateRoute = ({ children, roles }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/login" replace />;
  return children;
};

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <BrowserRouter>
          {/* Global toast layer – always visible above everything */}
          <ToastContainer />
          <Routes>
            <Route path="/"         element={<Navigate to="/login" replace />} />
            <Route path="/login"    element={<LoginPage />} />
            <Route path="/register" element={<Navigate to="/login" replace />} />

            <Route path="/student" element={
              <PrivateRoute roles={['student']}>
                <StudentDashboard />
              </PrivateRoute>
            } />
            <Route path="/report" element={
              <PrivateRoute roles={['student']}>
                <ReportGarbage />
              </PrivateRoute>
            } />
            <Route path="/achievements" element={
              <PrivateRoute roles={['student']}>
                <AchievementsPage />
              </PrivateRoute>
            } />
            <Route path="/leaderboard" element={
              <PrivateRoute roles={['student', 'coordinator']}>
                <LeaderboardPage />
              </PrivateRoute>
            } />
            <Route path="/coordinator" element={
              <PrivateRoute roles={['coordinator']}>
                <CoordinatorDashboard />
              </PrivateRoute>
            } />
            <Route path="/admin" element={
              <PrivateRoute roles={['admin']}>
                <AdminDashboard />
              </PrivateRoute>
            } />
            {/* Notifications – accessible to all logged-in roles */}
            <Route path="/notifications" element={
              <PrivateRoute roles={['student', 'coordinator', 'admin']}>
                <NotificationsPage />
              </PrivateRoute>
            } />

            {/* Campus Map – accessible to all logged-in roles */}
            <Route path="/map" element={
              <PrivateRoute roles={['student', 'coordinator', 'admin']}>
                <CampusMapPage />
              </PrivateRoute>
            } />

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
