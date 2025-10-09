import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshAccessToken = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) return false;

      const response = await authAPI.refreshToken(refreshToken);
      
      // Backend returns: { success: true, data: { tokens: { accessToken, refreshToken } } }
      const { tokens } = response.data.data;
      
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      return false;
    }
  };

  const checkAuth = async () => {
    try {
      const accessToken = localStorage.getItem('accessToken');
      if (accessToken) {
        const response = await authAPI.getCurrentUser();
        // Backend returns: { success: true, data: { user } }
        setUser(response.data.data.user);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      // Try to refresh token if auth check fails
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        // Retry getting current user
        try {
          const response = await authAPI.getCurrentUser();
          setUser(response.data.data.user);
        } catch (retryError) {
          console.error('Retry failed:', retryError);
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        }
      } else {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (credentials) => {
    try {
      const response = await authAPI.login(credentials);
      
      // Backend returns: { success: true, data: { user, tokens: { accessToken, refreshToken } } }
      const { user, tokens } = response.data.data;
      
      // Store both tokens
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
      
      setUser(user);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Login failed',
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await authAPI.register(userData);
      
      // Backend returns: { success: true, data: { user_id, email, verification_required } }
      const { verification_required } = response.data.data;
      
      // If email verification is required, return for user to handle
      if (verification_required) {
        return { 
          success: true, 
          verification_required: true,
          message: response.data.message || 'Please check your email to verify your account' 
        };
      }
      
      // If no verification needed (shouldn't happen with current backend), login would be needed
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Registration failed',
      };
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        refreshAccessToken,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
