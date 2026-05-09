import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ color: 'white', textAlign: 'center', marginTop: '4rem' }}>Loading...</div>;
  return user ? children : <Navigate to="/login" />;
}
