import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="canvas" style={{ display: 'grid', placeItems: 'center' }}>
      <div className="panel card" style={{ maxWidth: 520, textAlign: 'center' }}>
        <h1 style={{ marginTop: 0 }}>404</h1>
        <p className="muted">Страница не найдена.</p>
        <Link className="btn" to="/workflow">
          Перейти к workflow
        </Link>
      </div>
    </div>
  );
}
