import { Navigate, Route, Routes } from 'react-router-dom';
import AuthPage from './pages/AuthPage';
import LeaderPage from './pages/LeaderPage';
import AuditorPage from './pages/AuditorPage';
import ClientPage from './pages/ClientPage';
import AddAuditorPage from './pages/AddAuditorPage';
import AssignAuditorPage from './pages/AssignAuditorPage';
import LeaderDecisionPage from './pages/LeaderDecisionPage';
import AuditorAnalysisPage from './pages/AuditorAnalysisPage';
import RoleManagementPage from './pages/RoleManagementPage';
import WorkflowPage from './pages/WorkflowPage';
import NotFoundPage from './pages/NotFoundPage';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';
import { getHomeRouteForRole } from './lib/roles';

function RootRedirect() {
  const { isAuthenticated, role } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return <Navigate to={getHomeRouteForRole(role)} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/workflow" element={<WorkflowPage />} />

      <Route
        path="/tools/roles"
        element={
          <ProtectedRoute>
            <RoleManagementPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/leader"
        element={
          <ProtectedRoute roles={['LEADER']}>
            <LeaderPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/leader/add-auditor"
        element={
          <ProtectedRoute roles={['LEADER']}>
            <AddAuditorPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/leader/assign"
        element={
          <ProtectedRoute roles={['LEADER']}>
            <AssignAuditorPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/leader/final"
        element={
          <ProtectedRoute roles={['LEADER']}>
            <LeaderDecisionPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/auditor"
        element={
          <ProtectedRoute roles={['AUDITOR']}>
            <AuditorPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/auditor/analysis"
        element={
          <ProtectedRoute roles={['AUDITOR']}>
            <AuditorAnalysisPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/client"
        element={
          <ProtectedRoute roles={['CLIENT']}>
            <ClientPage />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
