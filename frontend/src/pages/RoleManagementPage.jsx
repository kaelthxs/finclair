import { useEffect, useMemo, useState } from 'react';
import PageShell from '../components/PageShell';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../lib/api';
import { getNavForRole } from '../lib/navigation';

export default function RoleManagementPage() {
  const { requestAuth, role } = useAuth();
  const navItems = useMemo(() => getNavForRole(role), [role]);

  const [roles, setRoles] = useState([]);
  const [name, setName] = useState('AUDITOR');
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function loadRoles() {
    const data = await authApi.listRoles(requestAuth);
    setRoles(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        await loadRoles();
      } catch (requestError) {
        if (mounted) {
          setError(requestError.message || 'Не удалось загрузить роли.');
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  async function handleCreateRole(event) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setIsBusy(true);

    try {
      await authApi.createRole(requestAuth, { name });
      setSuccess('Роль создана.');
      await loadRoles();
    } catch (requestError) {
      setError(requestError.message || 'Не удалось создать роль.');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDeleteRole(roleId) {
    setError('');
    setSuccess('');

    try {
      await authApi.deleteRole(requestAuth, roleId);
      setSuccess('Роль удалена.');
      await loadRoles();
    } catch (requestError) {
      setError(requestError.message || 'Не удалось удалить роль.');
    }
  }

  return (
    <PageShell
      title="Управление ролями"
      subtitle="Refresh access token выполняется автоматически. Logout через кнопку в хедере."
      badge="SYSTEM TOOLS"
      navItems={navItems}
    >
      <div className="grid" style={{ gridTemplateColumns: '1.2fr 0.8fr' }}>
        <div className="panel card">
          <h3 style={{ marginTop: 0 }}>Role Management</h3>

          <form onSubmit={handleCreateRole} className="inline-actions" style={{ marginBottom: 12 }}>
            <div className="field" style={{ marginBottom: 0, flex: 1 }}>
              <label>Role name</label>
              <input value={name} onChange={(event) => setName(event.target.value)} required />
            </div>
            <button className="btn" type="submit" disabled={isBusy}>
              Создать роль
            </button>
          </form>

          <table className="table">
            <thead>
              <tr>
                <th>Role</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {roles.length === 0 ? (
                <tr>
                  <td colSpan={2} className="muted">
                    Ролей пока нет.
                  </td>
                </tr>
              ) : (
                roles.map((roleItem) => (
                  <tr key={roleItem.id}>
                    <td>{roleItem.name}</td>
                    <td>
                      <button className="btn secondary" onClick={() => handleDeleteRole(roleItem.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="panel card" style={{ background: '#171723' }}>
          <h3 style={{ marginTop: 0 }}>Auth behavior</h3>
          <div className="note note-ok">Access token обновляется автоматически через refresh-token flow.</div>
          <div className="note note-ok">Пользователь не вводит refresh token вручную в UI.</div>
          <div className="note note-warn">Кнопка "Выйти" есть в хедере каждого экрана.</div>
        </div>
      </div>

      {error ? <div className="note note-danger">{error}</div> : null}
      {success ? <div className="note note-ok">{success}</div> : null}
    </PageShell>
  );
}
