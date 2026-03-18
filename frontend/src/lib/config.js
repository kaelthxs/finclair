export const API_BASES = {
  auth: import.meta.env.VITE_AUTH_BASE || '/auth-api',
  analysis: import.meta.env.VITE_ANALYSIS_BASE || '/analysis-api'
};

export const STORAGE_KEYS = {
  session: 'finclair.session.v1'
};
