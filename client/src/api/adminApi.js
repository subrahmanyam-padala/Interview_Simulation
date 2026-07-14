import api from './http';

export const getAdminOverview = async () => {
  const { data } = await api.get('/admin/overview');
  return data;
};
