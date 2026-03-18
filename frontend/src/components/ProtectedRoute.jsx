import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getHomeRouteForRole } from '../lib/roles';

export default function ProtectedRoute({ roles, children }) {
  const { isAuthenticated, role } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (Array.isArray(roles) && roles.length > 0 && !roles.includes(role)) {
    return <Navigate to={getHomeRouteForRole(role)} replace />;
  }

  return children;
}
