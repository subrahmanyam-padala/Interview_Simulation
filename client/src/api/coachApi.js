import api from './http';

// ─── Sessions ──────────────────────────────────────────────────────────────
export const listCoachSessions = async () => {
  const { data } = await api.get('/coach/sessions');
  return data;
};

export const createCoachSession = async (payload = {}) => {
  const { data } = await api.post('/coach/sessions', payload);
  return data;
};

export const getCoachSession = async (sessionId) => {
  const { data } = await api.get(`/coach/sessions/${sessionId}`);
  return data;
};

export const updateCoachSessionTitle = async (sessionId, title) => {
  const { data } = await api.patch(`/coach/sessions/${sessionId}`, { title });
  return data;
};

export const deleteCoachSession = async (sessionId) => {
  const { data } = await api.delete(`/coach/sessions/${sessionId}`);
  return data;
};

// ─── Messaging ─────────────────────────────────────────────────────────────
export const sendCoachMessage = async (sessionId, payload) => {
  const { data } = await api.post(`/coach/sessions/${sessionId}/message`, payload);
  return data;
};

export const clearCoachMessages = async (sessionId) => {
  const { data } = await api.delete(`/coach/sessions/${sessionId}/messages`);
  return data;
};
