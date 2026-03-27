import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import {
  getGmailLeads,
  postGenerateReplies,
  postLeadStatus,
  getLeadProfile,
  getStatusHistory,
} from '../api/client';
import { sortLeadsByPriority, getIntentTag } from '../utils/leadPriority';
import EmailOverlayPanel from '../components/EmailOverlayPanel';
import LeadHistoryTable from '../components/LeadHistoryTable';
import { useModalManager } from '../context/ModalManagerContext';

const statuses = ['NEW', 'ASSIGNED', 'EMAIL_SENT', 'WAITING_REPLY', 'REPLY_READY', 'CLOSED', 'LOST'];

const Wrap = styled.div`
  display: grid;
  gap: 1rem;
`;
const Card = styled.section`
  background: ${({ theme }) => theme.colors.cardBackground};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 14px;
  padding: 1rem;
`;
const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  th, td { padding: 0.7rem; border-bottom: 1px solid rgba(255,255,255,0.08); text-align: left; }
  tr { cursor: pointer; }
`;
const PendingTag = styled.span`
  display: inline-block;
  font-size: 0.75rem;
  background: rgba(255, 189, 89, 0.2);
  border: 1px solid rgba(255, 189, 89, 0.5);
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
  margin-left: 0.5rem;
`;
const ProfileHead = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
`;
const AccentStrong = styled.strong`
  color: #7da2ff;
`;
const Button = styled.button`
  border: none;
  background: rgba(255,255,255,0.08);
  color: ${({ theme }) => theme.colors.text};
  border-radius: 10px;
  padding: 0.45rem 0.7rem;
  cursor: pointer;
`;
const Select = styled.select`
  background: rgba(255,255,255,0.08);
  color: ${({ theme }) => theme.colors.text};
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 10px;
  padding: 0.35rem 0.5rem;
`;

const AutomationManager = () => {
  const { activeModals, openModal, closeModal } = useModalManager();
  const [payload, setPayload] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);
  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState([]);
  const [showMore, setShowMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);
  const [replyError, setReplyError] = useState('');
  const [replyOptions, setReplyOptions] = useState({ quick: '', follow_up: '', recap: '' });
  const [selectedReplyKey, setSelectedReplyKey] = useState('quick');
  const [replyDraft, setReplyDraft] = useState('');

  const panelId = selectedLead ? `email-panel-${selectedLead.gmail_id}` : '';
  const isPanelOpen = Boolean(panelId && activeModals.some((modal) => modal.id === panelId));

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getGmailLeads();
      setPayload(data || { leads: [] });
    } catch (e) {
      setError(e?.message || 'Failed to load leads');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const leads = useMemo(() => sortLeadsByPriority(payload?.leads || []), [payload]);

  const handleRowClick = useCallback(async (lead) => {
    setSelectedLead(lead);
    openModal({ id: `email-panel-${lead.gmail_id}`, type: 'email_overlay', props: { gmailId: lead.gmail_id } });
    setReplyError('');
    setReplyOptions({ quick: '', follow_up: '', recap: '' });
    setSelectedReplyKey('quick');
    setReplyDraft('');
    try {
      const [profileData, historyData] = await Promise.all([
        getLeadProfile(lead.email),
        getStatusHistory(lead.gmail_id),
      ]);
      setProfile(profileData);
      setHistory(historyData?.history || []);
    } catch {
      setProfile(null);
      setHistory([]);
    }
  }, [openModal]);

  const handleGenerate = useCallback(async () => {
    if (!selectedLead) return;
    setReplyLoading(true);
    setReplyError('');
    try {
      const cached = selectedLead.preprocessing_status === 'ready' ? selectedLead.preprocessed_replies : null;
      const responseReplies = cached && Object.keys(cached || {}).length
        ? cached
        : (await postGenerateReplies({
            sender: selectedLead.email,
            subject: selectedLead.subject || '',
            body: selectedLead.body || '',
            lead: selectedLead,
          }))?.replies;
      const normalized = {
        quick: typeof responseReplies?.quick === 'string' ? responseReplies.quick : '',
        follow_up: typeof responseReplies?.follow_up === 'string' ? responseReplies.follow_up : '',
        recap: typeof responseReplies?.recap === 'string' ? responseReplies.recap : '',
      };
      setReplyOptions(normalized);
      const priorityOrder = ['quick', 'follow_up', 'recap'];
      const first = priorityOrder.find((key) => normalized[key]?.trim()) || 'quick';
      setSelectedReplyKey(first);
      setReplyDraft(normalized[first] || '');
      if (!priorityOrder.some((key) => normalized[key]?.trim())) {
        setReplyError('No variants were generated. Please try again.');
      }
    } catch (e) {
      setReplyError(e?.message || 'Failed to generate replies');
    } finally {
      setReplyLoading(false);
    }
  }, [selectedLead]);

  const handleCopy = useCallback(async () => {
    if (!selectedLead) return;
    await navigator.clipboard.writeText(selectedLead.body || '');
  }, [selectedLead]);

  const handleAttach = useCallback(() => {
    setReplyError('Attachment flow will be added in next iteration.');
  }, []);

  const handleStatusChange = useCallback(async (status) => {
    if (!selectedLead) return;
    await postLeadStatus({ gmail_id: selectedLead.gmail_id, status });
    const historyData = await getStatusHistory(selectedLead.gmail_id);
    setHistory(historyData?.history || []);
    await load();
  }, [selectedLead, load]);

  const handleConfirmReply = useCallback(async () => {
    if (!selectedLead) return;
    await handleStatusChange('REPLY_READY');
  }, [selectedLead, handleStatusChange]);

  return (
    <Wrap>
      <Card>
        <h2>Manager Leads</h2>
        {loading ? <div>Loading leads...</div> : null}
        {error ? <div>{error}</div> : null}
        <Table>
          <thead>
            <tr>
              <th>Lead</th>
              <th>Company</th>
              <th>Subject</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr
                key={lead.gmail_id}
                onClick={() => handleRowClick(lead)}
                style={lead.pending_review ? { background: 'rgba(255, 189, 89, 0.08)', outline: '1px solid rgba(255, 189, 89, 0.45)' } : undefined}
              >
                <td>
                  {lead.full_name || lead.email}
                  {getIntentTag(lead) ? <PendingTag>{getIntentTag(lead)}</PendingTag> : null}
                </td>
                <td>{lead.company || '—'}</td>
                <td>{lead.subject || '—'}</td>
                <td>{lead.status || 'NEW'}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      {profile ? (
        <Card>
          <ProfileHead>
            <div>
              <h3>{profile.name}</h3>
              <div>
                Phone: {profile.phone || '—'} · Company: {profile.company || '—'} · Role: <AccentStrong>{profile.role || '—'}</AccentStrong>
              </div>
            </div>
            <div>
              <Select value={profile.status || 'NEW'} onChange={(e) => handleStatusChange(e.target.value)}>
                {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
              </Select>
            </div>
          </ProfileHead>
          <Button type="button" onClick={() => setShowMore((prev) => !prev)}>
            {showMore ? 'Hide extra info' : 'Show more info'}
          </Button>
          {showMore ? (
            <div style={{ marginTop: '0.8rem' }}>
              <div>Email: {profile.email}</div>
              <div>Pending review: {profile.pending_review ? 'Yes' : 'No'}</div>
              <div>Priority: {profile.is_priority ? 'Yes' : 'No'}</div>
            </div>
          ) : null}
          <h4 style={{ marginTop: '1rem' }}>All messages from this sender</h4>
          {(profile.emails || []).map((mail) => (
            <div key={mail.gmail_id} style={{ padding: '0.6rem 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div><strong>{mail.subject || 'No subject'}</strong></div>
              <div style={{ opacity: 0.8, fontSize: '0.88rem' }}>{mail.received_at || ''}</div>
            </div>
          ))}
        </Card>
      ) : null}

      <Card>
        <h3>Status History</h3>
        <LeadHistoryTable history={history} />
      </Card>

      <EmailOverlayPanel
        open={isPanelOpen}
        lead={selectedLead}
        onClose={() => {
          if (panelId) closeModal(panelId);
        }}
        onCopy={handleCopy}
        onAttach={handleAttach}
        onGenerate={handleGenerate}
        onConfirm={handleConfirmReply}
        replyOptions={replyOptions}
        selectedReplyKey={selectedReplyKey}
        onSelectVariant={(key) => {
          setSelectedReplyKey(key);
          setReplyDraft(replyOptions[key] || '');
        }}
        replyDraft={replyDraft}
        onDraftChange={setReplyDraft}
        replyLoading={replyLoading}
        replyError={replyError}
      />
    </Wrap>
  );
};

export default AutomationManager;

