import React from 'react';
import styled from 'styled-components';

const Overlay = styled.aside`
  position: fixed;
  right: 0;
  top: 0;
  height: 100vh;
  width: min(40%, 680px);
  min-width: 420px;
  background: ${({ theme }) => theme.colors.cardBackground};
  box-shadow: -18px 0 42px rgba(6, 8, 22, 0.45);
  z-index: 80;
  transform: translateX(${({ $open }) => ($open ? '0' : '100%')});
  transition: transform 0.25s ease;
  display: flex;
  flex-direction: column;
  @media (max-width: 960px) {
    width: min(92vw, 620px);
    min-width: auto;
  }
`;

const Header = styled.header`
  position: sticky;
  top: 0;
  background: ${({ theme }) => theme.colors.cardBackground};
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding: 1rem 1.2rem;
  z-index: 2;
`;

const Title = styled.h3`
  margin: 0;
  font-size: 1.05rem;
`;

const Meta = styled.div`
  margin-top: 0.45rem;
  color: ${({ theme }) => theme.colors.subtleText};
  font-size: 0.85rem;
`;

const CloseBtn = styled.button`
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: transparent;
  color: ${({ theme }) => theme.colors.text};
  border-radius: 999px;
  padding: 0.3rem 0.8rem;
  cursor: pointer;
`;

const TopRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 0.6rem;
`;

const Scroller = styled.div`
  overflow-y: auto;
  padding: 1rem 1.2rem 1.4rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const Body = styled.pre`
  white-space: pre-wrap;
  font-family: inherit;
  font-size: 0.95rem;
  line-height: 1.55;
  margin: 0;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 14px;
  padding: 0.9rem;
`;

const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const Action = styled.button`
  border: none;
  border-radius: 12px;
  padding: 0.55rem 0.9rem;
  cursor: pointer;
  background: ${({ $primary }) => ($primary ? 'linear-gradient(135deg, #5f7bff, #9161ff)' : 'rgba(255, 255, 255, 0.08)')};
  color: ${({ theme }) => theme.colors.text};
  opacity: ${({ disabled }) => (disabled ? 0.5 : 1)};
`;

const Variant = styled.button`
  border-radius: 10px;
  border: 1px solid ${({ theme, $active }) => ($active ? theme.colors.primary : 'rgba(255,255,255,0.18)')};
  background: ${({ $active }) => ($active ? 'rgba(93, 116, 255, 0.16)' : 'transparent')};
  color: ${({ theme }) => theme.colors.text};
  padding: 0.45rem 0.8rem;
  cursor: pointer;
  opacity: ${({ disabled }) => (disabled ? 0.5 : 1)};
`;

const Draft = styled.textarea`
  width: 100%;
  min-height: 180px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(0, 0, 0, 0.16);
  color: ${({ theme }) => theme.colors.text};
  padding: 0.8rem;
  resize: vertical;
`;

const Error = styled.div`
  color: #ff7f8f;
  font-size: 0.88rem;
`;

const EmailOverlayPanel = ({
  open,
  lead,
  onClose,
  onCopy,
  onAttach,
  onGenerate,
  onConfirm,
  replyOptions,
  selectedReplyKey,
  onSelectVariant,
  replyDraft,
  onDraftChange,
  replyLoading,
  replyError,
}) => {
  if (!lead) return null;
  const variants = ['quick', 'follow_up', 'recap'];
  return (
    <Overlay $open={open} aria-hidden={!open}>
      <Header>
        <TopRow>
          <div>
            <Title>{lead.subject || 'Без теми'}</Title>
            <Meta>{lead.full_name || lead.email} {lead.company ? `· ${lead.company}` : ''}</Meta>
          </div>
          <CloseBtn type="button" onClick={onClose}>Close</CloseBtn>
        </TopRow>
      </Header>
      <Scroller>
        <Body>{lead.body || 'Повідомлення порожнє.'}</Body>
        <Row>
          <Action type="button" onClick={onCopy}>Copy</Action>
          <Action type="button" onClick={onAttach}>Attach</Action>
          <Action type="button" $primary onClick={onGenerate} disabled={replyLoading}>
            {replyLoading ? 'Generating...' : 'Confirm / Generate'}
          </Action>
        </Row>
        <Row>
          {variants.map((key) => (
            <Variant
              key={key}
              type="button"
              onClick={() => onSelectVariant(key)}
              $active={selectedReplyKey === key}
              disabled={!(replyOptions?.[key] || '').trim()}
            >
              {key}
            </Variant>
          ))}
        </Row>
        {replyError ? <Error>{replyError}</Error> : null}
        <Draft value={replyDraft} onChange={(event) => onDraftChange(event.target.value)} />
        <Row>
          <Action type="button" $primary onClick={onConfirm}>Save as Reply Ready</Action>
        </Row>
      </Scroller>
    </Overlay>
  );
};

export default EmailOverlayPanel;
