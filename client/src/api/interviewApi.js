import api from './http';

export const setupInterview = async (payload) => {
  const { data } = await api.post('/interviews/setup', payload);
  return data;
};

export const getInterview = async (id) => {
  const { data } = await api.get(`/interviews/${id}`);
  return data;
};

export const submitInterviewAnswer = async (id, payload) => {
  const { data } = await api.post(`/interviews/${id}/answer`, payload);
  return data;
};

export const skipInterviewQuestion = async (id, payload) => {
  const { data } = await api.post(`/interviews/${id}/skip`, payload);
  return data;
};

export const completeInterview = async (id) => {
  const { data } = await api.post(`/interviews/${id}/complete`);
  return data;
};

export const getInterviewReport = async (id) => {
  const { data } = await api.get(`/interviews/${id}/report`);
  return data;
};

export const getMyInterviewHistory = async () => {
  const { data } = await api.get('/interviews/history/me');
  return data;
};

export const logProctoringViolation = async (id, payload) => {
  const { data } = await api.post(`/interviews/${id}/proctoring-violation`, payload);
  return data;
};

export const getCareerRecommendation = async (id) => {
  const { data } = await api.get(`/interviews/${id}/career-recommendation`);
  return data;
};
