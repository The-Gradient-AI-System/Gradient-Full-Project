import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { FiRefreshCcw, FiSave } from 'react-icons/fi';
import { getReplyPrompts, updateReplyPrompts } from '../api/client';

const PageWrapper = styled.section`
  width: 100%;
  display: flex;
  justify-content: center;
  padding: 3rem 2.5rem 4.5rem;

  @media (max-width: 720px) {
    padding: 2.4rem 1.25rem 3.2rem;
  }
`;

const SettingsPanel = styled.section`
  width: min(1150px, 100%);
  background: ${({ theme }) => theme.colors.cardBackground};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 28px;
  box-shadow: 0 20px 44px ${({ theme }) => theme.colors.shadow};
  padding: clamp(2.4rem, 3vw, 3.2rem);
  display: flex;
  flex-direction: column;
  gap: 2rem;
`;

const SettingsHeader = styled.header`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const SettingsTitle = styled.h1`
  margin: 0;
  font-size: clamp(1.75rem, 3vw, 2.2rem);
  font-weight: 600;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text};
`;

const SettingsDescription = styled.p`
  margin: 0;
  font-size: 1.02rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  max-width: 760px;
`;

const PromptGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
  gap: 1.6rem;
`;

const PromptSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
`;

const PromptLabel = styled.h2`
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
`;

const PromptHint = styled.p`
  margin: 0;
  font-size: 0.92rem;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const PromptEditor = styled.textarea`
  width: 100%;
  min-height: 240px;
  padding: 1.3rem 1.5rem;
  border-radius: 22px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => (theme.mode === 'light' ? '#f8fbff' : 'rgba(12, 17, 34, 0.88)')};
  color: ${({ theme }) => theme.colors.text};
  font-size: 1.05rem;
  line-height: 1.7;
  resize: vertical;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.04), 0 26px 50px rgba(4, 8, 22, 0.28);

  &:focus {
    outline: none;
    border-color: rgba(104, 125, 255, 0.85);
    box-shadow: inset 0 0 0 1px rgba(104, 125, 255, 0.7), 0 24px 42px rgba(104, 125, 255, 0.22);
  }
`;

const PromptActions = styled.div`
  margin-top: 0.5rem;
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  justify-content: flex-end;
`;

const PromptButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.85rem 1.6rem;
  border-radius: 18px;
  border: none;
  cursor: pointer;
  font-size: 0.96rem;
  font-weight: 500;
  transition: opacity 0.18s ease;
  background: ${({ $primary, theme }) =>
    $primary ? `linear-gradient(135deg, ${theme.colors.primary} 0%, #7b6bff 100%)` : theme.colors.hover};
  color: ${({ $primary, theme }) => ($primary ? '#fff' : theme.colors.text)};
  box-shadow: ${({ $primary }) => ($primary ? '0 14px 26px rgba(75, 163, 255, 0.3)' : 'none')};

  &:hover {
    opacity: 0.9;
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;

const StatusMessage = styled.p`
  margin: 0;
  font-size: 0.92rem;
  color: ${({ $error, theme }) => ($error ? '#ff4d4f' : theme.colors.textSecondary)};
`;

const Settings = () => {
  const [settings, setSettings] = useState({
    topBlock: '',
    bottomBlock: '',
    styles: { official: '', semi_official: '' },
    prompts: { follow_up: '', recap: '', quick: '' },
  });
  const [statusMessage, setStatusMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadPrompts = async () => {
      try {
        const data = await getReplyPrompts();
        if (!cancelled && data) {
          setSettings({
            topBlock: data.topBlock || '',
            bottomBlock: data.bottomBlock || '',
            styles: {
              official: data.styles?.official || '',
              semi_official: data.styles?.semi_official || '',
            },
            prompts: {
              follow_up: data.prompts?.follow_up || '',
              recap: data.prompts?.recap || '',
              quick: data.prompts?.quick || '',
            },
          });
        }
      } catch (error) {
        if (!cancelled) {
          setStatusMessage('Не вдалося завантажити промпти.');
        }
      }
    };

    loadPrompts();

    return () => {
      cancelled = true;
    };
  }, []);

  const handlePromptChange = (field) => (event) => {
    const value = event.target.value;
    setSettings((prev) => ({
      ...prev,
      prompts: { ...prev.prompts, [field]: value },
    }));
    setStatusMessage(null);
  };

  const handleBlockChange = (field) => (event) => {
    const value = event.target.value;
    setSettings((prev) => ({ ...prev, [field]: value }));
    setStatusMessage(null);
  };

  const handleStyleChange = (field) => (event) => {
    const value = event.target.value;
    setSettings((prev) => ({
      ...prev,
      styles: { ...(prev.styles || {}), [field]: value },
    }));
    setStatusMessage(null);
  };

  const resetPrompts = async () => {
    setLoading(true);
    setStatusMessage(null);
    try {
      const fresh = await getReplyPrompts();
      setSettings({
        topBlock: fresh?.topBlock || '',
        bottomBlock: fresh?.bottomBlock || '',
        styles: {
          official: fresh?.styles?.official || '',
          semi_official: fresh?.styles?.semi_official || '',
        },
        prompts: {
          follow_up: fresh?.prompts?.follow_up || '',
          recap: fresh?.prompts?.recap || '',
          quick: fresh?.prompts?.quick || '',
        },
      });
      setStatusMessage('Промпти повернуто до збережених значень.');
    } catch (error) {
      setStatusMessage('Не вдалося отримати промпти.');
    } finally {
      setLoading(false);
    }
  };

  const savePrompts = async () => {
    setLoading(true);
    setStatusMessage(null);
    try {
      const updated = await updateReplyPrompts(settings);
      setSettings({
        topBlock: updated?.topBlock || settings.topBlock,
        bottomBlock: updated?.bottomBlock || settings.bottomBlock,
        styles: {
          official: updated?.styles?.official || settings.styles.official,
          semi_official: updated?.styles?.semi_official || settings.styles.semi_official,
        },
        prompts: {
          follow_up: updated?.prompts?.follow_up || settings.prompts.follow_up,
          recap: updated?.prompts?.recap || settings.prompts.recap,
          quick: updated?.prompts?.quick || settings.prompts.quick,
        },
      });
      setStatusMessage('Промпти успішно збережено.');
    } catch (error) {
      setStatusMessage('Не вдалося зберегти промпти.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageWrapper>
      <SettingsPanel>
        <SettingsHeader>
          <SettingsTitle>AI Reply Prompts</SettingsTitle>
          <SettingsDescription>
            Керуйте шаблонами для двох типів відповідей. Кожен промпт має бути англійською, до 140 слів і базуватись
            лише на реальних даних із листів та CRM.
          </SettingsDescription>
        </SettingsHeader>

        <PromptGrid>
          <PromptSection>
            <PromptLabel>Top Block</PromptLabel>
            <PromptHint>Додається перед основним промптом для кожного варіанту.</PromptHint>
            <PromptEditor
              value={settings.topBlock}
              onChange={handleBlockChange('topBlock')}
              placeholder="Введіть верхній системний блок"
            />
          </PromptSection>

          <PromptSection>
            <PromptLabel>Bottom Block</PromptLabel>
            <PromptHint>Додається після основного промпту для кожного варіанту.</PromptHint>
            <PromptEditor
              value={settings.bottomBlock}
              onChange={handleBlockChange('bottomBlock')}
              placeholder="Введіть нижній системний блок"
            />
          </PromptSection>

          <PromptSection>
            <PromptLabel>Style: Official</PromptLabel>
            <PromptHint>Додається до промпту, коли обраний офіційний стиль відповіді.</PromptHint>
            <PromptEditor
              value={settings.styles.official}
              onChange={handleStyleChange('official')}
              placeholder="Введіть модифікатор офіційного стилю"
            />
          </PromptSection>

          <PromptSection>
            <PromptLabel>Style: Semi-official</PromptLabel>
            <PromptHint>Додається до промпту, коли обраний напів-офіційний стиль відповіді.</PromptHint>
            <PromptEditor
              value={settings.styles.semi_official}
              onChange={handleStyleChange('semi_official')}
              placeholder="Введіть модифікатор напів-офіційного стилю"
            />
          </PromptSection>

          <PromptSection>
            <PromptLabel>Follow-up (після знайомства)</PromptLabel>
            <PromptHint>Стислий лист із подякою, матеріалами та наступним кроком.</PromptHint>
            <PromptEditor
              value={settings.prompts.follow_up}
              onChange={handlePromptChange('follow_up')}
              placeholder="Введіть шаблон follow-up"
            />
          </PromptSection>

          <PromptSection>
            <PromptLabel>Recap & Proposal (після кваліфікації)</PromptLabel>
            <PromptHint>Підсумок болей клієнта, опис пропозиції та заклик до дії.</PromptHint>
            <PromptEditor
              value={settings.prompts.recap}
              onChange={handlePromptChange('recap')}
              placeholder="Введіть шаблон recap & proposal"
            />
          </PromptSection>

          <PromptSection>
            <PromptLabel>Quick Reply</PromptLabel>
            <PromptHint>Максимально коротка відповідь для швидкого фолоу-апу.</PromptHint>
            <PromptEditor
              value={settings.prompts.quick}
              onChange={handlePromptChange('quick')}
              placeholder="Введіть шаблон quick reply"
            />
          </PromptSection>
        </PromptGrid>

        {statusMessage && <StatusMessage $error={statusMessage.includes('Не вдалося')}>{statusMessage}</StatusMessage>}

        <PromptActions>
          <PromptButton type="button" onClick={resetPrompts} disabled={loading}>
            <FiRefreshCcw size={18} /> Скинути
          </PromptButton>
          <PromptButton type="button" $primary onClick={savePrompts} disabled={loading}>
            <FiSave size={18} /> Зберегти
          </PromptButton>
        </PromptActions>
      </SettingsPanel>
    </PageWrapper>
  );
};

export default Settings;
