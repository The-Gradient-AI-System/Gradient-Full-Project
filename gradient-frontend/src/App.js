import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import styled, { ThemeProvider } from 'styled-components';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import AnalyticsManager from './pages/AnalyticsManager';
import Automation from './pages/Automation';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import ManagerManagement from './pages/ManagerManagement';
import LeadProfile from './pages/LeadProfile';
import LeadsHistory from './pages/LeadsHistory';
import Login from './pages/Login';
import './App.css';
import { lightTheme, darkTheme } from './styles/theme';
import { ThemeProviderWrapper, ThemeContext } from './context/ThemeContext';
import { GlobalStyle } from './styles/GlobalStyle';
import { useAuth } from './context/AuthContext';

const AppContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: ${({ theme }) => theme.colors.surface};
  transition: background-color 0.3s ease;
`;

const MainLayout = styled.div`
  display: flex;
  flex-grow: 1;
  /* allow page-level scrolling, do not clip children */
  overflow: visible;
`;

const ContentContainer = styled.main`
  flex-grow: 1;
  padding: 2rem;
  /* stretch to full available width next to the Sidebar */
  max-width: none;
  margin: 0;
  /* let the document scroll instead of inner container */
  overflow: visible;
`;

const NotificationHost = styled.div`
  position: fixed;
  right: clamp(1rem, 3vw, 2.4rem);
  bottom: clamp(1rem, 3vw, 2.4rem);
  display: flex;
  flex-direction: column;
  gap: 1rem;
  z-index: 140;
  pointer-events: none;
`;

const NotificationCard = styled.article`
  min-width: 280px;
  max-width: min(420px, 80vw);
  background: ${({ theme }) => theme.colors.cardBackground};
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 24px 48px rgba(6, 8, 22, 0.45);
  padding: 1.1rem 1.2rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  pointer-events: auto;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    border: 1px solid
      ${({ $variant, theme }) => {
        const palette = {
          success: 'rgba(74, 222, 128, 0.45)',
          warning: 'rgba(250, 204, 21, 0.45)',
          error: 'rgba(248, 113, 113, 0.45)',
          info: 'rgba(111, 125, 255, 0.45)',
        };
        return palette[$variant] || 'rgba(111, 125, 255, 0.32)';
      }};
    opacity: 0.6;
    pointer-events: none;
  }
`;

const NotificationHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
`;

const NotificationTitle = styled.h5`
  margin: 0;
  font-size: 1rem;
  letter-spacing: -0.01em;
`;

const NotificationBody = styled.p`
  margin: 0;
  font-size: 0.92rem;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.subtleText};
`;

const NotificationTime = styled.span`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.subtleText};
`;

const NotificationClose = styled.button`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: transparent;
  color: ${({ theme }) => theme.colors.subtleText};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  line-height: 1;
  font-weight: 300;
  cursor: pointer;
  transition: background 0.2s ease, border 0.2s ease, color 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    color: ${({ theme }) => theme.colors.text};
    border-color: rgba(255, 255, 255, 0.22);
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary || '#6f7dff'};
    outline-offset: 2px;
  }
`;

const formatNotificationTime = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  if (minutes < 1) return 'щойно';
  if (minutes < 60) return `${minutes} хв тому`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} год тому`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'вчора';
  if (days < 7) return `${days} дн. тому`;
  return new Intl.DateTimeFormat('uk-UA', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const AppNotifications = () => {
  const { notifications, removeNotification } = useAuth();

  if (!notifications.length) {
    return null;
  }

  return (
    <NotificationHost>
      {notifications.map((notification) => (
        <NotificationCard key={notification.id} $variant={notification.variant || 'info'}>
          <NotificationHeader>
            <NotificationTitle>{notification.title || 'Сповіщення'}</NotificationTitle>
            <NotificationClose
              type="button"
              aria-label="Закрити сповіщення"
              onClick={() => removeNotification(notification.id)}
            >
              ×
            </NotificationClose>
          </NotificationHeader>
          {notification.message && <NotificationBody>{notification.message}</NotificationBody>}
          <NotificationTime>{formatNotificationTime(notification.createdAt)}</NotificationTime>
        </NotificationCard>
      ))}
    </NotificationHost>
  );
};

const AppLayout = () => (
  <AppContainer>
    <Header />
    <MainLayout>
      <ContentContainer>
        <Outlet />
      </ContentContainer>
      <Sidebar />
    </MainLayout>
    <AppNotifications />
  </AppContainer>
);

const ProtectedRoute = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <AppLayout />;
};

function InnerApp() {
  const { themeMode } = useContext(ThemeContext);
  const theme = themeMode === 'light' ? lightTheme : darkTheme;

  return (
    <ThemeProvider theme={theme}>
      <GlobalStyle />
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<AnalyticsManager />} />
            <Route path="/work-zone" element={<Automation />} />
            <Route path="/automation" element={<Navigate to="/work-zone" replace />} />
            <Route path="/lead/:email" element={<LeadProfile />} />
            <Route path="/leads-history" element={<LeadsHistory />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/manager-management" element={<ManagerManagement />} />
          </Route>
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

function App() {
  return (
    <ThemeProviderWrapper>
      <InnerApp />
    </ThemeProviderWrapper>
  );
}

export default App;

