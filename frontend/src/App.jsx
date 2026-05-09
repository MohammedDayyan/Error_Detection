import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardLayout from './layouts/DashboardLayout';
import LogsPage from './pages/LogsPage';
import ErrorsPage from './pages/ErrorsPage';
import FixesPage from './pages/FixesPage';
import AnalyticsPage from './pages/AnalyticsPage';
import PrivateRoute from './components/PrivateRoute';
import realtimeService from './services/realtime';
import './index.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard/logs" />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <DashboardLayout />
              </PrivateRoute>
            }
          >
            <Route index element={<Navigate to="logs" />} />
            <Route path="logs" element={<LogsPage />} />
            <Route path="errors" element={<ErrorsPage />} />
            <Route path="fixes" element={<FixesPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
