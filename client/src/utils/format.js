export const formatDateTime = (value) => {
  if (!value) {
    return 'N/A';
  }
  return new Date(value).toLocaleString();
};

export const formatPercent = (value) => `${Math.round(value || 0)}%`;

export const difficultyBadge = (difficulty) => {
  const map = {
    easy: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    medium: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    hard: 'bg-red-500/20 text-red-300 border-red-500/40',
  };

  return map[difficulty] || 'bg-slate-700 text-slate-200 border-slate-600';
};
