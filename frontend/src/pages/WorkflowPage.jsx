import { useMemo } from 'react';
import PageShell from '../components/PageShell';
import { useAuth } from '../context/AuthContext';
import { getNavForRole } from '../lib/navigation';

const workflow = [
  'Регистрация и login',
  'Создание команды лидером',
  'Добавление аудитора в команду',
  'Загрузка Excel-файла клиентом',
  'Назначение аудитора на отчет лидером',
  'Запуск алгоритма аудитором',
  'Официальный verdict аудитора',
  'Финальный approve/reject лидера'
];

export default function WorkflowPage() {
  const { role } = useAuth();
  const navItems = useMemo(() => getNavForRole(role), [role]);

  return (
    <PageShell
      title="Полный workflow задач системы"
      subtitle="От регистрации до финального approve"
      badge="END-TO-END"
      navItems={navItems}
    >
      <div className="panel card">
        <div className="note note-ok">
          Auth UX: refresh access token выполняется автоматически, logout доступен в хедере каждого экрана.
        </div>

        <div className="stepper" style={{ marginTop: 12 }}>
          {workflow.map((item) => (
            <div key={item} className="step active">
              {item}
            </div>
          ))}
        </div>

        <table className="table" style={{ marginTop: 14 }}>
          <thead>
            <tr>
              <th>Endpoint</th>
              <th>Role</th>
              <th>Status transition</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>/api/teams</td>
              <td>LEADER</td>
              <td>Team Created</td>
            </tr>
            <tr>
              <td>/api/teams/{'{teamId}'}/auditors</td>
              <td>LEADER</td>
              <td>Auditor Added</td>
            </tr>
            <tr>
              <td>/api/teams/{'{teamId}'}/reports/upload</td>
              <td>CLIENT</td>
              <td>Submitted</td>
            </tr>
            <tr>
              <td>/api/reports/{'{id}'}/assign</td>
              <td>LEADER</td>
              <td>AssignedToAuditor</td>
            </tr>
            <tr>
              <td>/api/reports/{'{id}'}/run-algorithm</td>
              <td>AUDITOR</td>
              <td>AlgorithmCompleted</td>
            </tr>
            <tr>
              <td>/api/reports/{'{id}'}/auditor-verdict</td>
              <td>AUDITOR</td>
              <td>AuditorVerdictSubmitted</td>
            </tr>
            <tr>
              <td>/api/reports/{'{id}'}/leader-approve</td>
              <td>LEADER</td>
              <td>LeaderApproved / LeaderRejected</td>
            </tr>
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}
