import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  clearAuthToken,
  loadAuthToken,
  loginRequest,
  registerRequest,
  setAuthToken,
  getGmailLeads,
} from '../api/client';

const AuthContext = createContext();

const LAST_SEEN_LEAD_KEY = 'gradient:lastSeenLeadTime';
const LEAD_SNAPSHOT_KEY = 'gradient:displayedLeadSnapshot';

const readLastSeenLeadTime = () => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(LAST_SEEN_LEAD_KEY);
  } catch (storageError) {
    console.error('Не вдалося зчитати час перегляду листів', storageError);
    return null;
  }
};

const writeLastSeenLeadTime = (isoString) => {
  if (typeof window === 'undefined' || !isoString) return;
  try {
    window.localStorage.setItem(LAST_SEEN_LEAD_KEY, isoString);
  } catch (storageError) {
    console.error('Не вдалося зберегти час перегляду листів', storageError);
  }
};

const clearLastSeenLeadTime = () => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(LAST_SEEN_LEAD_KEY);
  } catch (storageError) {
    console.error('Не вдалося очистити час перегляду листів', storageError);
  }
};

const readLeadSnapshot = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(LEAD_SNAPSHOT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (storageError) {
    console.error('Не вдалося зчитати збережені ліди', storageError);
    return null;
  }
};

const writeLeadSnapshot = (payload) => {
  if (typeof window === 'undefined') return;
  try {
    if (payload) {
      window.localStorage.setItem(LEAD_SNAPSHOT_KEY, JSON.stringify(payload));
    } else {
      window.localStorage.removeItem(LEAD_SNAPSHOT_KEY);
    }
  } catch (storageError) {
    console.error('Не вдалося зберегти ліди', storageError);
  }
};

const parseDateOrNull = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatRelativeTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / (1000 * 60));
  if (minutes < 1) return 'щойно';
  if (minutes < 60) return `${minutes} хв тому`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} год тому`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'вчора';
  if (days < 7) return `${days} дн. тому`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} тиж. тому`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} міс. тому`;
  const years = Math.floor(months / 12);
  return `${years} р. тому`;
};

const formatEmailCountMessage = (count) => {
  if (count === 0) {
    return 'Нових листів немає.';
  }
  if (count === 1) {
    return 'Вам надійшов 1 новий лист.';
  }
  return `Вам надійшло ${count} нових листів.`;
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const notificationTimersRef = useRef({});
  const [leadSnapshot, setLeadSnapshot] = useState(() => readLeadSnapshot());
  const loginSnapshotRef = useRef(null);

  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((item) => item.id !== id));
    const timeoutId = notificationTimersRef.current[id];
    if (timeoutId) {
      clearTimeout(timeoutId);
      delete notificationTimersRef.current[id];
    }
  }, []);

  const pushNotification = useCallback(
    (notification) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const entry = {
        id,
        createdAt: new Date().toISOString(),
        duration: 9000,
        variant: 'info',
        ...notification,
      };
      setNotifications((prev) => [...prev, entry]);

      if (entry.duration !== 0) {
        const timeoutId = setTimeout(() => {
          removeNotification(id);
        }, entry.duration || 9000);
        notificationTimersRef.current[id] = timeoutId;
      }
    },
    [removeNotification]
  );

  useEffect(() => () => {
    Object.values(notificationTimersRef.current).forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    notificationTimersRef.current = {};
  }, []);

  useEffect(() => {
    const storedToken = loadAuthToken();
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  const logout = useCallback(() => {
    clearAuthToken();
    setToken(null);
    setUser(null);
    setError(null);
    setNotifications([]);
    Object.values(notificationTimersRef.current).forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    notificationTimersRef.current = {};
    setLeadSnapshot(null);
    writeLeadSnapshot(null);
    clearLastSeenLeadTime();
  }, []);

  const login = useCallback(async ({ email, password }) => {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        username: email,
        email,
        password,
      };

      const response = await loginRequest(payload);
      const receivedToken = response?.access_token;

      if (!receivedToken) {
        throw new Error('Не вдалося отримати токен доступу.');
      }

      setAuthToken(receivedToken);
      setToken(receivedToken);
      setUser({ email });

      try {
        const leadsPayload = await getGmailLeads();
        const leads = leadsPayload?.leads ?? [];
        const sortedLeads = [...leads]
          .map((lead) => ({
            ...lead,
            _receivedAt: parseDateOrNull(lead.received_at),
          }))
          .filter((lead) => lead._receivedAt)
          .sort((a, b) => b._receivedAt.getTime() - a._receivedAt.getTime());
        const newestLead = sortedLeads[0] ?? null;
        loginSnapshotRef.current = leadsPayload;
        const lastSeenIso = readLastSeenLeadTime();
        const lastSeenDate = parseDateOrNull(lastSeenIso);
        const newLeadCount = sortedLeads.reduce((acc, lead) => {
          if (!lastSeenDate) {
            return acc + 1;
          }
          return lead._receivedAt > lastSeenDate ? acc + 1 : acc;
        }, 0);

        if (newestLead) {
          const relative = formatRelativeTime(newestLead.received_at);
          pushNotification({
            variant: newLeadCount ? 'success' : 'info',
            title: newLeadCount ? 'Вам надійшли нові листи' : 'Нові листи відсутні',
            message: newLeadCount
              ? `${formatEmailCountMessage(newLeadCount)}${relative ? ` Останній отримано ${relative}.` : ''}`
              : relative
              ? `Останній лист отримано ${relative}.`
              : 'Вхідні актуальні, ви нічого не пропустили.',
            duration: 0,
          });
        } else {
          pushNotification({
            variant: 'info',
            title: 'Вхідні порожні',
            message: 'Наразі у вас немає листів для обробки.',
            duration: 0,
          });
        }
      } catch (notifyError) {
        console.error('Не вдалося завантажити інформацію про листи після входу', notifyError);
      }

      return { success: true };
    } catch (err) {
      const message = err?.message || 'Помилка авторизації.';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, [pushNotification]);

  const register = useCallback(async ({ email, password }) => {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        username: email,
        email,
        password,
      };

      const response = await registerRequest(payload);
      
      if (!response?.message) {
        throw new Error('Не вдалося створити акаунт.');
      }

      pushNotification({
        variant: 'success',
        title: 'Акаунт створено',
        message: 'Тепер ви можете увійти в систему.',
      });

      return { success: true };
    } catch (err) {
      const message = err?.message || 'Помилка реєстрації.';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, [pushNotification]);

  const updateLeadSnapshot = useCallback(
    (payload, { isManualRefresh = false } = {}) => {
      const snapshot = payload ?? loginSnapshotRef.current ?? null;
      setLeadSnapshot(snapshot);
      writeLeadSnapshot(snapshot);

      const leadsArray = snapshot?.leads ?? [];
      const newestDisplayed = leadsArray
        .map((lead) => parseDateOrNull(lead.received_at))
        .filter(Boolean)
        .sort((a, b) => b.getTime() - a.getTime())[0];

      if (newestDisplayed) {
        writeLastSeenLeadTime(newestDisplayed.toISOString());
      } else if (snapshot) {
        writeLastSeenLeadTime(new Date().toISOString());
      }

      if (isManualRefresh) {
        loginSnapshotRef.current = snapshot;
      }
    },
    []
  );

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      error,
      isAuthenticated: Boolean(token),
      login,
      register,
      logout,
      clearError: () => setError(null),
      notifications,
      pushNotification,
      removeNotification,
      leadSnapshot,
      updateLeadSnapshot,
    }),
    [
      token,
      user,
      loading,
      error,
      login,
      register,
      logout,
      notifications,
      pushNotification,
      removeNotification,
      leadSnapshot,
      updateLeadSnapshot,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth мусить використовуватися всередині AuthProvider');
  }
  return context;
};
