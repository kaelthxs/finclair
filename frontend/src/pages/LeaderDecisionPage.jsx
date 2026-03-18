import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageShell from '../components/PageShell';
import { useAuth } from '../context/AuthContext';
import { analysisApi, authApi } from '../lib/api';
import { getNavForRole } from '../lib/navigation';

function formatUserNameById(userId, directoryMap) {
  const profile = directoryMap.get(userId);
  const name = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ').trim();
  if (name) {
    return name;
  }
  return profile?.login || profile?.email || 'Пользователь';
}

function formatReportLabel(item) {
  return `${item.originalFileName || 'Отчет'} · ${item.status}`;
}

export default function LeaderDecisionPage() {
  const { requestAuth, role } = useAuth();
  const navItems = useMemo(() => getNavForRole(role), [role]);
  const [searchParams] = useSearchParams();

  const [teams, setTeams] = useState([]);
  const [usersDirectory, setUsersDirectory] = useState([]);
  const [teamId, setTeamId] = useState('');
  const [reports, setReports] = useState([]);
  const [reportId, setReportId] = useState(searchParams.get('reportId') || '');
  const [report, setReport] = useState(null);
  const [approve, setApprove] = useState(true);
  const [comment, setComment] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const usersMap = useMemo(() => {
    return new Map(usersDirectory.map((user) => [user.id, user]));
  }, [usersDirectory]);

  async function loadTeams() {
    const data = await analysisApi.listMyTeams(requestAuth);
    const teamsValue = Array.isArray(data) ? data : [];
    setTeams(teamsValue);

    setTeamId((prev) => {
      if (prev && teamsValue.some((team) => team.id === prev)) {
        return prev;
      }
      return teamsValue[0]?.id || '';
    });
  }

  async function loadReports(nextTeamId) {
    if (!nextTeamId) {
      setReports([]);
      setReportId('');
      setReport(null);
      return;
    }

    const data = await analysisApi.listTeamReports(requestAuth, nextTeamId);
    const reportsValue = Array.isArray(data) ? data : [];
    setReports(reportsValue);

    setReportId((prev) => {
      if (prev && reportsValue.some((item) => item.id === prev)) {
        return prev;
      }

      const queryReportId = searchParams.get('reportId');
      if (queryReportId && reportsValue.some((item) => item.id === queryReportId)) {
        return queryReportId;
      }

      return reportsValue[0]?.id || '';
    });
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

  async function loadReport(id) {
    if (!id) {
      setReport(null);
      return;
    }

    const data = await analysisApi.getReport(requestAuth, id);
    setReport(data || null);
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
          setReportId('');
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
    let active = true;

    (async () => {
      try {
        await loadReport(reportId);
      } catch (requestError) {
        if (active) {
          setError(requestError.message || 'Не удалось получить отчет.');
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [reportId]);

  async function handleDecision(event) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!reportId) {
      setError('Выберите отчет из списка.');
      return;
    }

    setIsBusy(true);
    try {
      const updated = await analysisApi.leaderDecision(requestAuth, reportId, { approve, comment });
      setReport(updated || null);
      setSuccess('Финальное решение отправлено.');
      await loadReports(teamId);
    } catch (requestError) {
      setError(requestError.message || 'Не удалось отправить финальное решение.');
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <PageShell
      title="Форма: финальное решение лидера"
      subtitle="Проверьте отчет и отправьте итоговое решение клиенту"
      badge="LEADER FINAL"
      navItems={navItems}
    >
      <div className="panel card two-split">
        <div>
          <h3 style={{ marginTop: 0 }}>Данные перед решением</h3>

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
              <select value={reportId} onChange={(event) => setReportId(event.target.value)}>
                {reports.length === 0 ? <option value="">Нет отчетов</option> : null}
                {reports.map((item) => (
                  <option key={item.id} value={item.id}>
                    {formatReportLabel(item)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {report ? (
            <>
              <table className="table">
                <tbody>
                  <tr>
                    <td>File</td>
                    <td>{report.originalFileName || '-'}</td>
                  </tr>
                  <tr>
                    <td>Team</td>
                    <td>{teams.find((team) => team.id === report.teamId)?.name || 'Команда'}</td>
                  </tr>
                  <tr>
                    <td>Client</td>
                    <td>{report.clientUserId ? formatUserNameById(report.clientUserId, usersMap) : '-'}</td>
                  </tr>
                  <tr>
                    <td>Assigned Auditor</td>
                    <td>
                      {report.assignedAuditorUserId
                        ? formatUserNameById(report.assignedAuditorUserId, usersMap)
                        : '-'}
                    </td>
                  </tr>
                  <tr>
                    <td>Auditor Verdict</td>
                    <td>{report.auditorVerdict || '-'}</td>
                  </tr>
                  <tr>
                    <td>Auditor Comment</td>
                    <td>{report.auditorVerdictComment || '-'}</td>
                  </tr>
                  <tr>
                    <td>Status</td>
                    <td>{report.status}</td>
                  </tr>
                  <tr>
                    <td>Algorithm Summary</td>
                    <td>{report.algorithmSummary || '-'}</td>
                  </tr>
                </tbody>
              </table>

              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <div className="muted tiny">Appropriate</div>
                  {(report.appropriateItems || []).length === 0 ? (
                    <div className="note note-warn">Нет данных алгоритма.</div>
                  ) : (
                    report.appropriateItems.map((item, index) => (
                      <div key={`ok-${index}`} className="note note-ok">
                        {item}
                      </div>
                    ))
                  )}
                </div>
                <div>
                  <div className="muted tiny">Inappropriate</div>
                  {(report.inappropriateItems || []).length === 0 ? (
                    <div className="note note-ok">Критичных замечаний нет.</div>
                  ) : (
                    report.inappropriateItems.map((item, index) => (
                      <div key={`bad-${index}`} className="note note-danger">
                        {item}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          ) : (
            <p className="muted">Выберите отчет в выпадающем списке.</p>
          )}

          <div className="note note-danger">Высокий риск: проверяйте поля с algorithm warnings до финального approve.</div>
          <div className="note note-warn">Ограничение API: решение доступно только после verdict аудитора.</div>
        </div>

        <form className="panel card" style={{ background: '#171723' }} onSubmit={handleDecision}>
          <h3 style={{ marginTop: 0 }}>Решение</h3>
          <div className="field">
            <label>approve</label>
            <select value={approve ? 'true' : 'false'} onChange={(event) => setApprove(event.target.value === 'true')}>
              <option value="true">true (Approve)</option>
              <option value="false">false (Reject)</option>
            </select>
          </div>

          <div className="field">
            <label>comment</label>
            <textarea rows={8} value={comment} onChange={(event) => setComment(event.target.value)} />
          </div>

          {report?.auditorVerdictComment ? (
            <div className="note note-ok">
              Комментарий аудитора: {report.auditorVerdictComment}
            </div>
          ) : null}

          <div className="inline-actions">
            <button className="btn" disabled={isBusy || !reportId} type="submit">
              {isBusy ? 'Отправляем...' : 'Отправить решение'}
            </button>
          </div>
        </form>
      </div>

      {error ? <div className="note note-danger">{error}</div> : null}
      {success ? <div className="note note-ok">{success}</div> : null}
    </PageShell>
  );
}
