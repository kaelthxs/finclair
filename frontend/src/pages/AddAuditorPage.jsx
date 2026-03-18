import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageShell from '../components/PageShell';
import { useAuth } from '../context/AuthContext';
import { analysisApi, authApi } from '../lib/api';
import { getNavForRole } from '../lib/navigation';

function formatAuditorLabel(auditor) {
  const name = [auditor.firstName, auditor.lastName].filter(Boolean).join(' ').trim();
  const primary = name || auditor.login || auditor.email || 'Аудитор';
  return primary;
}

function formatMemberLabel(member, directoryMap) {
  const profile = directoryMap.get(member.userId);
  const name = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ').trim();
  if (name) {
    return name;
  }
  if (profile?.login) {
    return profile.login;
  }
  if (profile?.email) {
    return profile.email;
  }
  return member.role === 'Leader' || member.role === 'LEADER' ? 'Лидер команды' : 'Аудитор команды';
}

export default function AddAuditorPage() {
  const { requestAuth, role } = useAuth();
  const navItems = useMemo(() => getNavForRole(role), [role]);
  const [searchParams] = useSearchParams();

  const [teams, setTeams] = useState([]);
  const [auditors, setAuditors] = useState([]);
  const [usersDirectory, setUsersDirectory] = useState([]);
  const [teamId, setTeamId] = useState(searchParams.get('teamId') || '');
  const [auditorUserId, setAuditorUserId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const selectedTeam = useMemo(() => teams.find((team) => team.id === teamId) || null, [teams, teamId]);

  const availableAuditors = useMemo(() => {
    const memberIds = new Set((selectedTeam?.members || []).map((member) => member.userId));
    return auditors.filter((auditor) => !memberIds.has(auditor.id));
  }, [selectedTeam, auditors]);

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
      try {
        await Promise.all([loadTeams(), loadAuditors(), loadUsersDirectory()]);
      } catch (requestError) {
        if (mounted) {
          setError(requestError.message || 'Не удалось загрузить список команд/аудиторов.');
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setAuditorUserId((prev) => {
      if (prev && availableAuditors.some((auditor) => auditor.id === prev)) {
        return prev;
      }
      return availableAuditors[0]?.id || '';
    });
  }, [availableAuditors]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!teamId) {
      setError('Выберите команду.');
      return;
    }

    if (!auditorUserId) {
      setError('Выберите аудитора из списка.');
      return;
    }

    setIsSubmitting(true);
    try {
      await analysisApi.addAuditorToTeam(requestAuth, teamId, { auditorUserId });
      setSuccess('Аудитор добавлен в команду.');
      await Promise.all([loadTeams(), loadAuditors(), loadUsersDirectory()]);
    } catch (requestError) {
      setError(requestError.message || 'Не удалось добавить аудитора.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <PageShell
      title="Форма: добавить аудитора в команду"
      subtitle="Выберите команду и аудитора для добавления"
      badge="LEADER ACTION"
      navItems={navItems}
    >
      <div className="panel modal">
        <div className="stepper">
          <div className="step active">1. Выбор команды</div>
          <div className="step active">2. Выбор аудитора</div>
          <div className="step">3. Подтверждение</div>
        </div>

        <form onSubmit={handleSubmit} className="form-row">
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
            <label>Аудитор</label>
            <select value={auditorUserId} onChange={(event) => setAuditorUserId(event.target.value)}>
              {availableAuditors.length === 0 ? <option value="">Нет доступных аудиторов</option> : null}
              {availableAuditors.map((auditor) => (
                <option key={auditor.id} value={auditor.id}>
                  {formatAuditorLabel(auditor)}
                </option>
              ))}
            </select>
          </div>

          <div className="field field-wide" style={{ marginBottom: 0 }}>
            <button className="btn" disabled={isSubmitting || !auditorUserId} type="submit">
              {isSubmitting ? 'Добавляем...' : 'Добавить аудитора'}
            </button>
          </div>
        </form>

        <div className="panel card" style={{ marginTop: 12, background: '#171723' }}>
          <h3 style={{ marginTop: 0 }}>Участники команды</h3>
          {selectedTeam?.members?.length ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Участник</th>
                  <th>Role</th>
                </tr>
              </thead>
              <tbody>
                {selectedTeam.members.map((member) => (
                  <tr key={`${member.userId}-${member.role}`}>
                    <td>{formatMemberLabel(member, usersMap)}</td>
                    <td>{member.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="muted">Нет участников или команда не выбрана.</p>
          )}
        </div>
      </div>

      {error ? <div className="note note-danger">{error}</div> : null}
      {success ? <div className="note note-ok">{success}</div> : null}
    </PageShell>
  );
}
