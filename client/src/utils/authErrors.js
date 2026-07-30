export const getAuthErrorMessage = (error, fallbackMessage = 'Something went wrong.') => {
  const response = error?.response;
  const data = response?.data;

  if (!response) {
    return error?.request ? 'Network error. Please check your connection.' : 'Server unavailable.';
  }

  if (Array.isArray(data?.issues) && data.issues.length > 0) {
    return data.issues[0]?.message || fallbackMessage;
  }

  return data?.message || fallbackMessage;
};

export const logAuthError = (scope, error) => {
  console.error(`[Auth] ${scope} failed`, error?.response?.data || error);
};