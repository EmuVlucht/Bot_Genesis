import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '@services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth harus digunakan dalam AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check authentication saat aplikasi pertama kali load
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const accessToken = localStorage.getItem('accessToken');
      
      if (!accessToken) {
        setLoading(false);
        return;
      }

      const response = await authService.getProfile();
      
      if (response.success) {
        setUser(response.data.user);
        setIsAuthenticated(true);
      } else {
        clearAuth();
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      clearAuth();
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      const response = await authService.login(credentials);
      
      if (response.success) {
        const { user, accessToken, refreshToken } = response.data;
        
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        
        setUser(user);
        setIsAuthenticated(true);
        
        return { success: true, message: response.message };
      }
      
      return { success: false, error: response.error };
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Gagal login. Silakan coba lagi.' 
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await authService.register(userData);
      
      if (response.success) {
        const { user, accessToken, refreshToken } = response.data;
        
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        
        setUser(user);
        setIsAuthenticated(true);
        
        return { success: true, message: response.message };
      }
      
      return { success: false, error: response.error };
    } catch (error) {
      console.error('Register error:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Gagal mendaftar. Silakan coba lagi.' 
      };
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearAuth();
    }
  };

  const logoutAll = async () => {
    try {
      await authService.logoutAll();
      clearAuth();
      return { success: true, message: 'Berhasil logout dari semua perangkat' };
    } catch (error) {
      console.error('Logout all error:', error);
      return { 
        success: false, 
        error: 'Gagal logout dari semua perangkat' 
      };
    }
  };

  const clearAuth = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
    setIsAuthenticated(false);
  };

  const updateUser = (userData) => {
    setUser(prev => ({ ...prev, ...userData }));
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    logoutAll,
    updateUser,
    checkAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};