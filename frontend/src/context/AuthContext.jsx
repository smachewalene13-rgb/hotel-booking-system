import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

const AuthContext = createContext();

export const DEMO_USERS = {
  admin: { email: 'admin@grandhorizon.com', password: 'Admin123!', label: 'System Admin', role: 'admin' },
  manager: { email: 'manager@grandhorizon.com', password: 'Manager123!', label: 'General Manager', role: 'manager' },
  receptionist: { email: 'receptionist@grandhorizon.com', password: 'Reception123!', label: 'Front Desk', role: 'receptionist' },
  housekeeping: { email: 'housekeeping@grandhorizon.com', password: 'Clean123!', label: 'Housekeeper', role: 'housekeeping' },
  guest: { email: 'guest@example.com', password: 'Guest123!', label: 'Registered Guest', role: 'guest' },
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('grand_horizon_token') || null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state
  useEffect(() => {
    const fetchMe = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.get('/users/me');
        setUser(res.data.user);
      } catch (err) {
        console.warn('Session expired or invalid:', err.message);
        localStorage.removeItem('grand_horizon_token');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    fetchMe();
  }, [token]);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { accessToken, user: userData } = res.data;
    localStorage.setItem('grand_horizon_token', accessToken);
    setToken(accessToken);
    setUser(userData);
    return userData;
  };

  const register = async (userData) => {
    const res = await api.post('/auth/register', userData);
    const { accessToken, user: registeredUser } = res.data;
    localStorage.setItem('grand_horizon_token', accessToken);
    setToken(accessToken);
    setUser(registeredUser);
    return registeredUser;
  };

  const logout = () => {
    localStorage.removeItem('grand_horizon_token');
    setToken(null);
    setUser(null);
  };

  const switchRoleDemo = async (roleKey) => {
    if (roleKey === 'visitor') {
      logout();
      return;
    }
    const demo = DEMO_USERS[roleKey];
    if (demo) {
      return await login(demo.email, demo.password);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role: user?.role || 'visitor',
        isAuthenticated: !!user,
        loading,
        login,
        register,
        logout,
        switchRoleDemo,
        setUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
