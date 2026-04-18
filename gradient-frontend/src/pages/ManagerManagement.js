import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import {
  createManager,
  deleteManager,
  getManagers,
  setManagerStatus,
} from '../api/client';

const PageWrapper = styled.section`
  width: 100%;
  display: flex;
  justify-content: center;
  padding: 3rem 2.5rem 4.5rem;

  @media (max-width: 720px) {
    padding: 2.4rem 1.25rem 3.2rem;
  }
`;

const PanelGrid = styled.section`
  width: min(1150px, 100%);
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
  gap: 2.4rem;
`;

const Panel = styled.div`
  background: ${({ theme }) => theme.colors.cardBackground};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 28px;
  box-shadow: 0 20px 44px ${({ theme }) => theme.colors.shadow};
  padding: clamp(2.2rem, 3vw, 3.1rem);
  display: flex;
  flex-direction: column;
  gap: 1.7rem;
`;

const PanelTitle = styled.h2`
  margin: 0;
  font-size: 1.55rem;
  font-weight: 600;
  text-align: center;
  color: ${({ theme }) => theme.colors.text};
`;

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
`;

const FieldLabel = styled.label`
  font-size: 0.95rem;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const InputRow = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const FieldInput = styled.input`
  width: 100%;
  padding: 0.95rem 1.1rem;
  border-radius: 18px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => (theme.mode === 'light' ? '#f8fbff' : 'rgba(12, 17, 34, 0.88)')};
  color: ${({ theme }) => theme.colors.text};
  font-size: 1.02rem;

  &:focus {
    outline: none;
    border-color: rgba(104, 125, 255, 0.85);
    box-shadow: 0 0 0 2px rgba(104, 125, 255, 0.2);
  }
`;

const ToggleVisibility = styled.button`
  position: absolute;
  right: 14px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.textSecondary};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.2rem;
`;

const PrimaryButton = styled.button`
  align-self: center;
  padding: 0.95rem 2.2rem;
  border-radius: 999px;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
  background: ${({ theme }) => `linear-gradient(135deg, ${theme.colors.primary} 0%, #7b6bff 100%)`};
  color: #fff;
  box-shadow: 0 14px 26px rgba(75, 163, 255, 0.3);
  transition: opacity 0.18s ease;

  &:hover {
    opacity: 0.92;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`;

const ListItem = styled.div`
  display: grid;
  grid-template-columns: 48px 1fr auto;
  gap: 1rem;
  align-items: center;
`;

const AvatarCircle = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => (theme.mode === 'light' ? '#eef2ff' : 'rgba(255,255,255,0.08)')};
  color: ${({ theme }) => theme.colors.text};
  font-weight: 600;
`;

const EmployeeInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;

  h4 {
    margin: 0;
    font-size: 1.02rem;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text};
  }

  span {
    font-size: 0.9rem;
    color: ${({ theme }) => theme.colors.textSecondary};
  }
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.9rem;
  align-items: center;
  justify-content: flex-end;

  button {
    border: none;
    background: transparent;
    cursor: pointer;
    padding: 0;
    font-size: 0.86rem;
    color: ${({ theme }) => theme.colors.textSecondary};

    &:hover {
      color: ${({ theme }) => theme.colors.text};
    }
  }

  button.danger {
    color: #ff4d4f;

    &:hover {
      opacity: 0.9;
    }
  }
`;

const Banner = styled.p`
  margin: 0;
  font-size: 0.92rem;
  color: ${({ $error, theme }) => ($error ? '#ff4d4f' : theme.colors.textSecondary)};
`;

const initialForm = { username: '', email: '', password: '' };

const ManagerManagement = () => {
  const { user } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [managersLoading, setManagersLoading] = useState(false);
  const [managers, setManagers] = useState([]);
  const [message, setMessage] = useState(null);

  const isAdmin = user?.role === 'admin';

  const avatarText = useMemo(() => {
    const name = (value) => (value || '').trim();
    return (manager) => {
      const username = name(manager?.username);
      if (username) {
        return username.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase();
      }
      const email = name(manager?.email);
      return email ? email[0].toUpperCase() : '?';
    };
  }, []);

  const loadManagers = async () => {
    setManagersLoading(true);
    setMessage(null);
    try {
      const data = await getManagers();
      setManagers(data?.managers || []);
    } catch (error) {
      setMessage('Не вдалося завантажити менеджерів.');
    } finally {
      setManagersLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    loadManagers();
  }, [isAdmin]);

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
    setMessage(null);
  };

  const handleRegister = async () => {
    setLoading(true);
    setMessage(null);
    try {
      await createManager(form);
      setForm(initialForm);
      setMessage('Менеджера зареєстровано.');
      await loadManagers();
    } catch (error) {
      setMessage(error?.message || 'Не вдалося зареєструвати менеджера.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (manager) => {
    setMessage(null);
    try {
      await setManagerStatus(manager.id, { is_active: !manager.is_active });
      await loadManagers();
    } catch (error) {
      setMessage(error?.message || 'Не вдалося змінити статус менеджера.');
    }
  };

  const handleDelete = async (manager) => {
    const managerUsername = manager?.username || '';
    const managerLabel = managerUsername || manager?.email || '';
    const ok = window.confirm(`Видалити менеджера ${managerLabel}?`);
    if (!ok) return;

    const confirmation = window.prompt(
      `Щоб підтвердити видалення, введіть username: ${managerUsername}`
    );
    if (confirmation === null) return;

    if ((confirmation || '').trim() !== managerUsername) {
      setMessage('Username введено невірно. Видалення скасовано.');
      return;
    }

    setMessage(null);
    try {
      await deleteManager(manager.id, managerUsername);
      setMessage('Менеджера видалено.');
      await loadManagers();
    } catch (error) {
      setMessage(error?.message || 'Не вдалося видалити менеджера.');
    }
  };

  if (!isAdmin) {
    return (
      <PageWrapper>
        <Panel style={{ width: 'min(720px, 100%)' }}>
          <PanelTitle>Керування менеджерами</PanelTitle>
          <Banner $error>Доступ дозволено лише адміністратору.</Banner>
        </Panel>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <PanelGrid>
        <Panel>
          <PanelTitle>Реєстрація нового працівника</PanelTitle>

          <FieldGroup>
            <FieldLabel htmlFor="manager-username">Username</FieldLabel>
            <FieldInput
              id="manager-username"
              value={form.username}
              onChange={handleChange('username')}
              placeholder="Введіть ім'я"
              autoComplete="off"
            />
          </FieldGroup>

          <FieldGroup>
            <FieldLabel htmlFor="manager-email">Email</FieldLabel>
            <InputRow>
              <FieldInput
                id="manager-email"
                type="email"
                value={form.email}
                onChange={handleChange('email')}
                placeholder="email@example.com"
                autoComplete="off"
              />
            </InputRow>
          </FieldGroup>

          <FieldGroup>
            <FieldLabel htmlFor="manager-password">Password</FieldLabel>
            <InputRow>
              <FieldInput
                id="manager-password"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={handleChange('password')}
                placeholder="**************"
                autoComplete="new-password"
              />
              <ToggleVisibility
                type="button"
                aria-label={showPassword ? 'Сховати пароль' : 'Показати пароль'}
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
              </ToggleVisibility>
            </InputRow>
          </FieldGroup>

          <PrimaryButton
            type="button"
            onClick={handleRegister}
            disabled={loading || !form.username.trim() || !form.email.trim() || !form.password.trim()}
          >
            Зареєструвати
          </PrimaryButton>

          {message && <Banner $error={String(message).toLowerCase().includes('не вдалося')}>{message}</Banner>}
        </Panel>

        <Panel>
          <PanelTitle>Працівники</PanelTitle>

          {message && <Banner $error={String(message).toLowerCase().includes('не вдалося')}>{message}</Banner>}

          {managersLoading ? (
            <Banner>Завантаження...</Banner>
          ) : managers.length ? (
            <List>
              {managers.map((manager) => (
                <ListItem key={manager.id}>
                  <AvatarCircle>{avatarText(manager)}</AvatarCircle>
                  <EmployeeInfo>
                    <h4>{manager.username || manager.email}</h4>
                    <span>{manager.email}</span>
                  </EmployeeInfo>
                  <Actions>
                    <button type="button" onClick={() => handleToggleActive(manager)}>
                      {manager.is_active ? 'Деактивувати' : 'Активувати'}
                    </button>
                    <button type="button" className="danger" onClick={() => handleDelete(manager)}>
                      Видалити
                    </button>
                  </Actions>
                </ListItem>
              ))}
            </List>
          ) : (
            <Banner>Менеджерів ще немає.</Banner>
          )}

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <PrimaryButton type="button" onClick={loadManagers} disabled={managersLoading}>
              Оновити список
            </PrimaryButton>
          </div>
        </Panel>
      </PanelGrid>
    </PageWrapper>
  );
};

export default ManagerManagement;
