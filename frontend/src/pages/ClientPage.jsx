import { useCallback, useEffect, useMemo, useState } from 'react';
import PageShell from '../components/PageShell';
import { useAuth } from '../context/AuthContext';
import { analysisApi } from '../lib/api';
import { formatDateTime } from '../lib/format';
import { getNavForRole } from '../lib/navigation';

function normalizeTeamItem(raw) {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const id = raw.id || raw.Id;
  const name = raw.name || raw.Name;
  const leaderUserId = raw.leaderUserId || raw.LeaderUserId || '';
  const createdAtUtc = raw.createdAtUtc || raw.CreatedAtUtc || null;

  if (!id || !name) {
    return null;
  }

  return {
    id: String(id),
    name: String(name),
    leaderUserId: String(leaderUserId),
    createdAtUtc
  };
}

function normalizeTeamList(payload) {
  const source = Array.isArray(payload)
    ? payload
    : payload?.items || payload?.teams || payload?.data || payload?.$values || [];

  if (!Array.isArray(source)) {
    return [];
  }

  return source
    .map(normalizeTeamItem)
    .filter(Boolean);
}

export default function ClientPage() {
  const { requestAuth, role } = useAuth();
  const navItems = useMemo(() => getNavForRole(role), [role]);

  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [file, setFile] = useState(null);
  const [myReports, setMyReports] = useState([]);
  const [isLoadingTeams, setIsLoadingTeams] = useState(true);
  const [isLoadingReports, setIsLoadingReports] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadTeams = useCallback(
    async (silent = false) => {
      if (!silent) {
        setIsLoadingTeams(true);
      }

      let primaryError = null;
      let teamsValue = [];

      try {
        const data = await analysisApi.listTeamCatalog(requestAuth);
        teamsValue = normalizeTeamList(data);
      } catch (requestError) {
        primaryError = requestError;
      }

      if (teamsValue.length === 0) {
        try {
          const fallbackData = await analysisApi.listMyTeams(requestAuth);
          teamsValue = normalizeTeamList(fallbackData);
        } catch (fallbackError) {
          if (!primaryError) {
            primaryError = fallbackError;
          }
        }
      }

      setTeams(teamsValue);
      setSelectedTeamId((prev) => {
        if (prev && teamsValue.some((team) => team.id === prev)) {
          return prev;
        }
        return teamsValue[0]?.id || '';
      });

      if (teamsValue.length === 0) {
        if (primaryError) {
          setError(primaryError.message || 'Не удалось загрузить список команд.');
        } else {
          setError('Нет доступных команд. Лидер должен сначала создать команду.');
        }
      } else {
        setError('');
      }

      if (!silent) {
        setIsLoadingTeams(false);
      }
    },
    [requestAuth]
  );

  const loadMyReports = useCallback(
    async (silent = false) => {
      if (!silent) {
        setIsLoadingReports(true);
      }

      try {
        const data = await analysisApi.listMyReports(requestAuth);
        setMyReports(Array.isArray(data) ? data : []);
      } catch (requestError) {
        setError(requestError.message || 'Не удалось загрузить ваши отчеты.');
      } finally {
        if (!silent) {
          setIsLoadingReports(false);
        }
      }
    },
    [requestAuth]
  );

  useEffect(() => {
    loadTeams();
    loadMyReports();
  }, [loadTeams, loadMyReports]);

  async function handleUpload(event) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedTeamId) {
      setError('Выберите команду из списка.');
      return;
    }

    if (!file) {
      setError('Выберите Excel-файл для загрузки.');
      return;
    }

    setIsBusy(true);
    try {
      await analysisApi.uploadReport(requestAuth, selectedTeamId, file);
      await loadMyReports(true);
      setSuccess('Файл успешно загружен.');
      setFile(null);
      event.target.reset();
    } catch (requestError) {
      setError(requestError.message || 'Не удалось загрузить файл.');
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <PageShell
      title="Кабинет клиента"
      subtitle="Выбор команды и загрузка Excel-отчета (.xlsx/.xls)"
      badge="ROLE: CLIENT"
      navItems={navItems}
    >
      <div className="grid" style={{ gridTemplateColumns: '1.2fr 1fr' }}>
        <form className="panel card" onSubmit={handleUpload}>
          <h3 style={{ marginTop: 0 }}>Загрузка отчета</h3>

          <div className="field">
            <label>Команда</label>
            <div className="inline-actions">
              <select
                value={selectedTeamId}
                onChange={(event) => setSelectedTeamId(event.target.value)}
                disabled={isLoadingTeams}
              >
                <option value="">{isLoadingTeams ? 'Загрузка...' : 'Выберите команду'}</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
              <button type="button" className="btn secondary" onClick={() => loadTeams(true)} disabled={isLoadingTeams}>
                Обновить
              </button>
            </div>
            {teams.length === 0 && !isLoadingTeams ? (
              <div className="muted tiny" style={{ marginTop: 6 }}>
                Лидер должен создать хотя бы одну команду, после чего обновите список.
              </div>
            ) : null}
          </div>

          <div className="upload-dropzone">
            <div style={{ fontWeight: 600 }}>Перетащите файл сюда</div>
            <div className="muted tiny" style={{ marginTop: 6 }}>
              или нажмите "Выбрать файл"
            </div>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
              required
              style={{ marginTop: 12 }}
            />
          </div>

          {file ? <div className="badge">{file.name}</div> : null}

          <button className="btn" type="submit" disabled={isBusy || isLoadingTeams}>
            {isBusy ? 'Загружаем...' : 'Upload'}
          </button>
        </form>

        <div className="panel card">
          <div className="table-header-row">
            <h3 style={{ margin: 0 }}>Мои отчеты и решения лидера</h3>
            <button
              type="button"
              className="btn secondary"
              onClick={() => loadMyReports()}
              disabled={isLoadingReports}
            >
              Обновить
            </button>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Отчет</th>
                <th>Status</th>
                <th>Auditor Comment</th>
                <th>Leader Comment</th>
                <th>Uploaded</th>
              </tr>
            </thead>
            <tbody>
              {myReports.length === 0 ? (
                <tr>
                  <td colSpan={5} className="muted">
                    {isLoadingReports ? 'Загрузка...' : 'Пока нет отчетов.'}
                  </td>
                </tr>
              ) : (
                myReports.map((item) => (
                  <tr key={item.id}>
                    <td>{item.originalFileName || 'Файл отчета'}</td>
                    <td>{item.status}</td>
                    <td>{item.auditorVerdictComment || '-'}</td>
                    <td>{item.leaderDecisionComment || '-'}</td>
                    <td>{formatDateTime(item.uploadedAtUtc)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {error ? <div className="note note-danger">{error}</div> : null}
      {success ? <div className="note note-ok">{success}</div> : null}
    </PageShell>
  );
}
