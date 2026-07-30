import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  forgotPassword as forgotPasswordRequest,
  getCurrentUser,
  googleLoginUser,
  loginUser,
  registerUser,
  resendVerification,
  resetPassword as resetPasswordRequest,
  verifyEmail,
} from '../api/authApi';
import { logAuthError } from '../utils/authErrors';
import { useToast } from './ToastContext';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { pushToast } = useToast();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await getCurrentUser();
        setUser(response.user);
      } catch (_error) {
        localStorage.removeItem('token');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, []);

  const login = async (payload) => {
    try {
      const response = await loginUser(payload);
      localStorage.setItem('token', response.token);
      setUser(response.user);
      pushToast({ title: response.message || 'Login Successful', variant: 'success' });
      return response.user;
    } catch (error) {
      logAuthError('login', error);
      throw error;
    }
  };

  const register = async (payload) => {
    try {
      const response = await registerUser(payload);
      if (response.message) {
        pushToast({
          title: response.message,
          variant: 'success',
        });
      }
      return response;
    } catch (error) {
      logAuthError('register', error);
      throw error;
    }
  };

  const confirmEmail = async (payload) => {
    try {
      const response = await verifyEmail(payload);
      localStorage.setItem('token', response.token);
      setUser(response.user);
      pushToast({ title: response.message || 'Email Verified', variant: 'success' });
      return response;
    } catch (error) {
      logAuthError('verify-email', error);
      throw error;
    }
  };

  const resendCode = async (payload) => {
    try {
      const response = await resendVerification(payload);
      pushToast({ title: response.message || 'OTP Sent', variant: 'success' });
      return response;
    } catch (error) {
      logAuthError('resend-verification', error);
      throw error;
    }
  };

  const googleLogin = async (payload) => {
    try {
      const response = await googleLoginUser(payload);
      localStorage.setItem('token', response.token);
      setUser(response.user);
      pushToast({ title: response.message || 'Login Successful', variant: 'success' });
      return response.user;
    } catch (error) {
      logAuthError('google-login', error);
      throw error;
    }
  };

  const forgotPassword = async (payload) => {
    try {
      const response = await forgotPasswordRequest(payload);
      pushToast({ title: response.message || 'OTP Sent', variant: 'success' });
      return response;
    } catch (error) {
      logAuthError('forgot-password', error);
      throw error;
    }
  };

  const resetPassword = async (payload) => {
    try {
      const response = await resetPasswordRequest(payload);
      localStorage.setItem('token', response.token);
      setUser(response.user);
      pushToast({ title: response.message || 'Password Reset Successful', variant: 'success' });
      return response;
    } catch (error) {
      logAuthError('reset-password', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: !!user,
      login,
      register,
      confirmEmail,
      resendCode,
      googleLogin,
      forgotPassword,
      resetPassword,
      logout,
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
};