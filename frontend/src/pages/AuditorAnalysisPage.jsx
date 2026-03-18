import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageShell from '../components/PageShell';
import { useAuth } from '../context/AuthContext';
import { analysisApi } from '../lib/api';
import { containsText } from '../lib/format';
import { getNavForRole } from '../lib/navigation';

const fieldConfig = [
  { key: 'organizationName', label: 'organizationName' },
  { key: 'inn', label: 'inn' },
  { key: 'reportingPeriod', label: 'reportingPeriod' },
  { key: 'revenue', label: 'revenue' },
  { key: 'expenses', label: 'expenses' },
  { key: 'netProfit', label: 'netProfit' },
  { key: 'assets', label: 'assets' },
  { key: 'liabilities', label: 'liabilities' }
];

function getSeverity(report, fieldKey) {
  const inappropriate = report?.inappropriateItems || [];

  if (containsText(inappropriate, fieldKey)) {
    return 'red';
  }

  if (fieldKey === 'reportingPeriod' && String(report?.reportingPeriod || '').includes('Q')) {
    return 'orange';
  }

  return 'green';
}

export default function AuditorAnalysisPage() {
  const { requestAuth, role, userId } = useAuth();
  const navItems = useMemo(() => getNavForRole(role), [role]);
  const [searchParams] = useSearchParams();

  const [teams, setTeams] = useState([]);
  const [teamId, setTeamId] = useState('');
  const [reports, setReports] = useState([]);
  const [reportId, setReportId] = useState(searchParams.get('reportId') || '');
  const [report, setReport] = useState(null);
  const [verdict, setVerdict] = useState('NeedsFixes');
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  function formatReportLabel(item) {
    return `${item.originalFileName || 'Отчет'} · ${item.status}`;
  }

  const assignedReports = useMemo(
    () => reports.filter((item) => item.assignedAuditorUserId === userId),
    [reports, userId]
  );

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

    setReportId((prev) => {
      if (prev && reportsValue.some((item) => item.id === prev)) {
        return prev;
      }

      const queryReportId = searchParams.get('reportId');
      if (queryReportId && reportsValue.some((item) => item.id === queryReportId)) {
        return queryReportId;
      }

      const firstAssigned = reportsValue.find((item) => item.assignedAuditorUserId === userId);
      return firstAssigned?.id || '';
    });
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
    let active = true;

    (async () => {
      try {
        await loadReport(reportId);
      } catch (requestError) {
        if (active) {
          setError(requestError.message || 'Не удалось загрузить отчет.');
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [reportId]);

  async function handleRunAlgorithm() {
    if (!reportId) {
      setError('Выберите отчет из списка.');
      return;
    }

    setError('');
    setSuccess('');

    try {
      await analysisApi.runAlgorithm(requestAuth, reportId);
      await loadReport(reportId);
      await loadReports(teamId);
      setSuccess('Алгоритм выполнен и обновлен.');
    } catch (requestError) {
      setError(requestError.message || 'Ошибка запуска алгоритма.');
    }
  }

  async function handleSubmitVerdict(event) {
    event.preventDefault();
    if (!reportId) {
      setError('Выберите отчет из списка.');
      return;
    }

    setError('');
    setSuccess('');
    setIsBusy(true);

    try {
      await analysisApi.submitVerdict(requestAuth, reportId, {
        verdict,
        comment
      });
      await loadReport(reportId);
      await loadReports(teamId);
      setSuccess('Официальный вердикт отправлен лидеру.');
    } catch (requestError) {
      setError(requestError.message || 'Не удалось отправить вердикт.');
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <PageShell
      title={`Анализ отчета${report?.originalFileName ? `: ${report.originalFileName}` : ''}`}
      subtitle="Подсветка appropriate/not appropriate и уведомления алгоритма"
      badge="ALGORITHM VIEW"
      navItems={navItems}
    >
      <div className="panel card" style={{ marginBottom: 16 }}>
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
              {assignedReports.length === 0 ? <option value="">Нет назначенных отчетов</option> : null}
              {assignedReports.map((item) => (
                <option key={item.id} value={item.id}>
                  {formatReportLabel(item)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button className="btn" type="button" onClick={handleRunAlgorithm}>
          Запустить алгоритм
        </button>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.1fr 0.9fr' }}>
        <div className="panel card">
          <h3 style={{ marginTop: 0 }}>Поля из Excel</h3>

          {report ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Field</th>
                  <th>Value</th>
                  <th>Severity</th>
                </tr>
              </thead>
              <tbody>
                {fieldConfig.map((field) => {
                  const severity = getSeverity(report, field.key);
                  return (
                    <tr key={field.key}>
                      <td>{field.label}</td>
                      <td>{String(report[field.key] ?? '-')}</td>
                      <td>
                        <span className={`badge severity ${severity}`}>{severity.toUpperCase()}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="muted">Выберите отчет из списка для анализа.</p>
          )}
        </div>

        <div className="panel card">
          <h3 style={{ marginTop: 0 }}>Notifications алгоритма</h3>

          {(report?.inappropriateItems || []).length > 0 ? (
            report.inappropriateItems.map((item, index) => (
              <div key={`${item}-${index}`} className="note note-danger">
                <strong>High:</strong> {item}
              </div>
            ))
          ) : (
            <div className="note note-ok">Inappropriate items не обнаружены.</div>
          )}

          {(report?.appropriateItems || []).length > 0 ? (
            report.appropriateItems.map((item, index) => (
              <div key={`${item}-${index}`} className="note note-ok">
                <strong>OK:</strong> {item}
              </div>
            ))
          ) : (
            <div className="note note-warn">Appropriate items пока отсутствуют.</div>
          )}

          <form onSubmit={handleSubmitVerdict}>
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
              <textarea rows={5} value={comment} onChange={(event) => setComment(event.target.value)} />
            </div>
            <button className="btn" type="submit" disabled={isBusy || !reportId}>
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
