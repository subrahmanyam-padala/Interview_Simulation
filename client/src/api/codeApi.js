import api from './http';

export const runCode = async (payload) => {
  const { data } = await api.post('/code/run', payload);
  return data;
};

export const submitCode = async (payload) => {
  const { data } = await api.post('/code/submit', payload);
  return data;
};
