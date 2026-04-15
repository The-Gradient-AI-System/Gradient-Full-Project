import React, { useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { getGmailLeads } from '../api/client';
import { useAuth } from '../context/AuthContext';

const Page = styled.section`
  width: 100%;
  display: flex;
  justify-content: center;
  padding: 2.6rem 1.6rem 4.2rem;
`;

const Shell = styled.div`
  width: min(1220px, 100%);
  display: flex;
  flex-direction: column;
  gap: 1.4rem;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 1rem;
  flex-wrap: wrap;
`;

const TitleBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.55rem;

  h1 {
    margin: 0;
    font-size: 2.2rem;
    letter-spacing: -0.02em;
  }

  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.subtleText};
    max-width: 60ch;
  }
`;

const Toolbar = styled.div`
  display: flex;
  gap: 0.8rem;
  align-items: center;
  flex-wrap: wrap;
`;

const Search = styled.input`
  width: min(420px, 70vw);
  padding: 0.75rem 1rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.06);
  color: ${({ theme }) => theme.colors.text};
  outline: none;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1.1rem;
`;

const Card = styled.button`
  text-align: left;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: ${({ theme }) => theme.colors.cardBackground};
  box-shadow: 0 18px 42px rgba(5, 8, 22, 0.35);
  padding: 1.15rem 1.2rem;
  cursor: pointer;
  color: inherit;
  transition: transform 0.16s ease, border-color 0.16s ease;

  &:hover {
    transform: translateY(-2px);
    border-color: rgba(104, 123, 255, 0.55);
  }
`;

const NameRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 0.8rem;
  align-items: baseline;
`;

const Name = styled.div`
  font-weight: 700;
  letter-spacing: -0.01em;
`;

const Badge = styled.span`
  font-size: 0.78rem;
  padding: 0.3rem 0.55rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  color: ${({ theme }) => theme.colors.subtleText};
`;

const StatusRow = styled.div`
  margin-top: 0.85rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
`;

const StatusLabel = styled.span`
  font-size: 0.82rem;
  color: ${({ theme }) => theme.colors.subtleText};
  white-space: nowrap;
`;

const StatusBar = styled.div`
  flex: 1;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
`;

const StatusSegment = styled.span`
  height: 8px;
  border-radius: 999px;
  background: ${({ $active, $color }) => ($active ? $color : 'rgba(255,255,255,0.10)')};
  border: 1px solid ${({ $active, $color }) => ($active ? $color : 'rgba(255,255,255,0.10)')};
  transition: all 0.2s ease;
  position: relative;

  &:hover {
    transform: scaleY(1.3);
    filter: brightness(1.2);
  }
`;

const STATUS_STEPS = [
  { label: 'Новий', color: '#ef4444' }, // Red
  { label: 'Зібрана інформація', color: '#3b82f6' }, // Blue
  { label: 'Потрібен дзвінок', color: '#f59e0b' }, // Yellow
  { label: 'Опрацьований', color: '#10b981' }, // Green
];

const Meta = styled.div`
  margin-top: 0.35rem;
  color: ${({ theme }) => theme.colors.subtleText};
  display: flex;
  gap: 0.65rem;
  flex-wrap: wrap;
  font-size: 0.92rem;
`;

const Snippet = styled.div`
  margin-top: 0.75rem;
  font-size: 0.95rem;
  line-height: 1.5;
  opacity: 0.95;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const Empty = styled.div`
  border-radius: 18px;
  border: 1px dashed rgba(255, 255, 255, 0.18);
  padding: 1.2rem;
  color: ${({ theme }) => theme.colors.subtleText};
`;

const parseDate = (value) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const normalizeStatus = (value) => (value || '').toString().trim().toLowerCase();

const getStatusProgress = (lead) => {
  const status = normalizeStatus(lead?.status);
  const preprocessing = normalizeStatus(lead?.preprocessing_status);
  const hasReplyDraft = Boolean((lead?.preprocessed_replies || '').toString().trim());

  // Logic for 4 steps:
  // 0: Новий
  // 1: Зібрана інформація (Preprocessing done or assigned)
  // 2: Потрібен дзвінок (Special intent or reply ready to be checked)
  // 3: Опрацьований (Final decision made or email sent)

  const dbStatus = (lead?.status || '').toString().trim().toUpperCase();

  // Final states
  if (['CONFIRMED', 'REJECTED', 'EMAIL_SENT', 'CLOSED', 'LOST'].includes(dbStatus) || status === 'confirmed' || status === 'rejected') {
    return { step: 3, label: STATUS_STEPS[3].label };
  }

  // Action required states
  if (dbStatus === 'CALL_LEAD' || status === 'call_lead' || dbStatus === 'WAITING_REPLY' || dbStatus === 'REPLY_READY' || hasReplyDraft) {
    return { step: 2, label: STATUS_STEPS[2].label };
  }

  // Information gathered states
  if (dbStatus === 'ASSIGNED' || preprocessing === 'ready' || status === 'snoozed') {
    return { step: 1, label: STATUS_STEPS[1].label };
  }

  // Initial state
  return { step: 0, label: STATUS_STEPS[0].label };
};

const scoreLead = (lead) => {
  if (!lead) return 0;
  let score = 0;
  if ((lead.email || '').trim()) score += 3;
  if ((lead.subject || '').trim()) score += 2;
  if ((lead.body || '').trim()) score += 1;
  if ((lead.full_name || '').trim()) score += 2;
  if ((lead.company || lead.company_name || '').trim()) score += 1;
  if ((lead.phone || '').trim()) score += 1;
  if ((lead.website || '').trim()) score += 1;
  return score;
};

const dedupeByEmailLatest = (leads) => {
  const byKey = new Map();
  const counts = new Map();

  const keyFor = (lead) => {
    const email = (lead?.email || '').trim().toLowerCase();
    if (email) return `email:${email}`;
    const gid = (lead?.gmail_id || '').trim();
    return gid ? `gmail:${gid}` : `row:${lead?.sheet_row || lead?.sheetRow || ''}`;
  };

  (leads || []).forEach((lead) => {
    const key = keyFor(lead);
    counts.set(key, (counts.get(key) || 0) + 1);
    const current = byKey.get(key);
    if (!current) {
      byKey.set(key, lead);
      return;
    }

    const currentTime = parseDate(current.received_at)?.getTime() || 0;
    const nextTime = parseDate(lead.received_at)?.getTime() || 0;
    if (nextTime > currentTime) {
      byKey.set(key, lead);
      return;
    }
    if (nextTime === currentTime && scoreLead(lead) > scoreLead(current)) {
      byKey.set(key, lead);
    }
  });

  return Array.from(byKey.entries())
    .map(([key, lead]) => ({ ...lead, _messagesFromEmail: counts.get(key) || 1 }))
    .sort((a, b) => (parseDate(b.received_at)?.getTime() || 0) - (parseDate(a.received_at)?.getTime() || 0));
};

const LeadsHistory = () => {
  const navigate = useNavigate();
  const { leadSnapshot, updateLeadSnapshot } = useAuth();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const didHydrateRef = useRef(false);

  useEffect(() => {
    if (!didHydrateRef.current && leadSnapshot?.leads?.length) {
      didHydrateRef.current = true;
      setLeads(leadSnapshot.leads);
    }
  }, [leadSnapshot]); // hydrate once when snapshot appears

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await getGmailLeads();
        if (!cancelled) {
          setLeads(res?.leads || []);
          updateLeadSnapshot?.(res);
        }
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Не вдалося завантажити лідів.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [updateLeadSnapshot]);

  const cards = useMemo(() => {
    const deduped = dedupeByEmailLatest(leads);
    const text = query.trim().toLowerCase();
    if (!text) return deduped.slice(0, 18);
    return deduped
      .filter((l) => {
        const hay = [
          l.full_name,
          l.first_name,
          l.last_name,
          l.email,
          l.company,
          l.company_name,
          l.subject,
          l.person_summary,
          l.person_role,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(text);
      })
      .slice(0, 30);
  }, [leads, query]);

  return (
    <Page>
      <Shell>
        <Header>
          <TitleBlock>
            <h1>Історія лідів</h1>
            <p>Короткі профілі по кожному email. Натисни на картку — відкриється повний профіль з усією історією.</p>
          </TitleBlock>
          <Toolbar>
            <Search
              type="search"
              value={query}
              placeholder="Пошук: ім'я, email, компанія"
              onChange={(e) => setQuery(e.target.value)}
            />
          </Toolbar>
        </Header>

        {loading ? <Empty>Завантаження…</Empty> : null}
        {error ? <Empty>{error}</Empty> : null}

        {!loading && !error && cards.length === 0 ? (
          <Empty>Поки що немає профілів для показу.</Empty>
        ) : (
          <Grid>
            {cards.map((lead) => {
              const displayName =
                lead.full_name || [lead.first_name, lead.last_name].filter(Boolean).join(' ') || 'Невідомий контакт';
              const company = lead.company || lead.company_name || '—';
              const email = lead.email || '';
              const role = lead.person_role || '';
              const phone = lead.phone || '';
              const badgeText = lead._messagesFromEmail > 1 ? `${lead._messagesFromEmail} листи` : '1 лист';
              const snippet = lead.subject || lead.body || '';
              const progress = getStatusProgress(lead);

              return (
                <Card
                  key={`${email || lead.gmail_id}`}
                  type="button"
                  onClick={() => email && navigate(`/lead/${encodeURIComponent(email)}`)}
                  disabled={!email}
                >
                  <NameRow>
                    <Name>{displayName}</Name>
                    <Badge>{badgeText}</Badge>
                  </NameRow>
                  <Meta>
                    <span>{email || 'email не вказано'}</span>
                    <span>•</span>
                    <span>{company}</span>
                    {role ? (
                      <>
                        <span>•</span>
                        <span>{role}</span>
                      </>
                    ) : null}
                    {phone ? (
                      <>
                        <span>•</span>
                        <span>{phone}</span>
                      </>
                    ) : null}
                  </Meta>
                  <Snippet>{snippet}</Snippet>
                  <StatusRow>
                    <StatusLabel>{progress.label}</StatusLabel>
                    <StatusBar aria-label={`Статус: ${progress.label}`}>
                      {STATUS_STEPS.map((step, idx) => (
                        <StatusSegment
                          key={idx}
                          $active={idx <= progress.step}
                          $color={step.color}
                          title={step.label}
                        />
                      ))}
                    </StatusBar>
                  </StatusRow>
                </Card>
              );
            })}
          </Grid>
        )}
      </Shell>
    </Page>
  );
};

export default LeadsHistory;

