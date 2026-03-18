import { NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function PageShell({ title, subtitle, badge, navItems = [], children }) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  async function handleConfirmLogout() {
    await logout();
    setShowLogoutConfirm(false);
    navigate('/auth', { replace: true });
  }

  return (
    <div className="canvas">
      <div className="topbar">
        <div>
          <h1 className="title">{title}</h1>
          {subtitle ? <p className="subtitle">{subtitle}</p> : null}
        </div>
        <div className="topbar-actions">
          {badge ? <span className="badge">{badge}</span> : null}
          <button className="btn secondary logout-btn" onClick={() => setShowLogoutConfirm(true)}>
            <span className="logout-icon">⎋</span>
            <span>Выйти</span>
          </button>
        </div>
      </div>

      {navItems.length > 0 ? (
        <div className="tabs page-tabs">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `tab nav-tab ${isActive ? 'active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      ) : null}

      {children}

      {showLogoutConfirm ? (
        <div className="logout-overlay demo" role="dialog" aria-modal="true">
          <div className="panel logout-modal">
            <h3>Подтвердить выход?</h3>
            <p className="muted">Текущая сессия будет завершена. Несохраненные изменения могут быть потеряны.</p>
            <div className="logout-actions">
              <button className="btn secondary" onClick={() => setShowLogoutConfirm(false)}>
                Отмена
              </button>
              <button className="btn" onClick={handleConfirmLogout}>
                Выйти
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
