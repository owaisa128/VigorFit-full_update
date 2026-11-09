import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext();

export const TOKEN_KEY = 'fittrack_token';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || null);
  const [loading, setLoading] = useState(true);

  // Restore authenticated session on application mount
  useEffect(() => {
    const verifyToken = async () => {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      if (!storedToken) {
        setUser(null);
        setToken(null);
        setLoading(false);
        return;
      }

      try {
        const response = await api.get('/auth/profile');
        if (response.data && response.data.success) {
          setUser(response.data.user);
          setToken(storedToken);
        } else {
          // Token invalid or session expired
          logout();
        }
      } catch (err) {
        console.warn('Failed to restore auth session:', err?.response?.data?.message || err.message);
        // Clear stored invalid token
        localStorage.removeItem(TOKEN_KEY);
        setUser(null);
        setToken(null);
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, []);

  // Register User
  const register = async (name, email, password) => {
    try {
      const response = await api.post('/auth/register', {
        name,
        email: email.trim().toLowerCase(),
        password,
      });
      const { user: userData, token: newToken } = response.data;

      if (newToken) {
        localStorage.setItem(TOKEN_KEY, newToken);
        setToken(newToken);
        setUser(userData);
      }
      return response.data;
    } catch (err) {
      const message = err.response?.data?.message || 'Registration failed. Please try again.';
      throw new Error(message);
    }
  };

  const registerTrainer = async (name, email, password) => {
    try {
      const response = await api.post('/trainers/register', {
        name,
        email: email.trim().toLowerCase(),
        password,
      });
      return response.data;
    } catch (err) {
      const message = err.response?.data?.message || 'Trainer registration failed. Please try again.';
      throw new Error(message);
    }
  };

  // Login User
  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', {
        email: email.trim().toLowerCase(),
        password,
      });
      const { user: userData, token: newToken } = response.data;

      if (newToken) {
        localStorage.setItem(TOKEN_KEY, newToken);
        setToken(newToken);
        setUser(userData);
      }
      return response.data;
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed. Invalid credentials.';
      throw new Error(message);
    }
  };

  // Logout User
  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    registerTrainer,
    logout,
    updateUser: setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
