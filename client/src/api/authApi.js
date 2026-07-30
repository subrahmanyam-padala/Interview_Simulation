import api from './http';

export const registerUser = async (payload) => {
  const { data } = await api.post('/auth/register', payload);
  return data;
};

export const loginUser = async (payload) => {
  const { data } = await api.post('/auth/login', payload);
  return data;
};

export const googleLoginUser = async (payload) => {
  const { data } = await api.post('/auth/google', payload);
  return data;
};

export const verifyEmail = async (payload) => {
  const { data } = await api.post('/auth/verify-email', payload);
  return data;
};

export const resendVerification = async (payload) => {
  const { data } = await api.post('/auth/resend-verification', payload);
  return data;
};

export const forgotPassword = async (payload) => {
  const { data } = await api.post('/auth/forgot-password', payload);
  return data;
};

export const resetPassword = async (payload) => {
  const { data } = await api.post('/auth/reset-password', payload);
  return data;
};

export const getCurrentUser = async () => {
  const { data } = await api.get('/auth/me');
  return data;
};
export const sendOtp = async (payload) => {
  const { data } = await api.post('/auth/send-otp', payload);
  return data;
};

export const verifyOtp = async (payload) => {
  const { data } = await api.post('/auth/verify-otp', payload);
  return data;
};

export const resendOtp = async (payload) => {
  const { data } = await api.post('/auth/resend-otp', payload);
  return data;
};