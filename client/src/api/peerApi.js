import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getHeaders = () => ({
  headers: {
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  },
});

export const searchCandidates = async (query = '', domain = '') => {
  const response = await axios.get(
    `${API_URL}/peer/candidates?query=${encodeURIComponent(query)}&domain=${encodeURIComponent(domain)}`,
    getHeaders()
  );
  return response.data;
};

export const updatePeerProfile = async (profileData) => {
  const response = await axios.put(`${API_URL}/peer/profile`, profileData, getHeaders());
  return response.data;
};

export const sendInvitation = async (receiverId, domain) => {
  const response = await axios.post(`${API_URL}/peer/invite`, { receiverId, domain }, getHeaders());
  return response.data;
};

export const getInvitations = async () => {
  const response = await axios.get(`${API_URL}/peer/invitations`, getHeaders());
  return response.data;
};

export const respondInvitation = async (id, status) => {
  const response = await axios.post(`${API_URL}/peer/invitations/${id}/respond`, { status }, getHeaders());
  return response.data;
};

export const getInterviewRoom = async (roomId) => {
  const response = await axios.get(`${API_URL}/peer/room/${roomId}`, getHeaders());
  return response.data;
};

export const submitFeedback = async (roomId, rating, feedback) => {
  const response = await axios.post(`${API_URL}/peer/room/${roomId}/feedback`, { rating, feedback }, getHeaders());
  return response.data;
};

export const getPeerHistory = async () => {
  const response = await axios.get(`${API_URL}/peer/history`, getHeaders());
  return response.data;
};
