import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, LayoutDashboard, AlertTriangle, Wrench, LogOut, User } from 'lucide-react';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar" style={{ background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(12px)' }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0 0.5rem' }}>
        <ShieldCheck size={28} style={{ color: '#3b82f6', flexShrink: 0 }} />
        <span style={{ fontWeight: 700, fontSize: '1.1rem', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          ErrorSentry AI
        </span>
      </div>

      {/* User Info */}
      <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <User size={18} color="white" />
        </div>
        <div style={{ overflow: 'hidden' }}>
          <div style={{ fontWeight: 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.username}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Active Session</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav" style={{ flex: 1 }}>
        <NavLink
          to="/dashboard/logs"
          id="nav-logs"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          style={({ isActive }) => isActive ? { background: 'rgba(59,130,246,0.15)', color: '#3b82f6' } : {}}
        >
          <LayoutDashboard size={18} /> Log Files
        </NavLink>
        <NavLink
          to="/dashboard/errors"
          id="nav-errors"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          style={({ isActive }) => isActive ? { background: 'rgba(59,130,246,0.15)', color: '#3b82f6' } : {}}
        >
          <AlertTriangle size={18} /> Errors
        </NavLink>
        <NavLink
          to="/dashboard/fixes"
          id="nav-fixes"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          style={({ isActive }) => isActive ? { background: 'rgba(34,197,94,0.15)', color: 'var(--success)' } : {}}
        >
          <Wrench size={18} /> Fixes
        </NavLink>
      </nav>

      {/* Logout */}
      <button id="btn-logout" onClick={handleLogout} className="btn btn-danger" style={{ width: '100%', marginTop: '1rem' }}>
        <LogOut size={16} /> Logout
      </button>
    </aside>
  );
}
