import api from './http';

export const generateRoadmap = (data) => api.post('/roadmaps/generate', data);
export const getMyRoadmaps = () => api.get('/roadmaps');
export const getRoadmap = (id) => api.get(`/roadmaps/${id}`);
export const markDayComplete = (id, day) => api.patch(`/roadmaps/${id}/day/${day}/complete`);
export const deleteRoadmap = (id) => api.delete(`/roadmaps/${id}`);
