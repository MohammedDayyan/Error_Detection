import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';

export default function DashboardLayout() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;

  return (
    <div className="dashboard-layout" style={{ background: 'radial-gradient(circle at top right, rgba(59,130,246,0.08), transparent 40%), radial-gradient(circle at bottom left, rgba(139,92,246,0.08), transparent 40%), var(--bg-dark)' }}>
      <Sidebar />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
