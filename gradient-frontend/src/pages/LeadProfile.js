import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useParams, useNavigate } from 'react-router-dom';
import { getLeadProfile, postLeadStatus } from '../api/client';
import LeadHistoryTable from '../components/LeadHistoryTable.jsx';

const Page = styled.section`
  width: 100%;
  display: flex;
  justify-content: center;
  padding: 2.5rem 1.6rem 4rem;
`;

const Card = styled.div`
  width: min(1180px, 100%);
  background: ${({ theme }) => theme.colors.cardBackground};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 22px;
  box-shadow: 0 18px 44px ${({ theme }) => theme.colors.shadow};
  padding: 1.6rem 1.8rem;
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  flex-wrap: wrap;
`;

const Title = styled.h2`
  margin: 0;
  font-size: 1.6rem;
  letter-spacing: -0.01em;
`;

const Meta = styled.div`
  color: ${({ theme }) => theme.colors.subtleText};
  display: flex;
  flex-wrap: wrap;
  gap: 0.8rem;
  font-size: 0.95rem;
`;

const StrongRole = styled.strong`
  color: #7da2ff;
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
`;

const Button = styled.button`
  border-radius: 12px;
  padding: 0.55rem 0.9rem;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(255, 255, 255, 0.06);
  color: ${({ theme }) => theme.colors.text};
  cursor: pointer;
`;

const Select = styled.select`
  border-radius: 12px;
  padding: 0.55rem 0.9rem;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(255, 255, 255, 0.06);
  color: ${({ theme }) => theme.colors.text};
`;

const Section = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  padding: 1.1rem 1.2rem;
`;

const SectionTitle = styled.h3`
  margin: 0 0 0.8rem;
  font-size: 1.05rem;
`;

const MailList = styled.div`
  display: grid;
  gap: 0.75rem;
`;

const MailItem = styled.div`
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 0.75rem 0.9rem;
`;

const MailButton = styled.button`
  width: 100%;
  text-align: left;
  border: none;
  background: transparent;
  color: inherit;
  padding: 0;
  cursor: pointer;
`;

const MailOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(6, 7, 20, 0.78);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2.2rem 1.5rem;
  z-index: 80;
`;

const MailModal = styled.div`
  width: min(980px, 100%);
  max-height: 90vh;
  overflow: hidden;
  background: ${({ theme }) => theme.colors.cardBackground};
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 22px;
  box-shadow: 0 38px 90px rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
`;

const MailModalHeader = styled.div`
  padding: 1.1rem 1.2rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
`;

const MailModalTitle = styled.div`
  font-weight: 700;
`;

const MailModalClose = styled.button`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(14, 18, 32, 0.68);
  color: ${({ theme }) => theme.colors.text};
  cursor: pointer;
`;

const MailModalBody = styled.div`
  padding: 1.2rem 1.2rem 1.4rem;
  overflow: auto;
`;

const MailSubject = styled.div`
  font-weight: 650;
`;

const MailMeta = styled.div`
  margin-top: 0.25rem;
  color: ${({ theme }) => theme.colors.subtleText};
  font-size: 0.88rem;
`;

const MailBody = styled.div`
  margin-top: 0.6rem;
  white-space: pre-wrap;
  font-size: 0.95rem;
  line-height: 1.55;
  opacity: 0.95;
`;

// Status values must match backend allowed set (see `update_lead_status_gmail_id`).
const statuses = ['new', 'waiting', 'confirmed', 'rejected', 'snoozed'];

const LeadProfile = () => {
  const { email } = useParams();
  const navigate = useNavigate();
  const decodedEmail = useMemo(() => {
    try { return decodeURIComponent(email || ''); } catch { return email || ''; }
  }, [email]);

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showMore, setShowMore] = useState(false);
  const [openMail, setOpenMail] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!decodedEmail) return;
      setLoading(true);
      setError('');
      try {
        const data = await getLeadProfile(decodedEmail);
        if (!cancelled) setProfile(data);
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Не вдалося завантажити профіль ліда.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [decodedEmail]);

  const updateStatus = async (nextStatus) => {
    if (!profile?.id) return;
    await postLeadStatus({
      gmail_id: profile.id,
      status: String(nextStatus || '').toLowerCase(),
    });
    const data = await getLeadProfile(decodedEmail);
    setProfile(data);
  };

  if (loading) {
    return <Page><Card>Завантаження…</Card></Page>;
  }
  if (error) {
    return <Page><Card>{error}</Card></Page>;
  }
  if (!profile) {
    return <Page><Card>Профіль не знайдено.</Card></Page>;
  }

  return (
    <Page>
      <Card>
        <Header>
          <div>
            <Title>{profile.name}</Title>
            <Meta>
              <span>Email: {profile.email}</span>
              <span>Phone: {profile.phone || '—'}</span>
              <span>Company: {profile.company || '—'}</span>
              <span>Role: <StrongRole>{profile.role || '—'}</StrongRole></span>
            </Meta>
          </div>
          <ButtonRow>
            <Button type="button" onClick={() => navigate(-1)}>Назад</Button>
            <Select value={profile.status || 'waiting'} onChange={(e) => updateStatus(e.target.value)}>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s.toUpperCase()}
                </option>
              ))}
            </Select>
            <Button type="button" onClick={() => setShowMore((p) => !p)}>
              {showMore ? 'Сховати деталі' : 'Показати більше'}
            </Button>
          </ButtonRow>
        </Header>

        {showMore ? (
          <Section>
            <SectionTitle>Деталі</SectionTitle>
            <Meta>
              <span>Pending review: {profile.pending_review ? 'Yes' : 'No'}</span>
              <span>Priority: {profile.is_priority ? 'Yes' : 'No'}</span>
            </Meta>
          </Section>
        ) : null}

        <Section>
          <SectionTitle>Всі листи від цього контакту</SectionTitle>
          <MailList>
            {(profile.emails || []).map((mail) => (
              <MailItem key={mail.gmail_id}>
                <MailButton type="button" onClick={() => setOpenMail(mail)}>
                  <MailSubject>{mail.subject || 'Без теми'}</MailSubject>
                  <MailMeta>{mail.received_at || ''} · {mail.status || ''}</MailMeta>
                  <MailBody>{(mail.body || '').slice(0, 260)}{(mail.body || '').length > 260 ? '…' : ''}</MailBody>
                </MailButton>
              </MailItem>
            ))}
          </MailList>
        </Section>

        <Section>
          <SectionTitle>Історія статусів</SectionTitle>
          <LeadHistoryTable history={profile.history || []} />
        </Section>
      </Card>
      {openMail && (
        <MailOverlay onClick={() => setOpenMail(null)}>
          <MailModal onClick={(e) => e.stopPropagation()}>
            <MailModalHeader>
              <div>
                <MailModalTitle>{openMail.subject || 'Без теми'}</MailModalTitle>
                <MailMeta>{openMail.received_at || ''} · {openMail.status || ''}</MailMeta>
              </div>
              <MailModalClose type="button" onClick={() => setOpenMail(null)} aria-label="Закрити">
                ×
              </MailModalClose>
            </MailModalHeader>
            <MailModalBody>
              <MailBody>{openMail.body || 'Повідомлення порожнє.'}</MailBody>
            </MailModalBody>
          </MailModal>
        </MailOverlay>
      )}
    </Page>
  );
};

export default LeadProfile;

