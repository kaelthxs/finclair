import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageShell from '../components/PageShell';
import { useAuth } from '../context/AuthContext';
import { analysisApi } from '../lib/api';
import { getNavForRole } from '../lib/navigation';

export default function AuditorPage() {
  const navigate = useNavigate();
  const { requestAuth, role, userId } = useAuth();
  const navItems = useMemo(() => getNavForRole(role), [role]);

  const [teams, setTeams] = useState([]);
  const [teamId, setTeamId] = useState('');
  const [reports, setReports] = useState([]);
  const [selectedReportId, setSelectedReportId] = useState('');
  const [verdict, setVerdict] = useState('Approve');
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  function formatReportLabel(report) {
    return `${report.originalFileName || 'Отчет'} · ${report.status}`;
  }

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
      return;
    }

    const data = await analysisApi.listTeamReports(requestAuth, nextTeamId);
    const reportsValue = Array.isArray(data) ? data : [];
    setReports(reportsValue);

    setSelectedReportId((prev) => {
      if (prev && reportsValue.some((report) => report.id === prev)) {
        return prev;
      }
      const assigned = reportsValue.find((report) => report.assignedAuditorUserId === userId);
      return assigned?.id || reportsValue[0]?.id || '';
    });
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await loadTeams();
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
      if (!teamId) {
        setReports([]);
        return;
      }

      try {
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

  const assignedReports = useMemo(
    () => reports.filter((report) => report.assignedAuditorUserId === userId),
    [reports, userId]
  );

  async function handleRunAlgorithm(reportId) {
    setError('');
    setSuccess('');

    try {
      await analysisApi.runAlgorithm(requestAuth, reportId);
      setSuccess('Алгоритм выполнен.');
      await loadReports(teamId);
    } catch (requestError) {
      setError(requestError.message || 'Не удалось запустить алгоритм.');
    }
  }

  async function handleSubmitVerdict(event) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedReportId) {
      setError('Выберите отчет.');
      return;
    }

    setIsBusy(true);
    try {
      await analysisApi.submitVerdict(requestAuth, selectedReportId, {
        verdict,
        comment
      });
      setSuccess('Вердикт отправлен лидеру.');
      await loadReports(teamId);
    } catch (requestError) {
      setError(requestError.message || 'Не удалось отправить вердикт.');
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <PageShell
      title="Кабинет аудитора"
      subtitle="Назначенные файлы, запуск алгоритма, официальный вердикт"
      badge="ROLE: AUDITOR"
      navItems={navItems}
    >
      <div className="panel card">
        <div className="field" style={{ maxWidth: 460 }}>
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

        <div className="grid" style={{ gridTemplateColumns: '1.5fr 1fr' }}>
          <div>
            <h3 style={{ marginTop: 0 }}>Назначенные отчеты</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>Отчет</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assignedReports.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="muted">
                      Для вас пока нет назначенных отчетов.
                    </td>
                  </tr>
                ) : (
                  assignedReports.map((report) => (
                    <tr key={report.id}>
                      <td>{report.originalFileName || 'Отчет'}</td>
                      <td>{report.status}</td>
                      <td>
                        <button className="btn secondary" onClick={() => handleRunAlgorithm(report.id)}>
                          Run Algorithm
                        </button>{' '}
                        <button className="btn" onClick={() => navigate(`/auditor/analysis?reportId=${report.id}`)}>
                          Open
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <form className="panel card" style={{ background: '#171723' }} onSubmit={handleSubmitVerdict}>
            <h3 style={{ marginTop: 0 }}>Вердикт</h3>
            <div className="field">
              <label>Отчет</label>
              <select value={selectedReportId} onChange={(event) => setSelectedReportId(event.target.value)}>
                {assignedReports.length === 0 ? <option value="">Нет отчетов</option> : null}
                {assignedReports.map((report) => (
                  <option key={report.id} value={report.id}>
                    {formatReportLabel(report)}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>verdict</label>
              <select value={verdict} onChange={(event) => setVerdict(event.target.value)}>
                <option value="Approve">Approve</option>
                <option value="Reject">Reject</option>
                <option value="NeedsFixes">NeedsFixes</option>
              </select>
            </div>

            <div className="field">
              <label>comment</label>
              <textarea rows={6} value={comment} onChange={(event) => setComment(event.target.value)} />
            </div>

            <button className="btn" style={{ width: '100%' }} type="submit" disabled={isBusy}>
              {isBusy ? 'Отправляем...' : 'Submit Auditor Verdict'}
            </button>
          </form>
        </div>
      </div>

      {error ? <div className="note note-danger">{error}</div> : null}
      {success ? <div className="note note-ok">{success}</div> : null}
    </PageShell>
  );
}
