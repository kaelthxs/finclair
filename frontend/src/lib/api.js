export const analysisApi = {
  createTeam: (requestAuth, payload) =>
    requestAuth('analysis', '/api/teams', {
      method: 'POST',
      body: payload
    }),

  listMyTeams: (requestAuth) => requestAuth('analysis', '/api/teams/mine'),

  listTeamCatalog: (requestAuth) => requestAuth('analysis', '/api/teams/catalog'),

  addAuditorToTeam: (requestAuth, teamId, payload) =>
    requestAuth('analysis', `/api/teams/${teamId}/auditors`, {
      method: 'POST',
      body: payload
    }),

  listTeamReports: (requestAuth, teamId) =>
    requestAuth('analysis', `/api/teams/${teamId}/reports`),

  listMyReports: (requestAuth) => requestAuth('analysis', '/api/reports/mine'),

  getReport: (requestAuth, reportId) => requestAuth('analysis', `/api/reports/${reportId}`),

  assignAuditor: (requestAuth, reportId, payload) =>
    requestAuth('analysis', `/api/reports/${reportId}/assign`, {
      method: 'POST',
      body: payload
    }),

  runAlgorithm: (requestAuth, reportId) =>
    requestAuth('analysis', `/api/reports/${reportId}/run-algorithm`, {
      method: 'POST'
    }),

  submitVerdict: (requestAuth, reportId, payload) =>
    requestAuth('analysis', `/api/reports/${reportId}/auditor-verdict`, {
      method: 'POST',
      body: payload
    }),

  leaderDecision: (requestAuth, reportId, payload) =>
    requestAuth('analysis', `/api/reports/${reportId}/leader-approve`, {
      method: 'POST',
      body: payload
    }),

  uploadReport: (requestAuth, teamId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return requestAuth('analysis', `/api/teams/${teamId}/reports/upload`, {
      method: 'POST',
      body: formData
    });
  }
};

export const authApi = {
  listUsers: (requestAuth, params = {}) => {
    const query = new URLSearchParams();
    if (params.role) {
      query.set('role', params.role);
    }

    const suffix = query.toString() ? `?${query.toString()}` : '';
    return requestAuth('auth', `/api/users${suffix}`);
  },

  listRoles: (requestAuth) => requestAuth('auth', '/api/roles'),

  createRole: (requestAuth, payload) =>
    requestAuth('auth', '/api/roles', {
      method: 'POST',
      body: payload
    }),

  deleteRole: (requestAuth, roleId) =>
    requestAuth('auth', `/api/roles/${roleId}`, {
      method: 'DELETE'
    })
};
