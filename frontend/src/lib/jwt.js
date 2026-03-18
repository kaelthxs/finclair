function base64UrlDecode(value) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4 || 4)) % 4);
  return atob(padded);
}

export function decodeJwtPayload(token) {
  if (!token || typeof token !== 'string') {
    return null;
  }

  const parts = token.split('.');
  if (parts.length < 2) {
    return null;
  }

  try {
    return JSON.parse(base64UrlDecode(parts[1]));
  } catch {
    return null;
  }
}

export function getRoleFromToken(token) {
  const payload = decodeJwtPayload(token);
  const role = payload?.role;
  return typeof role === 'string' ? role.toUpperCase() : null;
}

export function isTokenExpired(token, skewSeconds = 0) {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) {
    return true;
  }
  const now = Math.floor(Date.now() / 1000);
  return payload.exp <= now + skewSeconds;
}

export function isTokenExpiringSoon(token, withinSeconds = 60) {
  return isTokenExpired(token, withinSeconds);
}
