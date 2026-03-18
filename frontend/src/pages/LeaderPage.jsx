import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PageShell from '../components/PageShell';
import { useAuth } from '../context/AuthContext';
import { analysisApi, authApi } from '../lib/api';
import { getNavForRole } from '../lib/navigation';

function getStatusLabel(status) {
  switch (status) {
    case 'Submitted':
      return 'Submitted';
    case 'AssignedToAuditor':
      return 'Assigned';
    case 'AlgorithmCompleted':
      return 'AlgorithmCompleted';
    case 'AuditorVerdictSubmitted':
      return 'AuditorVerdictSubmitted';
    case 'LeaderApproved':
      return 'LeaderApproved';
    case 'LeaderRejected':
      return 'LeaderRejected';
    default:
      return status;
  }
}

function formatUserNameById(userId, directoryMap) {
  const profile = directoryMap.get(userId);
  const name = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ').trim();
  if (name) {
    return name;
  }
  return profile?.login || profile?.email || 'Пользователь';
}

function formatReportTitle(report) {
  return report.originalFileName || 'Отчет';
}

export default function LeaderPage() {
  const navigate = useNavigate();
  const { requestAuth, role } = useAuth();
  const navItems = useMemo(() => getNavForRole(role), [role]);

  const [teams, setTeams] = useState([]);
  const [auditors, setAuditors] = useState([]);
  const [usersDirectory, setUsersDirectory] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [reports, setReports] = useState([]);
  const [teamName, setTeamName] = useState('');
  const [selectedNewTeamAuditorIds, setSelectedNewTeamAuditorIds] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const usersMap = useMemo(() => {
    return new Map(usersDirectory.map((user) => [user.id, user]));
  }, [usersDirectory]);

  async function loadTeams(keepSelection = true) {
    setError('');
    const data = await analysisApi.listMyTeams(requestAuth);
    const teamsValue = Array.isArray(data) ? data : [];
    setTeams(teamsValue);

    if (!keepSelection) {
      setSelectedTeamId(teamsValue[0]?.id || '');
      return;
    }

    setSelectedTeamId((prev) => {
      if (!prev) {
        return teamsValue[0]?.id || '';
      }

      return teamsValue.some((team) => team.id === prev) ? prev : (teamsValue[0]?.id || '');
    });
  }

  async function loadReports(teamId) {
    if (!teamId) {
      setReports([]);
      return;
    }

    const data = await analysisApi.listTeamReports(requestAuth, teamId);
    setReports(Array.isArray(data) ? data : []);
  }

  async function loadAuditors() {
    const data = await authApi.listUsers(requestAuth, { role: 'AUDITOR' });
    const users = Array.isArray(data) ? data : [];
    setAuditors(users.map((user) => ({
      id: String(user.id),
      login: user.login,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName
    })));
  }

  async function loadUsersDirectory() {
    const data = await authApi.listUsers(requestAuth);
    const users = Array.isArray(data) ? data : [];
    setUsersDirectory(users.map((user) => ({
      id: String(user.id),
      login: user.login,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName
    })));
  }

  useEffect(() => {
    let mounted = true;

    (async () => {
      setIsLoading(true);
      try {
        await Promise.all([loadTeams(false), loadAuditors(), loadUsersDirectory()]);
      } catch (requestError) {
        if (mounted) {
          setError(requestError.message || 'Не удалось загрузить команды/аудиторов.');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    (async () => {
      if (!selectedTeamId) {
        setReports([]);
        return;
      }

      try {
        await loadReports(selectedTeamId);
      } catch (requestError) {
        if (active) {
          setError(requestError.message || 'Не удалось загрузить отчеты.');
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [selectedTeamId]);

  async function handleCreateTeam(event) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setIsCreating(true);

    try {
      await analysisApi.createTeam(requestAuth, {
        name: teamName,
        auditorUserIds: selectedNewTeamAuditorIds
      });
      setSuccess('Команда создана.');
      setTeamName('');
      setSelectedNewTeamAuditorIds([]);
      await loadTeams(false);
    } catch (requestError) {
      setError(requestError.message || 'Не удалось создать команду.');
    } finally {
      setIsCreating(false);
    }
  }

  const kpi = useMemo(() => {
    const awaitingAssign = reports.filter((report) => !report.assignedAuditorUserId).length;
    const readyForApprove = reports.filter((report) => report.status === 'AuditorVerdictSubmitted').length;

    return {
      teamsCount: teams.length,
      reportsCount: reports.length,
      awaitingAssign,
      readyForApprove
    };
  }, [teams, reports]);

  return (
    <PageShell
      title="Кабинет лидера"
      subtitle="Команды, отчеты, назначение аудитора, финальное approve/reject"
      badge="ROLE: LEADER"
      navItems={navItems}
    >
      <div className="layout">
        <div className="panel sidebar">
          <div className="brand">
            <div className="brand-mark" />
            Finclair
          </div>

          <div className="field" style={{ marginTop: 14 }}>
            <label>Текущая команда</label>
            <select value={selectedTeamId} onChange={(event) => setSelectedTeamId(event.target.value)}>
              {teams.length === 0 ? <option value="">Нет команд</option> : null}
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid" style={{ gap: 8 }}>
            <Link className="btn secondary" to="/leader/add-auditor">
              Добавить аудитора
            </Link>
            <Link className="btn secondary" to="/leader/assign">
              Назначить аудитора
            </Link>
            <Link className="btn secondary" to="/leader/final">
              Финальное решение
            </Link>
          </div>
        </div>

        <div className="grid" style={{ gridTemplateRows: 'auto auto 1fr' }}>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
            <div className="kpi">
              <div className="muted">Команд</div>
              <div className="value">{kpi.teamsCount}</div>
            </div>
            <div className="kpi">
              <div className="muted">Отчетов</div>
              <div className="value">{kpi.reportsCount}</div>
            </div>
            <div className="kpi">
              <div className="muted">Ожидают assign</div>
              <div className="value">{kpi.awaitingAssign}</div>
            </div>
            <div className="kpi">
              <div className="muted">Ready for approve</div>
              <div className="value">{kpi.readyForApprove}</div>
            </div>
          </div>

          <div className="panel card two-split">
            <form onSubmit={handleCreateTeam}>
              <h3 style={{ marginTop: 0 }}>Создать команду</h3>
              <div className="field">
                <label>Название команды</label>
                <input required value={teamName} onChange={(event) => setTeamName(event.target.value)} />
              </div>
              <div className="field">
                <label>Аудиторы (можно выбрать несколько)</label>
                <select
                  multiple
                  size={Math.min(Math.max(auditors.length, 3), 8)}
                  value={selectedNewTeamAuditorIds}
                  onChange={(event) =>
                    setSelectedNewTeamAuditorIds(Array.from(event.target.selectedOptions, (option) => option.value))
                  }
                >
                  {auditors.map((auditor) => {
                    const name = [auditor.firstName, auditor.lastName].filter(Boolean).join(' ').trim();
                    const primary = name || auditor.login || auditor.email || 'Аудитор';
                    return (
                      <option key={auditor.id} value={auditor.id}>
                        {primary}
                      </option>
                    );
                  })}
                </select>
              </div>
              <button disabled={isCreating} className="btn" type="submit">
                {isCreating ? 'Создаем...' : 'Создать'}
              </button>
            </form>

            <div>
              <h3 style={{ marginTop: 0 }}>Детали выбранной команды</h3>
              {selectedTeamId ? (
                <>
                  <p className="muted">Команда: {teams.find((team) => team.id === selectedTeamId)?.name || '-'}</p>
                  <p className="muted">
                    Участники:{' '}
                    {teams.find((team) => team.id === selectedTeamId)?.members?.length || 0}
                  </p>
                </>
              ) : (
                <p className="muted">Выберите или создайте команду.</p>
              )}
            </div>
          </div>

          <div className="panel card">
            <div className="table-header-row">
              <h3 style={{ margin: 0 }}>Отчеты команды</h3>
              <button
                className="btn secondary"
                onClick={async () => {
                  try {
                    if (!selectedTeamId) {
                      return;
                    }
                    await loadReports(selectedTeamId);
                  } catch (requestError) {
                    setError(requestError.message || 'Не удалось обновить отчет.');
                  }
                }}
              >
                Обновить
              </button>
            </div>

            <table className="table">
              <thead>
                <tr>
                  <th>Отчет</th>
                  <th>Client</th>
                  <th>Status</th>
                  <th>Assigned Auditor</th>
                  <th>Auditor Comment</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="muted">
                      {isLoading ? 'Загрузка...' : 'Отчетов пока нет'}
                    </td>
                  </tr>
                ) : (
                  reports.map((report) => (
                    <tr key={report.id}>
                      <td>{formatReportTitle(report)}</td>
                      <td>{formatUserNameById(report.clientUserId, usersMap)}</td>
                      <td>{getStatusLabel(report.status)}</td>
                      <td>
                        {report.assignedAuditorUserId
                          ? formatUserNameById(report.assignedAuditorUserId, usersMap)
                          : '-'}
                      </td>
                      <td>{report.auditorVerdictComment || '-'}</td>
                      <td>
                        <button
                          className="btn secondary"
                          onClick={() => navigate(`/leader/assign?reportId=${report.id}`)}
                        >
                          Assign
                        </button>{' '}
                        <button className="btn" onClick={() => navigate(`/leader/final?reportId=${report.id}`)}>
                          Final
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {error ? <div className="note note-danger">{error}</div> : null}
      {success ? <div className="note note-ok">{success}</div> : null}
    </PageShell>
  );
}
