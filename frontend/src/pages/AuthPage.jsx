import { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getHomeRouteForRole } from '../lib/roles';

const registerInitial = {
  login: '',
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  preferredLanguage: 'ru',
  roleName: 'CLIENT'
};

export default function AuthPage() {
  const navigate = useNavigate();
  const { isAuthenticated, role, login, register } = useAuth();

  const [activeTab, setActiveTab] = useState('login');
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [loginForm, setLoginForm] = useState({
    identifier: '',
    password: ''
  });

  const [registerForm, setRegisterForm] = useState(registerInitial);

  const homeRoute = useMemo(() => getHomeRouteForRole(role), [role]);

  if (isAuthenticated) {
    return <Navigate to={homeRoute} replace />;
  }

  async function submitLogin(event) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setIsBusy(true);

    try {
      const nextSession = await login(loginForm);
      const nextRole = (nextSession.claims?.role || '').toUpperCase();
      navigate(getHomeRouteForRole(nextRole), { replace: true });
    } catch (requestError) {
      setError(requestError.message || 'Ошибка входа.');
    } finally {
      setIsBusy(false);
    }
  }

  async function submitRegister(event) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setIsBusy(true);

    try {
      await register(registerForm);
      setSuccess('Регистрация выполнена. Теперь войдите под созданным пользователем.');
      setActiveTab('login');
      setLoginForm({ identifier: registerForm.email, password: registerForm.password });
    } catch (requestError) {
      setError(requestError.message || 'Ошибка регистрации.');
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="canvas auth-canvas">
      <div className="topbar">
        <div className="brand">
          <div className="brand-mark" />
          <span>Finclair</span>
        </div>
        <div className="topbar-actions">
          <span className="badge">AUTH SERVICE</span>
        </div>
      </div>

      <div className="panel auth-panel">
        <div className="auth-left">
          <h1 className="title">Доступ к платформе</h1>
          <p className="subtitle">Анализ, верификация и аудит финансовой отчетности</p>

          <div className="tabs" style={{ marginTop: 18 }}>
            <button
              type="button"
              className={`tab ${activeTab === 'login' ? 'active' : ''}`}
              onClick={() => setActiveTab('login')}
            >
              Вход
            </button>
            <button
              type="button"
              className={`tab ${activeTab === 'register' ? 'active' : ''}`}
              onClick={() => setActiveTab('register')}
            >
              Регистрация
            </button>
          </div>

          {activeTab === 'login' ? (
            <form onSubmit={submitLogin} className="form-block">
              <div className="field">
                <label>identifier (email или login)</label>
                <input
                  required
                  value={loginForm.identifier}
                  onChange={(event) => setLoginForm((prev) => ({ ...prev, identifier: event.target.value }))}
                  placeholder="leader@example.com"
                />
              </div>

              <div className="field">
                <label>password</label>
                <input
                  type="password"
                  required
                  value={loginForm.password}
                  onChange={(event) => setLoginForm((prev) => ({ ...prev, password: event.target.value }))}
                />
              </div>

              <button disabled={isBusy} className="btn" type="submit">
                {isBusy ? 'Входим...' : 'Войти'}
              </button>

              <p className="muted tiny" style={{ marginTop: 10 }}>
                Access token обновляется автоматически через refresh flow.
              </p>
            </form>
          ) : (
            <form onSubmit={submitRegister} className="form-block">
              <div className="grid two-col">
                <div className="field">
                  <label>login</label>
                  <input
                    required
                    value={registerForm.login}
                    onChange={(event) => setRegisterForm((prev) => ({ ...prev, login: event.target.value }))}
                  />
                </div>
                <div className="field">
                  <label>email</label>
                  <input
                    type="email"
                    required
                    value={registerForm.email}
                    onChange={(event) => setRegisterForm((prev) => ({ ...prev, email: event.target.value }))}
                  />
                </div>
                <div className="field">
                  <label>password</label>
                  <input
                    type="password"
                    required
                    value={registerForm.password}
                    onChange={(event) => setRegisterForm((prev) => ({ ...prev, password: event.target.value }))}
                  />
                </div>
                <div className="field">
                  <label>preferredLanguage</label>
                  <select
                    value={registerForm.preferredLanguage}
                    onChange={(event) =>
                      setRegisterForm((prev) => ({ ...prev, preferredLanguage: event.target.value }))
                    }
                  >
                    <option value="ru">ru</option>
                    <option value="en">en</option>
                  </select>
                </div>
                <div className="field">
                  <label>firstName</label>
                  <input
                    required
                    value={registerForm.firstName}
                    onChange={(event) => setRegisterForm((prev) => ({ ...prev, firstName: event.target.value }))}
                  />
                </div>
                <div className="field">
                  <label>lastName</label>
                  <input
                    required
                    value={registerForm.lastName}
                    onChange={(event) => setRegisterForm((prev) => ({ ...prev, lastName: event.target.value }))}
                  />
                </div>
                <div className="field field-wide">
                  <label>roleName</label>
                  <select
                    value={registerForm.roleName}
                    onChange={(event) => setRegisterForm((prev) => ({ ...prev, roleName: event.target.value }))}
                  >
                    <option value="LEADER">LEADER</option>
                    <option value="AUDITOR">AUDITOR</option>
                    <option value="CLIENT">CLIENT</option>
                    <option value="USER">USER</option>
                  </select>
                </div>
              </div>

              <button disabled={isBusy} className="btn" type="submit">
                {isBusy ? 'Регистрируем...' : 'Создать аккаунт'}
              </button>
            </form>
          )}

          {error ? <div className="note note-danger">{error}</div> : null}
          {success ? <div className="note note-ok">{success}</div> : null}
        </div>

        <div className="auth-right">
          <h2 style={{ marginTop: 0 }}>Навигация после входа</h2>
          <ul className="muted list">
            <li>LEADER: команды, назначение, финальный approve</li>
            <li>AUDITOR: алгоритм + официальный вердикт</li>
            <li>CLIENT: загрузка Excel отчета</li>
          </ul>

          <div className="note note-ok">Logout доступен в хедере каждого защищенного экрана.</div>
          <Link className="btn secondary" to="/workflow">
            Открыть общий workflow
          </Link>
        </div>
      </div>
    </div>
  );
}
