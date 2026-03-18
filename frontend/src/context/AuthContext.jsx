import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { API_BASES, STORAGE_KEYS } from '../lib/config';
import { decodeJwtPayload, getRoleFromToken, isTokenExpiringSoon } from '../lib/jwt';

const AuthContext = createContext(null);

function parseStoredSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.session);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (!parsed?.accessToken || !parsed?.refreshToken) {
      return null;
    }

    return {
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
      claims: decodeJwtPayload(parsed.accessToken) || {}
    };
  } catch {
    return null;
  }
}

function makeSession(tokens) {
  if (!tokens?.accessToken || !tokens?.refreshToken) {
    return null;
  }

  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    claims: decodeJwtPayload(tokens.accessToken) || {}
  };
}

async function readResponse(response) {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function toError(response, payload) {
  let message = `HTTP ${response.status}`;

  if (typeof payload === 'string' && payload.trim()) {
    message = payload.trim();
  } else if (payload && typeof payload === 'object') {
    if (typeof payload.message === 'string' && payload.message.trim()) {
      message = payload.message.trim();
    } else if (typeof payload.title === 'string' && payload.title.trim()) {
      message = payload.title.trim();
    } else if (Array.isArray(payload.errors)) {
      message = payload.errors.join('; ');
    }
  }

  const error = new Error(message);
  error.status = response.status;
  error.payload = payload;
  return error;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => parseStoredSession());
  const sessionRef = useRef(session);
  const refreshPromiseRef = useRef(null);

  useEffect(() => {
    sessionRef.current = session;
    if (!session) {
      localStorage.removeItem(STORAGE_KEYS.session);
      return;
    }

    localStorage.setItem(
      STORAGE_KEYS.session,
      JSON.stringify({
        accessToken: session.accessToken,
        refreshToken: session.refreshToken
      })
    );
  }, [session]);

  const request = useCallback(async ({ service, path, method = 'GET', body, headers = {}, accessToken }) => {
    const url = `${API_BASES[service]}${path}`;
    const requestHeaders = { ...headers };
    let requestBody = body;

    if (accessToken) {
      requestHeaders.Authorization = `Bearer ${accessToken}`;
    }

    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    if (!isFormData && body !== undefined && body !== null && typeof body !== 'string') {
      requestHeaders['Content-Type'] = requestHeaders['Content-Type'] || 'application/json';
      requestBody = JSON.stringify(body);
    }

    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: method === 'GET' || method === 'HEAD' ? undefined : requestBody
    });

    const payload = await readResponse(response);

    if (!response.ok) {
      throw toError(response, payload);
    }

    return payload;
  }, []);

  const refreshTokens = useCallback(async () => {
    const current = sessionRef.current;
    if (!current?.refreshToken) {
      throw new Error('Refresh token отсутствует.');
    }

    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    refreshPromiseRef.current = (async () => {
      const tokens = await request({
        service: 'auth',
        path: '/auth/refresh',
        method: 'POST',
        body: { refreshToken: current.refreshToken }
      });

      const nextSession = makeSession(tokens);
      if (!nextSession) {
        throw new Error('Не удалось обновить сессию.');
      }

      setSession(nextSession);
      return nextSession;
    })()
      .catch((error) => {
        setSession(null);
        throw error;
      })
      .finally(() => {
        refreshPromiseRef.current = null;
      });

    return refreshPromiseRef.current;
  }, [request]);

  const ensureAccessToken = useCallback(async () => {
    const current = sessionRef.current;
    if (!current?.accessToken) {
      return null;
    }

    if (!isTokenExpiringSoon(current.accessToken, 60)) {
      return current.accessToken;
    }

    const refreshed = await refreshTokens();
    return refreshed.accessToken;
  }, [refreshTokens]);

  const requestPublic = useCallback(
    async (service, path, options = {}) => {
      return request({ service, path, ...options });
    },
    [request]
  );

  const requestAuth = useCallback(
    async (service, path, options = {}) => {
      const accessToken = await ensureAccessToken();
      if (!accessToken) {
        throw new Error('Нужна авторизация.');
      }

      try {
        return await request({ service, path, ...options, accessToken });
      } catch (error) {
        if (error?.status !== 401) {
          throw error;
        }

        const refreshed = await refreshTokens();
        return request({ service, path, ...options, accessToken: refreshed.accessToken });
      }
    },
    [ensureAccessToken, refreshTokens, request]
  );

  const register = useCallback(
    async (payload) => {
      return requestPublic('auth', '/auth/register', {
        method: 'POST',
        body: payload
      });
    },
    [requestPublic]
  );

  const login = useCallback(
    async (payload) => {
      const tokens = await requestPublic('auth', '/auth/login', {
        method: 'POST',
        body: payload
      });
      const nextSession = makeSession(tokens);
      if (!nextSession) {
        throw new Error('Некорректный ответ login.');
      }

      setSession(nextSession);
      return nextSession;
    },
    [requestPublic]
  );

  const logout = useCallback(async () => {
    const current = sessionRef.current;

    try {
      if (current?.refreshToken) {
        await requestPublic('auth', '/auth/logout', {
          method: 'POST',
          body: { refreshToken: current.refreshToken }
        });
      }
    } catch {
      // deliberately ignored: local session must be cleared anyway
    } finally {
      setSession(null);
    }
  }, [requestPublic]);

  useEffect(() => {
    if (!session?.refreshToken) {
      return;
    }

    const timer = window.setInterval(async () => {
      const current = sessionRef.current;
      if (!current?.accessToken) {
        return;
      }

      if (!isTokenExpiringSoon(current.accessToken, 120)) {
        return;
      }

      try {
        await refreshTokens();
      } catch {
        // logout path is handled inside refreshTokens
      }
    }, 30_000);

    return () => window.clearInterval(timer);
  }, [session?.refreshToken, refreshTokens]);

  const value = useMemo(() => {
    const role = getRoleFromToken(session?.accessToken);

    return {
      session,
      claims: session?.claims || null,
      role,
      userId: session?.claims?.sub || null,
      isAuthenticated: Boolean(session?.accessToken && session?.refreshToken),
      register,
      login,
      logout,
      requestPublic,
      requestAuth
    };
  }, [session, register, login, logout, requestPublic, requestAuth]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth должен использоваться внутри AuthProvider');
  }

  return context;
}
