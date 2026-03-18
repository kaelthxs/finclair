import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageShell from '../components/PageShell';
import { useAuth } from '../context/AuthContext';
import { analysisApi, authApi } from '../lib/api';
import { getNavForRole } from '../lib/navigation';

function formatAuditorLabel(auditor, directoryMap) {
  const profile = directoryMap.get(auditor.userId);
  const name = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ').trim();
  const main = name || profile?.login || profile?.email || 'Аудитор';
  return main;
}

function formatUserLabel(userId, directoryMap) {
  const profile = directoryMap.get(userId);
  const name = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ').trim();
  if (name) {
    return name;
  }
  return profile?.login || profile?.email || 'Пользователь';
}

function formatReportLabel(report) {
  const name = report.originalFileName || 'Отчет';
  return `${name} · ${report.status}`;
}

function normalizeReportItem(raw) {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const id = raw.id || raw.Id;
  if (!id) {
    return null;
  }

  return {
    ...raw,
    id: String(id),
    status: raw.status || raw.Status || '',
    clientUserId: raw.clientUserId || raw.ClientUserId || '',
    originalFileName: raw.originalFileName || raw.OriginalFileName || ''
  };
}

function normalizeReportList(payload) {
  const source = Array.isArray(payload)
    ? payload
    : payload?.items || payload?.reports || payload?.data || payload?.$values || [];

  if (!Array.isArray(source)) {
    return [];
  }

  return source.map(normalizeReportItem).filter(Boolean);
}

export default function AssignAuditorPage() {
  const { requestAuth, role } = useAuth();
  const navItems = useMemo(() => getNavForRole(role), [role]);
  const [searchParams] = useSearchParams();
  const didAutoSwitchTeamRef = useRef(false);

  const [teams, setTeams] = useState([]);
  const [usersDirectory, setUsersDirectory] = useState([]);
  const [teamId, setTeamId] = useState('');
  const [reports, setReports] = useState([]);
  const [reportId, setReportId] = useState(searchParams.get('reportId') || '');
  const [auditorUserId, setAuditorUserId] = useState('');
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const selectedTeam = useMemo(() => teams.find((team) => team.id === teamId) || null, [teams, teamId]);
  const selectedReport = useMemo(() => reports.find((report) => report.id === reportId) || null, [reports, reportId]);

  const usersMap = useMemo(() => {
    return new Map(usersDirectory.map((user) => [user.id, user]));
  }, [usersDirectory]);

  const teamAuditors = useMemo(() => {
    if (!selectedTeam?.members) {
      return [];
    }

    return selectedTeam.members.filter((member) => member.role === 'Auditor' || member.role === 'AUDITOR');
  }, [selectedTeam]);

  async function loadUsersDirectory() {
    const data = await authApi.listUsers(requestAuth);
    const users = Array.isArray(data) ? data : [];
    setUsersDirectory(
      users.map((user) => ({
        id: String(user.id),
        login: user.login,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      }))
    );
  }

  async function loadTeams() {
    const data = await analysisApi.listMyTeams(requestAuth);
    const teamsValue = Array.isArray(data) ? data : [];
    setTeams(teamsValue);
    didAutoSwitchTeamRef.current = false;

    if (teamsValue.length === 0) {
      setTeamId('');
      setReports([]);
      return;
    }

    setTeamId((prev) => {
      if (prev && teamsValue.some((team) => team.id === prev)) {
        return prev;
      }
      return teamsValue[0].id;
    });
  }

  async function loadReports(nextTeamId) {
    if (!nextTeamId) {
      setReports([]);
      return;
    }

    setIsLoadingReports(true);
    try {
      const data = await analysisApi.listTeamReports(requestAuth, nextTeamId);
      const reportsValue = normalizeReportList(data);
      setReports(reportsValue);

      setReportId((prev) => {
        if (prev && reportsValue.some((report) => report.id === prev)) {
          return prev;
        }

        const queryReportId = searchParams.get('reportId');
        if (queryReportId && reportsValue.some((report) => report.id === queryReportId)) {
          return queryReportId;
        }

        return reportsValue[0]?.id || '';
      });
    } finally {
      setIsLoadingReports(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await Promise.all([loadTeams(), loadUsersDirectory()]);
      } catch (requestError) {
        if (mounted) {
          setError(requestError.message || 'Не удалось загрузить команды.');
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
      try {
        if (!teamId) {
          setReports([]);
          return;
        }

        await loadReports(teamId);
      } catch (requestError) {
        if (active) {
          setError(requestError.message || 'Не удалось загрузить отчеты.');
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [teamId]);

  useEffect(() => {
    if (!teamId || reports.length > 0 || teams.length <= 1 || didAutoSwitchTeamRef.current) {
      return;
    }

    didAutoSwitchTeamRef.current = true;
    let active = true;

    (async () => {
      const queryReportId = searchParams.get('reportId');
      const otherTeams = teams.filter((team) => team.id !== teamId);

      for (const team of otherTeams) {
        try {
          const data = await analysisApi.listTeamReports(requestAuth, team.id);
          const reportsValue = normalizeReportList(data);
          if (!active) {
            return;
          }

          if (queryReportId && reportsValue.some((report) => report.id === queryReportId)) {
            setTeamId(team.id);
            setError('');
            return;
          }

          if (reportsValue.length > 0) {
            setTeamId(team.id);
            setSuccess(`Найдены отчеты в команде «${team.name}». Форма переключена автоматически.`);
            setError('');
            return;
          }
        } catch {
          // ignore one team failure; continue scanning other teams
        }
      }

      if (active) {
        setError('В командах этого лидера пока нет отчетов. Клиент должен загрузить файл в одну из ваших команд.');
      }
    })();

    return () => {
      active = false;
    };
  }, [teamId, reports, teams, requestAuth, searchParams]);

  useEffect(() => {
    setAuditorUserId((prev) => {
      if (prev && teamAuditors.some((auditor) => auditor.userId === prev)) {
        return prev;
      }
      return teamAuditors[0]?.userId || '';
    });
  }, [teamAuditors]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!reportId || !auditorUserId) {
      setError('Выберите отчет и аудитора из списка.');
      return;
    }

    setIsSubmitting(true);
    try {
      await analysisApi.assignAuditor(requestAuth, reportId, { auditorUserId });
      setSuccess('Аудитор назначен.');
      await loadReports(teamId);
    } catch (requestError) {
      setError(requestError.message || 'Не удалось назначить аудитора.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <PageShell
      title="Форма: назначить аудитора на файл"
      subtitle="Выберите отчет и назначьте аудитора"
      badge="LEADER ACTION"
      navItems={navItems}
    >
      <div className="panel card">
        <div className="grid" style={{ gridTemplateColumns: '1.2fr 0.8fr' }}>
          <form onSubmit={handleSubmit}>
            <h3 style={{ marginTop: 0 }}>Карточка отчета</h3>

            <div className="form-row">
              <div className="field">
                <label>Команда</label>
                <select value={teamId} onChange={(event) => setTeamId(event.target.value)}>
                  {teams.length === 0 ? <option value="">Нет команд</option> : null}
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>Отчет</label>
                <div className="inline-actions">
                  <select value={reportId} onChange={(event) => setReportId(event.target.value)} disabled={isLoadingReports}>
                    {reports.length === 0 ? <option value="">{isLoadingReports ? 'Загрузка...' : 'Нет отчетов'}</option> : null}
                    {reports.map((report) => (
                      <option key={report.id} value={report.id}>
                        {formatReportLabel(report)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() => loadReports(teamId)}
                    disabled={!teamId || isLoadingReports}
                  >
                    Обновить
                  </button>
                </div>
                {reports.length === 0 && !isLoadingReports ? (
                  <div className="muted tiny" style={{ marginTop: 6 }}>
                    Для выбранной команды отчеты не найдены.
                  </div>
                ) : null}
              </div>
            </div>

            <div className="field">
              <label>Аудитор</label>
              <select value={auditorUserId} onChange={(event) => setAuditorUserId(event.target.value)}>
                {teamAuditors.length === 0 ? <option value="">Нет аудиторов в команде</option> : null}
                {teamAuditors.map((auditor) => (
                  <option key={auditor.userId} value={auditor.userId}>
                    {formatAuditorLabel(auditor, usersMap)}
                  </option>
                ))}
              </select>
            </div>

            <table className="table">
              <thead>
                <tr>
                  <th>Auditor</th>
                  <th>Role</th>
                </tr>
              </thead>
              <tbody>
                {teamAuditors.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="muted">
                      В выбранной команде пока нет аудиторов.
                    </td>
                  </tr>
                ) : (
                  teamAuditors.map((auditor) => (
                    <tr key={auditor.userId}>
                      <td>{formatAuditorLabel(auditor, usersMap)}</td>
                      <td>{auditor.role}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <button className="btn" type="submit" disabled={isSubmitting || !auditorUserId}>
              {isSubmitting ? 'Назначаем...' : 'Подтвердить назначение'}
            </button>
          </form>

          <div className="panel card" style={{ background: '#171723' }}>
            <h3 style={{ marginTop: 0 }}>Проверки перед submit</h3>
            <div className="note note-ok">Пользователь выбирается только из аудиторов команды.</div>
            <div className="note note-ok">Отчет выбирается только из списка выбранной команды.</div>
            <div className="note note-warn">Назначение можно перезаписать новым выбором.</div>

            {selectedReport ? (
              <div className="note note-ok">
                <strong>Текущий отчет:</strong> {selectedReport.originalFileName || 'Отчет'}
                <br />
                <strong>Status:</strong> {selectedReport.status}
                <br />
                <strong>Client:</strong> {formatUserLabel(selectedReport.clientUserId, usersMap)}
              </div>
            ) : (
              <p className="muted">Выберите отчет в списке.</p>
            )}
          </div>
        </div>
      </div>

      {error ? <div className="note note-danger">{error}</div> : null}
      {success ? <div className="note note-ok">{success}</div> : null}
    </PageShell>
  );
}
