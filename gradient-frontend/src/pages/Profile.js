import React, { useEffect, useRef, useState } from 'react';
import styled, { useTheme } from 'styled-components';
import { FiCamera, FiEye, FiEyeOff } from 'react-icons/fi';
import userAvatar from '../assets/user.jpg';

const PageWrapper = styled.section`
  width: 100%;
  display: flex;
  justify-content: center;
  padding: 3rem 2rem 4.5rem;

  @media (max-width: 720px) {
    padding: 2.4rem 1.25rem 3.2rem;
  }
`;

const ProfileCard = styled.div`
  width: 100%;
  max-width: 520px;
  background: ${({ theme }) => theme.colors.cardBackground};
  border: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: 0 18px 40px ${({ theme }) => theme.colors.shadow};
  padding: 2.5rem 3rem;
  border-radius: 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;

  @media (max-width: 540px) {
    padding: 2.25rem 1.75rem;
  }
`;

const Title = styled.h1`
  width: 100%;
  margin: 0 0 2.5rem;
  font-size: 1.9rem;
  font-weight: 600;
  letter-spacing: 0.4px;
  text-align: left;
  color: ${({ theme }) => theme.colors.text};
`;

const AvatarWrapper = styled.div`
  position: relative;
  width: 148px;
  height: 148px;
  border-radius: 50%;
  overflow: hidden;
  margin-bottom: 1.75rem;
  box-shadow: 0 0 0 4px ${({ theme }) => theme.colors.surface}, 0 18px 32px rgba(0, 0, 0, 0.18);
`;

const AvatarImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const AvatarOverlay = styled.button`
  position: absolute;
  right: 12px;
  bottom: 12px;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.colors.primary};
  color: #fff;
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(75, 163, 255, 0.35);
  transition: transform 0.2s ease;

  &:hover {
    transform: scale(1.05);
  }
`;

const Form = styled.form`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const Field = styled.label`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.75rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.95rem;
  letter-spacing: 0.2px;
`;

const InputShell = styled.div`
  position: relative;
  width: 100%;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.95rem 1.15rem;
  border-radius: 14px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  font-size: 1.05rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 3px rgba(75, 163, 255, 0.25);
  }
`;

const EyeButton = styled.button`
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.textSecondary};
  cursor: pointer;
`;

const SubmitButton = styled.button`
  margin-top: 1rem;
  align-self: center;
  padding: 0.85rem 2.6rem;
  border-radius: 999px;
  border: none;
  background: linear-gradient(135deg, ${({ theme }) => theme.colors.primary} 0%, #7b6bff 100%);
  color: #fff;
  font-size: 1.05rem;
  font-weight: 600;
  letter-spacing: 0.3px;
  cursor: pointer;
  box-shadow: 0 16px 30px rgba(75, 163, 255, 0.35);
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 18px 36px rgba(75, 163, 255, 0.45);
  }
`;

const HelperText = styled.p`
  margin-top: 0.75rem;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  text-align: center;
`;

const SuccessBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin-top: 1rem;
  padding: 0.55rem 1.1rem;
  border-radius: 999px;
  font-size: 0.9rem;
  font-weight: 500;
  color: #16db65;
  background: rgba(22, 219, 101, 0.12);
`;

const Profile = () => {
  const fileInputRef = useRef(null);
  const previewUrlRef = useRef(null);
  const [avatar, setAvatar] = useState(userAvatar);
  const [email, setEmail] = useState('email@example.com');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);

  useEffect(() => () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }
  }, []);

  const triggerFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = event => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }

    const previewUrl = URL.createObjectURL(file);
    previewUrlRef.current = previewUrl;
    setAvatar(previewUrl);
    setLastSavedAt(null);
  };

  const handleSubmit = event => {
    event.preventDefault();
    setLastSavedAt(new Date());
  };

  return (
    <PageWrapper>
      <ProfileCard>
        <Title>Профіль</Title>
        <AvatarWrapper>
          <AvatarImage src={avatar} alt="Аватар користувача" />
          <AvatarOverlay type="button" onClick={triggerFilePicker} title="Оновити фото">
            <FiCamera size={18} />
          </AvatarOverlay>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            style={{ display: 'none' }}
          />
        </AvatarWrapper>

        <Form onSubmit={handleSubmit}>
          <Field>
            Email:
            <InputShell>
              <Input
                type="email"
                value={email}
                onChange={event => {
                  setEmail(event.target.value);
                  setLastSavedAt(null);
                }}
                placeholder="email@example.com"
                required
              />
            </InputShell>
          </Field>

          <Field>
            Password:
            <InputShell>
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={event => {
                  setPassword(event.target.value);
                  setLastSavedAt(null);
                }}
                minLength={6}
                required
              />
              <EyeButton
                type="button"
                onClick={() => setShowPassword(visible => !visible)}
                title={showPassword ? 'Сховати пароль' : 'Показати пароль'}
              >
                {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
              </EyeButton>
            </InputShell>
          </Field>

          <SubmitButton type="submit">Змінити</SubmitButton>
        </Form>

        <HelperText>Зміни буде синхронізовано після підключення бекенду.</HelperText>
        {lastSavedAt && (
          <SuccessBadge>
            Збережено о {lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </SuccessBadge>
        )}
      </ProfileCard>
    </PageWrapper>
  );
};

export default Profile;
