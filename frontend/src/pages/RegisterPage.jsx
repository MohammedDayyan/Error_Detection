import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Loader2 } from 'lucide-react';

export default function RegisterPage() {
  const [formData, setFormData] = useState({ username: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (formData.password !== formData.confirm) {
      return setError('Passwords do not match.');
    }
    setLoading(true);
    try {
      await register({ username: formData.username, password: formData.password });
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.msg || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box glass-panel animate-fade-in">
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <ShieldCheck size={48} style={{ color: '#3b82f6', margin: '0 auto 0.5rem' }} />
          <h1 className="auth-title">ErrorSentry AI</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Create your account</p>
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem', color: 'var(--danger)', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem', display: 'block' }}>Username</label>
          <input id="reg-username" className="input-field" type="text" placeholder="Choose a username" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} required minLength={3} />
          <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem', display: 'block' }}>Password</label>
          <input id="reg-password" className="input-field" type="password" placeholder="Choose a password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required minLength={6} />
          <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem', display: 'block' }}>Confirm Password</label>
          <input id="reg-confirm" className="input-field" type="password" placeholder="Confirm your password" value={formData.confirm} onChange={(e) => setFormData({ ...formData, confirm: e.target.value })} required />
          <button id="reg-submit" type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={loading}>
            {loading ? <Loader2 size={18} className="spin" /> : 'Create Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600 }}>Login</Link>
        </p>
      </div>

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
