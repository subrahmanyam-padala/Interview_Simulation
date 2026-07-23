import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getHeaders = () => ({
  headers: {
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  },
});

export const scheduleRecruiterInterview = async (data) => {
  const response = await axios.post(`${API_URL}/recruiter/schedule`, data, getHeaders());
  return response.data;
};

export const getRecruiterInterviews = async () => {
  const response = await axios.get(`${API_URL}/recruiter/interviews`, getHeaders());
  return response.data;
};

export const getRecruiterRoom = async (roomId) => {
  const response = await axios.get(`${API_URL}/recruiter/room/${roomId}`, getHeaders());
  return response.data;
};

export const submitRecruiterScore = async (roomId, scores, feedback) => {
  const response = await axios.post(`${API_URL}/recruiter/room/${roomId}/score`, { scores, feedback }, getHeaders());
  return response.data;
};

export const updateRecording = async (roomId, recordingStatus) => {
  const response = await axios.put(`${API_URL}/recruiter/room/${roomId}/recording`, { recordingStatus }, getHeaders());
  return response.data;
};
