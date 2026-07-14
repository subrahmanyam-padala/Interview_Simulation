import api from './http';

export const createSchedule = async (data) => {
  const response = await api.post('/schedules', data);
  return response.data;
};

export const getMySchedules = async () => {
  const response = await api.get('/schedules');
  return response.data;
};

export const deleteSchedule = async (id) => {
  const response = await api.delete(`/schedules/${id}`);
  return response.data;
};
