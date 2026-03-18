export const ROLES = {
  LEADER: 'LEADER',
  AUDITOR: 'AUDITOR',
  CLIENT: 'CLIENT',
  USER: 'USER'
};

export function getHomeRouteForRole(role) {
  switch ((role || '').toUpperCase()) {
    case ROLES.LEADER:
      return '/leader';
    case ROLES.AUDITOR:
      return '/auditor';
    case ROLES.CLIENT:
      return '/client';
    default:
      return '/workflow';
  }
}
