import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import realtimeService from '../services/realtime';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
      // Initialize real-time connection
      realtimeService.connect(token);
      // Initialize error SDK
      if (window.initErrorDetection) {
        window.initErrorDetection({
          token,
          userId: JSON.parse(storedUser).id,
          environment: 'development'
        });
      }
    }
    setLoading(false);
  }, []);

  const login = async (credentials) => {
    const res = await authAPI.login(credentials);
    localStorage.setItem('token', res.data.token);
    localStorage.setItem('user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    
    // Initialize real-time connection
    realtimeService.connect(res.data.token);
    
    // Initialize error SDK
    if (window.initErrorDetection) {
      window.initErrorDetection({
        token: res.data.token,
        userId: res.data.user.id,
        environment: 'development'
      });
    }
    
    return res.data;
  };

  const register = async (credentials) => {
    const res = await authAPI.register(credentials);
    localStorage.setItem('token', res.data.token);
    localStorage.setItem('user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    realtimeService.disconnect();
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
