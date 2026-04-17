  import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled, { useTheme } from 'styled-components';
import { getGmailLeads, postGenerateReplies, postLeadStatus, postLeadInsights, sendEmailWithAttachments } from '../api/client';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useModalManager } from '../context/ModalManagerContext';

const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
  height: 100%;
  padding-bottom: 2rem;
`;

const PageHeader = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
`;

const TitleBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.6rem;

  h1 {
    margin: 0;
    font-size: 2.6rem;
    letter-spacing: -0.02em;
  }

  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.subtleText};
    font-size: 1rem;
    max-width: 46ch;
  }
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: flex-end;
  margin-left: auto;
`;

const RefreshButton = styled.button`
  background: linear-gradient(135deg, #5e7dfd, #9c6dff);
  border: none;
  color: #fff;
  padding: 0.75rem 1.5rem;
  font-size: 0.95rem;
  border-radius: 999px;
  cursor: pointer;
  box-shadow: 0 12px 30px rgba(111, 125, 255, 0.35);
  transition: transform 0.18s ease, box-shadow 0.18s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 16px 34px rgba(111, 125, 255, 0.42);
  }

  &:disabled {
    opacity: 0.5;
    cursor: default;
    transform: none;
    box-shadow: none;
  }
`;

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
`;

const SummaryCard = styled.div`
  background: ${({ theme }) => theme.colors.cardBackground};
  border-radius: 18px;
  padding: 1.4rem 1.6rem;
  border: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  position: relative;
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    inset: auto auto -40% auto;
    width: 120%;
    height: 120%;
    background: radial-gradient(ellipse at bottom right, rgba(90, 105, 255, 0.15), transparent 65%);
    pointer-events: none;
  }

  span {
    font-size: 0.9rem;
    color: ${({ theme }) => theme.colors.subtleText};
  }

  strong {
    font-size: 2.2rem;
    letter-spacing: -0.01em;
  }

  small {
    color: ${({ theme }) => theme.colors.subtleText};
    font-size: 0.9rem;
  }
`;

const ControlsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
  justify-content: space-between;
`;

const Filters = styled.div`
  display: flex;
  gap: 0.85rem;
  flex-wrap: wrap;
`;

const SearchInput = styled.input`
  background: ${({ theme }) => theme.colors.cardBackground};
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 999px;
  padding: 0.65rem 1.1rem;
  min-width: 220px;
  color: ${({ theme }) => theme.colors.text};
  transition: border 0.18s ease, box-shadow 0.18s ease;

  &::placeholder {
    color: ${({ theme }) => theme.colors.subtleText};
  }

  &:focus {
    outline: none;
    border: 1px solid rgba(104, 123, 255, 0.6);
    box-shadow: 0 0 0 6px rgba(104, 123, 255, 0.18);
  }
`;

const Select = styled.select`
  background: ${({ theme }) => theme.colors.cardBackground};
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 999px;
  padding: 0.65rem 1.1rem;
  color: ${({ theme }) => theme.colors.text};
  min-width: 170px;

  &:focus {
    outline: none;
    border: 1px solid rgba(104, 123, 255, 0.55);
  }
`;

const RangeSelector = styled.div`
  position: relative;
`;

const RangeButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.45rem;
  background: ${({ theme }) => theme.colors.cardBackground};
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 999px;
  padding: 0.65rem 1.1rem;
  color: ${({ theme }) => theme.colors.text};
  cursor: pointer;
  font-size: 0.95rem;
  transition: border 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;

  &:hover {
    border: 1px solid rgba(104, 123, 255, 0.5);
    box-shadow: 0 0 0 4px rgba(104, 123, 255, 0.18);
  }

  span.toggle {
    font-size: 0.75rem;
    opacity: 0.7;
    transform: translateY(-1px);
  }
`;

const RangeDropdown = styled.div`
  position: absolute;
  top: calc(100% + 0.55rem);
  left: 0;
  background: ${({ theme }) => theme.colors.cardBackground};
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  box-shadow: 0 12px 28px ${({ theme }) => theme.colors.shadow};
  padding: 0.45rem;
  min-width: 200px;
  z-index: 8;
`;

const RangeOption = styled.button`
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.22rem;
  border: none;
  border-radius: 12px;
  padding: 0.6rem 0.75rem;
  background: ${({ $active }) => ($active ? 'rgba(104, 123, 255, 0.22)' : 'transparent')};
  color: ${({ theme }) => theme.colors.text};
  cursor: pointer;
  font-size: 0.9rem;
  transition: background 0.18s ease;

  &:hover {
    background: rgba(104, 123, 255, 0.3);
  }

  span {
    font-size: 0.78rem;
    color: ${({ theme }) => theme.colors.subtleText};
  }
`;

const LeadsPanel = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.colors.cardBackground};
  border-radius: 22px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  overflow: hidden;
  min-height: 360px;
`;

const PanelHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.3rem 1.6rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);

  h2 {
    margin: 0;
    font-size: 1.3rem;
    letter-spacing: 0.01em;
  }

  span {
    color: ${({ theme }) => theme.colors.subtleText};
    font-size: 0.95rem;
  }
`;

const TableWrapper = styled.div`
  overflow: auto;
  max-height: 520px;
`;

const LeadsTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  min-width: 740px;

  thead {
    background: rgba(255, 255, 255, 0.03);
    text-transform: uppercase;
    font-size: 0.75rem;
    letter-spacing: 0.12em;
  }

  th {
    text-align: left;
    padding: 0.85rem 1.4rem;
    color: ${({ theme }) => theme.colors.subtleText};
  }

  tbody tr {
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    transition: background 0.15s ease, transform 0.15s ease;
    cursor: pointer;
    background: var(--row-bg, transparent);
  }

  tbody tr:hover {
    background: rgba(104, 123, 255, 0.08);
    transform: translateY(-1px);
  }

  td {
    padding: 1.1rem 1.4rem;
    vertical-align: top;
  }
`;

const LeadName = styled.div`
  font-weight: 600;
  font-size: 1rem;
`;

const LeadEmail = styled.div`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.subtleText};
  margin-top: 0.25rem;
`;

const LeadSubject = styled.div`
  font-size: 0.95rem;
  color: ${({ theme }) => theme.colors.text};
`;

const LeadMeta = styled.div`
  margin-top: 0.4rem;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.subtleText};
`;

const BADGE_VARIANTS = {
  confirmed: {
    color: '#15803d',
    background: '#ffffff',
    border: '1px solid rgba(21, 128, 61, 0.28)',
  },
  rejected: {
    color: '#be123c',
    background: '#ffffff',
    border: '1px solid rgba(190, 18, 60, 0.3)',
  },
  snoozed: {
    color: '#b45309',
    background: '#ffffff',
    border: '1px solid rgba(180, 83, 9, 0.28)',
  },
  qualified: {
    color: '#2563eb',
    background: '#ffffff',
    border: '1px solid rgba(37, 99, 235, 0.26)',
  },
  new: {
    color: '#1f2937',
    background: '#ffffff',
    border: '1px solid rgba(31, 41, 55, 0.16)',
  },
  waiting: {
    color: '#475569',
    background: '#ffffff',
    border: '1px solid rgba(71, 85, 105, 0.24)',
  },
  call_lead: {
    color: '#7c3aed',
    background: 'rgba(124, 58, 237, 0.1)',
    border: '2px solid #7c3aed',
    fontWeight: '700',
    boxShadow: '0 0 8px rgba(124, 58, 237, 0.3)',
  },
};

const StatusBadge = styled.button`
  border-radius: 999px;
  padding: 0.35rem 0.85rem;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  cursor: pointer;
  font-family: inherit;
  appearance: none;
  ${({ $variant }) => {
    const preset = BADGE_VARIANTS[$variant] ?? BADGE_VARIANTS.new;
    return `
      color: ${preset.color};
      background: ${preset.background};
      border: ${preset.border};
    `;
  }}
`;

const EmptyState = styled.div`
  padding: 3rem;
  text-align: center;
  color: ${({ theme }) => theme.colors.subtleText};
`;

const StatusBanner = styled.div`
  background: rgba(104, 123, 255, 0.1);
  border: 1px solid rgba(104, 123, 255, 0.3);
  border-radius: 18px;
  padding: 1rem 1.3rem;
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.95rem;
`;

const ErrorBanner = styled(StatusBanner)`
  background: rgba(255, 112, 162, 0.12);
  border-color: rgba(255, 112, 162, 0.4);
`;

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(9, 10, 22, 0.72);
  backdrop-filter: ${({ $shifted }) => ($shifted ? 'none' : 'blur(6px)')};
  display: flex;
  align-items: center;
  justify-content: ${({ $shifted }) => ($shifted ? 'flex-start' : 'center')};
  padding: ${({ $shifted }) => ($shifted ? '2rem clamp(10vw, 18vw, 26vw) 2rem 2rem' : '2rem')};
  z-index: 40;
  transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  ${({ $shifted }) => $shifted && `
    transform: translateX(-2%);
    opacity: 1;
  `}
`;

const ModalContent = styled.div`
  width: ${({ $shifted }) => ($shifted ? 'min(1120px, 62vw)' : 'min(1460px, 96vw)')};
  height: min(94vh, 940px);
  max-height: min(94vh, 940px);
  overflow: hidden;
  background: ${({ theme }) => theme.colors.cardBackground};
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
  padding: 0;
  position: relative;
  display: flex;
  flex-direction: column;
  transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  backdrop-filter: ${({ $shifted }) => $shifted ? 'none' : 'blur(0)'};
  ${({ $shifted }) => $shifted && `
    transform: scale(0.97);
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.28);
  `}

  @media (max-width: 1560px) {
    width: ${({ $shifted }) => ($shifted ? 'min(1020px, 66vw)' : 'min(1320px, 94vw)')};
  }

  @media (max-width: 1320px) {
    width: ${({ $shifted }) => ($shifted ? 'min(920px, 70vw)' : 'min(1120px, 92vw)')};
  }

  @media (max-width: 1180px) {
    width: min(960px, 92vw);
  }

  @media (max-width: 1040px) {
    width: min(880px, 94vw);
  }

  @media (max-width: 900px) {
    width: min(780px, 96vw);
  }
`;

const ModalMain = styled.div`
  position: relative;
  flex: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
`;

const ModalCloseButton = styled.button`
  position: absolute;
  top: 1.2rem;
  right: 1.2rem;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.08);
  color: white;
  font-size: 1.4rem;
  font-weight: 300;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  z-index: 10;

  &:hover {
    background: rgba(255, 255, 255, 0.16);
    border-color: rgba(255, 255, 255, 0.24);
    transform: scale(1.05);
  }

  &:active {
    transform: scale(0.95);
  }
`;

const ModalHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 2rem 2.2rem 1.4rem;
  position: sticky;
  top: 0;
  z-index: 1;
  background: ${({ theme }) => theme.colors.cardBackground};
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
`;

const ModalTitle = styled.h3`
  margin: 0;
  font-size: 1.4rem;
  letter-spacing: -0.01em;
`;

const ModalMeta = styled.div`
  display: grid;
  gap: 0.6rem;
  font-size: 0.94rem;
`;

const MetaLine = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  align-items: baseline;
`;

const MetaLabel = styled.span`
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.subtleText};
`;

const MetaValue = styled.span`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
`;

const MetaHint = styled.span`
  color: ${({ theme }) => theme.colors.subtleText};
`;

const ModalScroller = styled.div`
  flex: 1;
  overflow-y: auto;
  padding-right: 0.2rem;
  padding: 0 2.2rem 2.4rem;
  margin-right: -0.2rem;
`;

const ModalBody = styled.div`
  margin-top: 1.6rem;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 18px;
  padding: 1.6rem 1.8rem 1.8rem;
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.98rem;
  line-height: 1.6;
  overflow: hidden;
`;

const ModalSections = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.6rem;
  min-height: 280px;
`;

const InsightPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
`;

const InsightSection = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  padding: 1.15rem 1.3rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
`;

const SectionTitle = styled.h4`
  margin: 0;
  font-size: 1.05rem;
  letter-spacing: -0.01em;
`;

const SectionHint = styled.span`
  font-size: 0.82rem;
  color: ${({ theme }) => theme.colors.subtleText};
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.8rem 1.1rem;
`;

const InfoRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const InfoLabel = styled.span`
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.subtleText};
`;

const InfoValue = styled.span`
  font-size: 0.95rem;
  font-weight: 500;
`;

const SummaryBlock = styled.div`
  margin-top: 1.2rem;
  padding: 1rem 1.15rem;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const SummaryLabel = styled.span`
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.subtleText};
`;

const SummaryText = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.94rem;
  line-height: 1.55;
  white-space: pre-wrap;
`;

const SummaryHint = styled.span`
  font-size: 0.82rem;
  color: ${({ theme }) => theme.colors.subtleText};
`;

const TagRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const TagChip = styled.span`
  border-radius: 999px;
  padding: 0.35rem 0.8rem;
  background: rgba(104, 123, 255, 0.18);
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.78rem;
  letter-spacing: 0.02em;
`;

const BadgeColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  align-items: flex-start;
`;

const DecisionNote = styled.span`
  font-size: 0.82rem;
  color: ${({ theme }) => theme.colors.subtleText};
`;

const SearchResults = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  margin-top: 1rem;
`;

const SearchResultCard = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 0.9rem 1rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;

  strong {
    font-size: 0.95rem;
    letter-spacing: -0.005em;
  }

  span {
    font-size: 0.85rem;
    color: ${({ theme }) => theme.colors.subtleText};
  }

  a {
    font-size: 0.82rem;
    color: ${({ theme }) => theme.colors.accent || '#6f7dff'};
    word-break: break-word;
  }
`;

const ReaderOverlay = styled.div`
  position: fixed;
  inset: 0;
  display: flex;
  justify-content: flex-end;
  align-items: stretch;
  padding: 2rem 2.2rem 2rem 0;
  pointer-events: none;
  z-index: 70;
  background: rgba(9, 10, 22, 0.2);
`;

const ReaderWindow = styled.aside`
  pointer-events: auto;
  width: clamp(530px, 41vw, 710px);
  height: 100%;
  max-height: calc(100vh - 4rem);
  background: ${({ theme }) => theme.colors.cardBackground};
  border-top-left-radius: 24px;
  border-bottom-left-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-right: none;
  box-shadow: -26px 0 60px rgba(6, 8, 22, 0.42);
  padding: 2.1rem 2.35rem 2.3rem;
  display: flex;
  flex-direction: column;
  gap: 1.4rem;
  margin-left: -2rem;
  min-height: 0;
  overflow: hidden;

  @media (max-width: 1400px) {
    width: clamp(470px, 44vw, 620px);
    margin-left: -1.7rem;
  }

  @media (max-width: 1200px) {
    width: clamp(420px, 48vw, 580px);
    margin-left: -1.2rem;
  }

  @media (max-width: 1080px) {
    width: min(420px, 92vw);
    margin-left: 0;
  }

  @media (max-width: 940px) {
    width: min(380px, 94vw);
  }

  @media (max-width: 820px) {
    width: min(360px, 96vw);
  }
`;

const ReaderHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
`;

const ReaderTitle = styled.h3`
  margin: 0;
  font-size: 1.3rem;
  letter-spacing: -0.01em;
  line-height: 1.3;
`;

const ReaderCloseButton = styled.button`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid
    ${({ theme }) => (theme.mode === 'light' ? 'rgba(15, 23, 42, 0.18)' : 'rgba(255, 255, 255, 0.16)')};
  background: ${({ theme }) => (theme.mode === 'light' ? 'rgba(15, 23, 42, 0.06)' : 'rgba(255, 255, 255, 0.08)')};
  color: ${({ theme }) => (theme.mode === 'light' ? '#111827' : theme.colors.text)};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.45rem;
  line-height: 1;
  font-weight: 300;
  cursor: pointer;
  transition: background 0.18s ease, border 0.18s ease, color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;

  &:hover {
    background: ${({ theme }) => (theme.mode === 'light' ? 'rgba(15, 23, 42, 0.12)' : 'rgba(255, 255, 255, 0.14)')};
    border-color: ${({ theme }) => (theme.mode === 'light' ? 'rgba(15, 23, 42, 0.28)' : 'rgba(255, 255, 255, 0.28)')};
    transform: translateY(-1px);
    box-shadow: ${({ theme }) => (theme.mode === 'light' ? '0 6px 12px rgba(148, 163, 184, 0.25)' : '0 8px 18px rgba(6, 8, 22, 0.45)')};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary || '#6f7dff'};
    outline-offset: 2px;
  }
`;

const ReaderMeta = styled.div`
  display: grid;
  gap: 0.45rem;
  font-size: 0.92rem;
  color: ${({ theme }) => theme.colors.subtleText};
`;

const ReaderMetaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: baseline;
`;

const ReaderMetaLabel = styled.span`
  font-size: 0.76rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.subtleText};
`;

const ReaderMetaValue = styled.span`
  color: ${({ theme }) => theme.colors.text};
  font-weight: 500;
`;

const ReaderBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding-right: 0.8rem;
  margin-right: -0.2rem;
  font-size: 1rem;
  line-height: 1.7;
  white-space: pre-wrap;
  color: ${({ theme }) => theme.colors.text};
`;

const ModalAlert = styled(ErrorBanner)`
  margin-top: 1.4rem;
`;

const LinkButton = styled.button`
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.16);
  color: ${({ theme }) => theme.colors.text};
  border-radius: 12px;
  padding: 0.55rem 0.9rem;
  cursor: pointer;
  transition: background 0.18s ease, border 0.18s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(104, 123, 255, 0.5);
  }
`;

const ModalFooter = styled.div`
  margin-top: 1.8rem;
  padding-bottom: 0.4rem;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
`;

const FooterSecondaryActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
`;

const FooterPrimaryActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
`;

const ReaderToggleButton = styled.button`
  background: ${({ theme }) => (theme.mode === 'light' ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255, 255, 255, 0.05)')};
  border: 1px solid
    ${({ theme }) => (theme.mode === 'light' ? 'rgba(15, 23, 42, 0.2)' : 'rgba(255, 255, 255, 0.16)')};
  border-radius: 12px;
  padding: 0.55rem 1rem;
  color: ${({ theme }) => (theme.mode === 'light' ? '#111827' : theme.colors.text)};
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.18s ease, border 0.18s ease, color 0.18s ease;

  &:hover {
    background: ${({ theme }) => (theme.mode === 'light' ? 'rgba(15, 23, 42, 0.12)' : 'rgba(104, 123, 255, 0.16)')};
    border-color: ${({ theme }) => (theme.mode === 'light' ? 'rgba(15, 23, 42, 0.32)' : 'rgba(104, 123, 255, 0.5)')};
    color: ${({ theme }) => (theme.mode === 'light' ? '#0f172a' : theme.colors.text)};
  }
`;

const ActionButton = styled.button`
  border-radius: 999px;
  padding: 0.65rem 1.5rem;
  font-size: 0.95rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: opacity 0.18s ease;

  ${({ $variant }) => {
    switch ($variant) {
      case 'confirm':
        return `
          background: #20e3a2;
          color: #041620;
        `;
      case 'reject':
        return `
          background: #fa3c7a;
          color: #fff;
        `;
      case 'generate':
        return `
          background: linear-gradient(135deg, #5e7dfd, #9c6dff);
          color: #fff;
        `;
      case 'snooze':
      default:
        return `
          background: #ffb347;
          color: #3d1a00;
        `;
    }
  }}

  &:hover {
    opacity: 0.88;
  }

  &:active {
    opacity: 0.78;
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;

const ReplyComposerOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(6, 7, 20, 0.78);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem 2.5rem;
  z-index: 60;
  overflow-y: auto;

  @media (max-width: 768px) {
    padding: 1.5rem;
  }
`;

const ReplyComposerContent = styled.div`
  width: min(880px, calc(100% - 3rem));
  min-height: clamp(520px, 78vh, 780px);
  max-height: min(90vh, 820px);
  background: ${({ theme }) => theme.colors.cardBackground};
  border-radius: 26px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 38px 90px rgba(0, 0, 0, 0.6);
  padding: clamp(2rem, 3vw, 2.6rem);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  overflow: hidden;

  @media (max-width: 768px) {
    width: calc(100% - 1.5rem);
    min-height: auto;
    max-height: 92vh;
  }
`;

const ReplyComposerHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ReplyComposerTitle = styled.h3`
  margin: 0;
  font-size: 1.25rem;
`;

const ReplyComposerClose = styled.button`
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(14, 18, 32, 0.68);
  color: ${({ theme }) => theme.colors.text};
  font-size: 1.15rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.35);
    opacity: 0.92;
  }

  &:active {
    transform: scale(0.96);
  }
`;

const ReplyComposerTextarea = styled.textarea`
  flex: 1;
  min-height: 320px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(11, 16, 33, 0.7);
  color: ${({ theme }) => theme.colors.text};
  padding: 1.3rem 1.5rem;
  font-family: 'Manrope', 'Segoe UI', sans-serif;
  font-size: 1.07rem;
  line-height: 1.7;
  resize: vertical;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.06), 0 20px 38px rgba(0, 0, 0, 0.45);

  &:focus {
    outline: none;
    border-color: rgba(104, 125, 255, 0.85);
    box-shadow: inset 0 0 0 1px rgba(104, 125, 255, 0.74), 0 28px 48px rgba(104, 125, 255, 0.24);
  }
`;

const ReplyComposerActions = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
`;

const ReplyComposerLeftActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.6rem;
`;

const AttachmentButton = styled.button`
  width: 44px;
  height: 44px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(255, 255, 255, 0.08);
  color: ${({ theme }) => theme.colors.text};
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.18s ease, background 0.18s ease, border-color 0.18s ease;

  &:hover {
    transform: translateY(-1px);
    background: rgba(255, 255, 255, 0.12);
    border-color: rgba(104, 125, 255, 0.55);
  }

  &:active {
    transform: scale(0.98);
  }
`;

const AttachmentList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const AttachmentChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.35rem 0.6rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.14);
  color: ${({ theme }) => theme.colors.subtleText};
  font-size: 0.82rem;
`;

const AttachmentRemove = styled.button`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: transparent;
  color: ${({ theme }) => theme.colors.subtleText};
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  &:hover {
    color: ${({ theme }) => theme.colors.text};
    border-color: rgba(255, 255, 255, 0.28);
  }
`;

const HiddenFileInput = styled.input`
  display: none;
`;

const ReplyComposerButton = styled.button`
  border-radius: 999px;
  padding: 0.7rem 1.6rem;
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0.2px;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
  background: ${({ $primary }) =>
    $primary ? 'linear-gradient(135deg, #5f7bff 0%, #9a62ff 100%)' : 'rgba(255, 255, 255, 0.08)'};
  color: ${({ $primary, theme }) => ($primary ? '#fff' : theme.colors.text)};
  border: ${({ $primary }) =>
    $primary ? 'none' : '1px solid rgba(255, 255, 255, 0.16)'};
  box-shadow: ${({ $primary }) =>
    $primary ? '0 16px 32px rgba(95, 123, 255, 0.28)' : 'inset 0 1px 0 rgba(255, 255, 255, 0.06)'};

  &:hover {
    transform: translateY(-1px);
    box-shadow: ${({ $primary }) =>
      $primary ? '0 20px 36px rgba(95, 123, 255, 0.35)' : 'inset 0 1px 0 rgba(255, 255, 255, 0.1)'};
    background: ${({ $primary }) =>
      $primary ? 'linear-gradient(135deg, #6b84ff 0%, #a36bff 100%)' : 'rgba(255, 255, 255, 0.12)'};
  }

  &:active {
    transform: translateY(0);
  }
`;

const ReplyVariantsRow = styled.div`
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
`;

const ReplyVariantButton = styled.button`
  border-radius: 14px;
  padding: 0.45rem 0.9rem;
  border: 1px solid ${({ theme, $active }) => ($active ? theme.colors.primary : 'rgba(255, 255, 255, 0.12)')};
  background: ${({ theme, $active }) => ($active ? 'rgba(75, 163, 255, 0.12)' : 'transparent')};
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.9rem;
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const ReplyStatusMessage = styled.p`
  margin: 0;
  color: ${({ $error }) => ($error ? '#ff4d4f' : '#4ba3ff')};
  font-size: 0.88rem;
`;

const DECISION_LABELS = {
  confirmed: 'Підтверджено',
  rejected: 'Відхилено',
  snoozed: 'Відкладено',
};

const DECISION_ROW_TONES = {
  confirmed: 'rgba(31, 226, 155, 0.12)',
  rejected: 'rgba(250, 60, 122, 0.12)',
  snoozed: 'rgba(255, 179, 71, 0.16)',
};

const WAITING_ROW_TONE = 'rgba(190, 201, 226, 0.14)';

const BADGE_LABELS = {
  confirmed: DECISION_LABELS.confirmed,
  rejected: DECISION_LABELS.rejected,
  snoozed: DECISION_LABELS.snoozed,
  qualified: 'Кваліфікований',
  new: 'Новий',
  waiting: 'Очікує',
  call_lead: '📞 Дзвінок з лідом',
};

const STATUS_TOOLTIPS = {
  confirmed: 'Лід підтверджено - готовий до подальшої роботи',
  rejected: 'Лід відхилено - не релевантний',
  snoozed: 'Лід відкладено - повернутись пізніше',
  qualified: 'Кваліфікований лід - має контактні дані',
  new: 'Новий лід - потребує опрацювання',
  waiting: 'Очікує на відповідь або дію',
  call_lead: '🎯 ВАЖЛИВО: Потрібно зателефонувати ліду!',
};

const getLeadKey = (lead) => {
  if (!lead) return 'unknown';
  if (lead.gmail_id) return `${lead.gmail_id}`;
  if (lead.id) return `${lead.id}`;
  const email = (lead.email || '').trim().toLowerCase();
  if (email) return `email:${email}`;
  const fallback = lead.full_name || 'lead';
  return `${fallback}-${lead.received_at || ''}`;
};

const getLeadStatus = (lead) => (lead?.status || 'waiting').toLowerCase();

const isEmptyLeadRow = (lead) => {
  if (!lead) return true;
  const email = (lead.email || '').trim();
  const subject = (lead.subject || '').trim();
  const body = (lead.body || '').trim();
  return !email && !subject && !body;
};

const getLeadCompletenessScore = (lead) => {
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

const normalizeLeadInsights = (lead) => {
  if (!lead) return null;

  const personLinksRaw = lead.person_links;
  let personLinks = [];
  if (Array.isArray(personLinksRaw)) {
    personLinks = personLinksRaw.filter(Boolean);
  } else if (typeof personLinksRaw === 'string' && personLinksRaw.trim()) {
    personLinks = personLinksRaw
      .split(';')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  const personInsights = Array.isArray(lead.person_insights) ? lead.person_insights : [];
  const companyInsights = Array.isArray(lead.company_insights) ? lead.company_insights : [];
  const personSummary = lead.person_summary || '';
  const firstName = lead.first_name || '';
  const lastName = lead.last_name || '';

  return {
    ...lead,
    person_links: personLinks,
    person_insights: personInsights,
    company_insights: companyInsights,
    person_summary: personSummary,
    first_name: firstName,
    last_name: lastName,
  };
};

const RANGE_OPTIONS = [7, 14, 30];

const getRangeLabel = (days) => {
  switch (days) {
    case 7:
      return '7 днів';
    case 14:
      return '14 днів';
    case 30:
      return '30 днів';
    default:
      return `${days} днів`;
  }
};

const useLeadData = (initialPayload, onAfterFetch) => {
  const [data, setData] = useState(() => initialPayload ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async (options = {}) => {
    setLoading(true);
    setError(null);

    try {
      const response = await getGmailLeads();
      if (!response) {
        throw new Error('Порожня відповідь від сервера');
      }
      setData(response);
      onAfterFetch?.(response, options);
      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Сталася помилка';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [onAfterFetch]);

  const refresh = useCallback((options) => fetchData(options), [fetchData]);

  return {
    data,
    loading,
    error,
    refresh,
  };
};

const isQualifiedLead = (lead) => {
  if (!lead) return false;
  return Boolean(lead.phone || lead.website || lead.company || lead.company_name);
};

const parseDate = (value) => {
  if (!value) return null;
  const normalized = value.endsWith('Z') ? value : `${value}`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDate = (value, locale = 'uk-UA') => {
  const date = parseDate(value);
  if (!date) return '—';
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const formatRelative = (value) => {
  const date = parseDate(value);
  if (!date) return '—';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) {
    const diffHours = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60)));
    return `${diffHours} год тому`;
  }
  if (diffDays === 1) return 'Вчора';
  if (diffDays < 7) return `${diffDays} дн. тому`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 5) return `${diffWeeks} тиж. тому`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths} міс. тому`;
  const diffYears = Math.floor(diffMonths / 12);
  return `${diffYears} р. тому`;
};

const Automation = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { activeModals, openModal, closeModal: closeGlobalModal } = useModalManager();
  const { leadSnapshot, updateLeadSnapshot, pushNotification } = useAuth();
  const { data, loading, error, refresh } = useLeadData(leadSnapshot, updateLeadSnapshot);
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [rangeFilter, setRangeFilter] = useState(30);
  const [rangeMenuOpen, setRangeMenuOpen] = useState(false);
  const rangeRef = useRef(null);
  const [selectedLead, setSelectedLead] = useState(null);
  const [decisions, setDecisions] = useState({});
  const [insightsError, setInsightsError] = useState(null);
  const [statusError, setStatusError] = useState(null);
  const [showReader, setShowReader] = useState(false);
  const [showReplyComposer, setShowReplyComposer] = useState(false);
  const [replyOptions, setReplyOptions] = useState({ quick: '', follow_up: '', recap: '' });
  const [replyOptionsByStyle, setReplyOptionsByStyle] = useState({ official: null, semi_official: null });
  const [selectedReplyKey, setSelectedReplyKey] = useState('');
  const [replyDraft, setReplyDraft] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);
  const [replyError, setReplyError] = useState(null);
  const [replyStyle, setReplyStyle] = useState('semi_official');
  const [replyAttachments, setReplyAttachments] = useState([]);
  const fileInputRef = useRef(null);

  const leads = useMemo(() => {
    const leadsData = data?.leads ?? [];
    console.log('🔍 Debug - data:', data);
    console.log('🔍 Debug - leads:', leadsData);
    console.log('🔍 Debug - leads count:', leadsData.length);
    return leadsData;
  }, [data]);

  const orderedLeads = useMemo(() => {
    const cleaned = (leads || []).filter((lead) => !isEmptyLeadRow(lead));
    return cleaned
      .map((lead) => ({
        ...lead,
        _receivedAt: parseDate(lead.received_at),
        _score: getLeadCompletenessScore(lead),
      }))
      .sort((a, b) => {
        if (a._score !== b._score) return b._score - a._score;
        const aTime = a._receivedAt ? a._receivedAt.getTime() : 0;
        const bTime = b._receivedAt ? b._receivedAt.getTime() : 0;
        return bTime - aTime;
      })
      .map(({ _receivedAt, _score, ...rest }) => rest);
  }, [leads]);

  const dedupedLeads = useMemo(() => {
    const byEmail = new Map();
    const counts = new Map();

    const keyFor = (lead) => {
      const email = (lead?.email || '').trim().toLowerCase();
      if (email) return `email:${email}`;
      const gid = (lead?.gmail_id || '').trim();
      return gid ? `gmail:${gid}` : `row:${lead?.sheet_row || lead?.sheetRow || ''}`;
    };

    orderedLeads.forEach((lead) => {
      const key = keyFor(lead);
      counts.set(key, (counts.get(key) || 0) + 1);

      const current = byEmail.get(key);
      if (!current) {
        byEmail.set(key, lead);
        return;
      }

      const currentDate = parseDate(current.received_at);
      const nextDate = parseDate(lead.received_at);
      const currentTime = currentDate ? currentDate.getTime() : 0;
      const nextTime = nextDate ? nextDate.getTime() : 0;

      if (nextTime > currentTime) {
        byEmail.set(key, lead);
        return;
      }
      if (nextTime === currentTime) {
        const currentScore = getLeadCompletenessScore(current);
        const nextScore = getLeadCompletenessScore(lead);
        if (nextScore > currentScore) byEmail.set(key, lead);
      }
    });

    return Array.from(byEmail.entries())
      .map(([key, lead]) => ({ ...lead, _messagesFromEmail: counts.get(key) || 1 }))
      .sort((a, b) => {
        const aTime = (parseDate(a.received_at)?.getTime() || 0);
        const bTime = (parseDate(b.received_at)?.getTime() || 0);
        return bTime - aTime;
      });
  }, [orderedLeads]);

  const handleRowClick = useCallback(async (lead) => {
    setSelectedLead(lead);
    setShowReader(false);
    setShowReplyComposer(false);
    setInsightsError(null);
    setReplyOptions({ quick: '', follow_up: '', recap: '' });
    setSelectedReplyKey('');
    setReplyDraft('');
    setReplyError(null);
    setReplyStyle('semi_official');

    try {
      const needsEnrichment = !lead?.full_name && !lead?.company_info && !lead?.person_summary;
      if (!needsEnrichment) return;

      const enriched = await postLeadInsights({
        sender: lead.email || 'unknown@example.com',
        subject: lead.subject || '',
        body: lead.body || '',
      });
      if (enriched) {
        setSelectedLead((prev) => ({ ...(prev || lead), ...enriched }));
      }
    } catch (err) {
      setInsightsError(err?.message || 'Не вдалося завантажити інсайти.');
    }
  }, []);

  // Effect to open lead if passed from Analytics
  useEffect(() => {
    const emailToOpen = location.state?.openLeadEmail;
    if (emailToOpen && dedupedLeads.length > 0) {
      const lead = dedupedLeads.find(l => l.email === emailToOpen);
      if (lead) {
        // Clear state to avoid reopening on every render
        window.history.replaceState({}, document.title);
        handleRowClick(lead);
      }
    }
  }, [location.state, dedupedLeads, handleRowClick]);

  const filteredLeads = useMemo(() => {
    const text = searchTerm.trim().toLowerCase();
    const now = new Date();
    const rangeLimitMs = rangeFilter ? rangeFilter * 24 * 60 * 60 * 1000 : null;

    return dedupedLeads.filter((lead) => {
      const leadDate = parseDate(lead.received_at);
      if (rangeLimitMs && leadDate) {
        if (now.getTime() - leadDate.getTime() > rangeLimitMs) {
          return false;
        }
      }

      const qualified = isQualifiedLead(lead);
      const decisionStatus = decisions[getLeadKey(lead)]?.status;
      const status = (decisionStatus ?? getLeadStatus(lead) ?? '').toLowerCase();
      const badgeVariantForFilter =
        status === 'call_lead'
          ? 'call_lead'
          : ['confirmed', 'rejected', 'snoozed'].includes(status)
            ? status
            : status === 'waiting'
              ? 'waiting'
              : qualified
                ? 'qualified'
                : 'new';

      if (stageFilter !== 'all' && badgeVariantForFilter !== stageFilter) return false;

      if (!text) return true;

      const haystack = [
        lead.full_name,
        lead.first_name,
        lead.last_name,
        lead.email,
        lead.subject,
        lead.company,
        lead.company_name,
        lead.body,
        lead.person_summary,
        lead.company_info,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(text);
    });
  }, [dedupedLeads, stageFilter, searchTerm, rangeFilter, decisions]);

  const summary = data?.stats ?? {};

  const {
    totalLeads,
    waitingCount,
    confirmedCount,
    rejectedCount,
    processedCount,
    processedPercentage,
    qualifiedCount,
  } = useMemo(() => {
    let waiting = 0;
    let confirmed = 0;
    let rejected = 0;
    let qualified = 0;

    dedupedLeads.forEach((lead) => {
      const decisionStatus = decisions[getLeadKey(lead)]?.status;
      const status = (decisionStatus ?? getLeadStatus(lead) ?? '').toLowerCase();

      if (status === 'waiting') {
        waiting += 1;
      } else if (status === 'confirmed') {
        confirmed += 1;
      } else if (status === 'rejected') {
        rejected += 1;
      }

      if (isQualifiedLead(lead)) {
        qualified += 1;
      }
    });

    const total = dedupedLeads.length;
    const processed = confirmed + rejected;
    const processedPct = total ? Math.round((processed / total) * 100) : 0;

    return {
      totalLeads: total,
      waitingCount: waiting,
      confirmedCount: confirmed,
      rejectedCount: rejected,
      processedCount: processed,
      processedPercentage: processedPct,
      qualifiedCount: qualified,
    };
  }, [dedupedLeads, decisions]);

  const qualifiedShare = totalLeads ? Math.round((qualifiedCount / totalLeads) * 100) : 0;
  const waitingShare = totalLeads ? Math.round((waitingCount / totalLeads) * 100) : 0;

  const selectedInsights = useMemo(() => normalizeLeadInsights(selectedLead), [selectedLead]);
  const selectedPerson = selectedInsights?.person_insights?.[0];
  const selectedCompanyInsights = selectedInsights?.company_insights ?? [];
  const selectedCompanySummary = useMemo(() => {
    if (!selectedInsights && !selectedLead) return '';
    return (
      selectedInsights?.company_summary ||
      selectedInsights?.company_info ||
      selectedLead?.company_info ||
      ''
    );
  }, [selectedInsights, selectedLead]);

  const closeReplyComposer = useCallback(() => {
    setShowReplyComposer(false);
    setReplyDraft('');
    setSelectedReplyKey('');
    setReplyOptions({ quick: '', follow_up: '', recap: '' });
    setReplyOptionsByStyle({ official: null, semi_official: null });
    setReplyError(null);
    setReplyStyle('semi_official');
    setReplyAttachments([]);
  }, []);

  const closeLocalModal = useCallback(() => {
    setSelectedLead(null);
    setShowReader(false);
    setShowReplyComposer(false);
    setReplyOptionsByStyle({ official: null, semi_official: null });
    setReplyDraft('');
    setReplyError(null);
    setReplyStyle('semi_official');
    setReplyAttachments([]);
  }, []);

  const handlePickAttachments = useCallback(() => {
    fileInputRef.current?.click?.();
  }, []);

  const handleFilesSelected = useCallback((event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setReplyAttachments((prev) => {
      const next = [...prev];
      files.forEach((f) => {
        const id = `${f.name}-${f.size}-${f.lastModified}`;
        if (!next.some((x) => x.id === id)) next.push({ id, file: f });
      });
      return next;
    });
    event.target.value = '';
  }, []);

  const removeAttachment = useCallback((id) => {
    setReplyAttachments((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const handleSelectRange = (value) => {
    setRangeFilter(value);
    setRangeMenuOpen(false);
  };

  const toggleRangeMenu = () => {
    setRangeMenuOpen(prev => !prev);
  };

  const toggleReader = () => {
    setShowReader(prev => !prev);
  };

  const handleRowKeyDown = (event, lead) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleRowClick(lead);
    }
  };

  const handleSelectReplyOption = (key) => {
    setSelectedReplyKey(key);
    setReplyDraft(replyOptions[key] || '');
  };

  const handleGenerateReplies = useCallback(async (nextStyle, options = {}) => {
    if (!selectedLead) return;
    setReplyLoading(true);
    setReplyError(null);
    try {
      const styleToUse = nextStyle || replyStyle || 'semi_official';
      if (nextStyle) {
        setReplyStyle(nextStyle);
      }
      const cached = replyOptionsByStyle?.[styleToUse];
      if (cached && !options?.force) {
        setReplyOptions(cached);
        const priorityOrder = ['quick', 'follow_up', 'recap'];
        const populatedKeys = priorityOrder.filter((key) => (cached[key] || '').trim());
        const primaryKey = populatedKeys[0] || '';
        const preserveSelectedKey = Boolean(options?.preserveSelectedKey);
        const preferredKey =
          preserveSelectedKey && selectedReplyKey && (cached[selectedReplyKey] || '').trim() ? selectedReplyKey : primaryKey;
        setSelectedReplyKey(preferredKey);
        setReplyDraft(preferredKey ? cached[preferredKey] : '');
        return;
      }
      const response = await postGenerateReplies({
        sender: selectedLead.email || 'unknown@example.com',
        subject: selectedLead.subject || '',
        body: selectedLead.body || '',
        lead: selectedLead,
        style: styleToUse,
      });

      const replies = response?.replies || {};
      const normalizedReplies = {
        quick: typeof replies.quick === 'string' ? replies.quick : '',
        follow_up: typeof replies.follow_up === 'string' ? replies.follow_up : '',
        recap: typeof replies.recap === 'string' ? replies.recap : '',
      };

      setReplyOptions(normalizedReplies);
      setReplyOptionsByStyle((prev) => ({ ...(prev || {}), [styleToUse]: normalizedReplies }));

      const priorityOrder = ['quick', 'follow_up', 'recap'];
      const populatedKeys = priorityOrder.filter((key) => (normalizedReplies[key] || '').trim());
      const primaryKey = populatedKeys[0] || '';

      const preserveSelectedKey = Boolean(options?.preserveSelectedKey);
      const preferredKey =
        preserveSelectedKey && selectedReplyKey && (normalizedReplies[selectedReplyKey] || '').trim()
          ? selectedReplyKey
          : primaryKey;

      setSelectedReplyKey(preferredKey);
      setReplyDraft(preferredKey ? normalizedReplies[preferredKey] : '');
      setShowReplyComposer(true);
      if (!populatedKeys.length) {
        setReplyError('Модель не повернула відповідей. Спробуйте пізніше.');
      } else if (populatedKeys.length === 1) {
        setReplyError('Згенеровано лише один варіант. Перевірте шаблони у налаштуваннях.');
      }
    } catch (error) {
      setReplyError(error?.message || 'Не вдалося згенерувати відповідь.');
      setShowReplyComposer(true);
    } finally {
      setReplyLoading(false);
    }
  }, [selectedLead, replyStyle, selectedReplyKey, replyOptionsByStyle]);

  const refreshAndSync = useCallback(async () => {
    await refresh({ isManualRefresh: true });
  }, [refresh]);

  const handleDecisionWithReason = useCallback(
    async (status, rejectionReason) => {
      if (!selectedLead) return;

      const gmailId = selectedLead.gmail_id || selectedLead.gmailId;
      const rowNumber = selectedLead.sheet_row || selectedLead.sheetRow;
      if (!gmailId && !rowNumber) {
        setStatusError('Не знайдено ідентифікатор ліда для збереження статусу.');
        return;
      }

      const decidedAt = new Date().toISOString();
      setDecisions((prev) => ({
        ...prev,
        [getLeadKey(selectedLead)]: {
          status,
          decidedAt,
          rejectionReason,
        },
      }));
      setStatusError(null);

      closeLocalModal();

      try {
        if (gmailId) {
          await postLeadStatus({ 
            gmail_id: gmailId, 
            status,
            rejection_reason: rejectionReason 
          });
        } else {
          await postLeadStatus({ 
            row_number: rowNumber, 
            status,
            rejection_reason: rejectionReason 
          });
        }
        await refresh({ isManualRefresh: true });
        pushNotification({
          variant: 'success',
          title: 'Статус оновлено',
          message: `Статус змінено на "${DECISION_LABELS[status]}"${rejectionReason ? ` з причиною: ${rejectionReason}` : ''}`,
        });
      } catch (error) {
        setDecisions((prev) => {
          const key = getLeadKey(selectedLead);
          const updated = { ...prev };
          delete updated[key];
          return updated;
        });
        setStatusError(error instanceof Error ? error.message : 'Не вдалося оновити статус.');
      }
    },
    [selectedLead, refresh, pushNotification, closeLocalModal]
  );

  const handleConfirmClick = useCallback(async () => {
    if (!selectedLead || replyLoading) return;
    // Open immediately, then fill content as it arrives.
    setShowReplyComposer(true);
    setReplyError(null);
    setReplyDraft('');
    setReplyOptions({ quick: '', follow_up: '', recap: '' });
    setSelectedReplyKey('quick');
    // Force fetch to ensure latest Settings (top/bottom blocks + prompts) are applied.
    void handleGenerateReplies(replyStyle, { preserveSelectedKey: true, force: true });
    // Pre-warm the other style in background for instant toggle.
    const otherStyle = replyStyle === 'official' ? 'semi_official' : 'official';
    void handleGenerateReplies(otherStyle, { preserveSelectedKey: true });
  }, [selectedLead, replyLoading, handleGenerateReplies, replyStyle]);

  const handleDecision = useCallback(
    async (status) => {
      if (!selectedLead) return;

      if (status === 'rejected') {
        openModal({
          id: 'reject-form',
          type: 'reject_modal',
          props: {
            title: 'Відхилення ліда',
            content: (
              <div style={{ padding: '0.8rem 0.2rem' }}>
                <p style={{ marginTop: 0 }}>
                  <strong>Лід:</strong> {selectedLead.full_name || selectedLead.email}
                </p>
                <p style={{ marginBottom: '1rem', color: theme.colors.subtleText }}>
                  Будь ласка, вкажіть причину відхилення
                </p>
                <textarea
                  id="rejection-reason"
                  required
                  placeholder="Наприклад: Не відповідає нашим критеріям / Бюджет занадто низький / Не є цільовою аудиторією..."
                  style={{
                    width: '100%',
                    minHeight: '110px',
                    padding: '0.75rem',
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: '8px',
                    background: theme.colors.cardBackground,
                    color: theme.colors.text,
                    resize: 'vertical',
                  }}
                />
                <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => closeGlobalModal('reject-form')}
                    style={{
                      padding: '0.5rem 1rem',
                      border: `1px solid ${theme.colors.border}`,
                      borderRadius: '6px',
                      background: 'transparent',
                      color: theme.colors.text,
                      cursor: 'pointer',
                    }}
                    type="button"
                  >
                    Скасувати
                  </button>
                  <button
                    onClick={() => {
                      const reason = document.getElementById('rejection-reason').value.trim();
                      if (!reason) {
                        alert('Будь ласка, вкажіть причину відхилення');
                        return;
                      }
                      closeGlobalModal('reject-form');
                      handleDecisionWithReason(status, reason);
                    }}
                    style={{
                      padding: '0.5rem 1rem',
                      border: 'none',
                      borderRadius: '6px',
                      background: '#be123c',
                      color: 'white',
                      cursor: 'pointer',
                    }}
                    type="button"
                  >
                    Відхилити
                  </button>
                </div>
              </div>
            ),
          },
        });
        return;
      }

      handleDecisionWithReason(status, null);
    },
    [selectedLead, openModal, closeGlobalModal, theme, handleDecisionWithReason]
  );

  const handleSendReply = useCallback(async () => {
    if (!selectedLead || !replyDraft.trim()) {
      setReplyError('Будь ласка, напишіть текст відповіді');
      return;
    }

    try {
      const payload = {
        to: selectedLead.email,
        subject: `Re: ${selectedLead.subject || 'Без теми'}`,
        body: replyDraft,
        attachments: replyAttachments.map(item => item.file)
      };

      await sendEmailWithAttachments(payload);
      
      pushNotification({
        variant: 'success',
        title: 'Лист надіслано',
        message: `Відповідь надіслано на ${selectedLead.email}${replyAttachments.length > 0 ? ` з ${replyAttachments.length} файлами` : ''}`,
      });

      // Очистимо форму
      setReplyDraft('');
      setReplyAttachments([]);
      setShowReplyComposer(false);
      
      // Оновимо статус ліда
      await handleDecisionWithReason('confirmed', null);
      
    } catch (error) {
      setReplyError(error?.message || 'Не вдалося надіслати лист');
    }
  }, [selectedLead, replyDraft, replyAttachments, pushNotification, handleDecisionWithReason]);

  return (
    <PageContainer>
      <PageHeader>
        <TitleBlock>
          <h1>Робоча зона</h1>
          <p>
            Центральна панель для керування вхідними лідами. Відслідковуйте активність, підтвердження відповіді GPT й людини
            та структуруйте фокус команди за хвилини.
          </p>
        </TitleBlock>
        <HeaderActions>
          <RefreshButton type="button" onClick={refreshAndSync} disabled={loading}>
            Оновити дані
          </RefreshButton>
        </HeaderActions>
      </PageHeader>

      {loading && <StatusBanner>Завантаження даних по лідах…</StatusBanner>}
      {error && <ErrorBanner>Не вдалося отримати інформацію: {error}</ErrorBanner>}

      <SummaryGrid>
        <SummaryCard>
          <span>Активні за {getRangeLabel(rangeFilter)}</span>
          <strong>{summary.active ?? 0}</strong>
          <small>Лідів, які відповіли останнім часом</small>
        </SummaryCard>
        <SummaryCard>
          <span>Всього лідів</span>
          <strong>{totalLeads}</strong>
          <small>Синхронізовано з Gmail та Sheets</small>
        </SummaryCard>
        <SummaryCard>
          <span>Очікують дії</span>
          <strong>{waitingCount}</strong>
          <small>{waitingShare}% від загальної кількості</small>
        </SummaryCard>
        <SummaryCard>
          <span>Опрацьовано</span>
          <strong>{processedCount}</strong>
          <small>
            {processedPercentage}% від усіх • Прийнято: {confirmedCount} • Відхилено: {rejectedCount}
          </small>
        </SummaryCard>
        <SummaryCard>
          <span>Кваліфіковані</span>
          <strong>{qualifiedCount}</strong>
          <small>{qualifiedShare}% мають контактні дані чи компанію</small>
        </SummaryCard>
      </SummaryGrid>

      <ControlsRow>
        <Filters>
          <SearchInput
            type="search"
            placeholder="Пошук за ім'ям, email або темою"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          <Select value={stageFilter} onChange={(event) => setStageFilter(event.target.value)}>
            <option value="all">Усі статуси</option>
            <option value="new">Нові</option>
            <option value="waiting">В очікуванні</option>
            <option value="call_lead">Дзвінок з лідом</option>
            <option value="qualified">Кваліфіковані</option>
            <option value="confirmed">Підтверджено</option>
            <option value="rejected">Відхилено</option>
            <option value="snoozed">Відкладено</option>
          </Select>
          <RangeSelector ref={rangeRef}>
            <RangeButton type="button" onClick={toggleRangeMenu}>
              Період: {getRangeLabel(rangeFilter)}
              <span className="toggle" aria-hidden="true">{rangeMenuOpen ? '▴' : '▾'}</span>
            </RangeButton>
            {rangeMenuOpen && (
              <RangeDropdown>
                {RANGE_OPTIONS.map((days) => (
                  <RangeOption
                    key={days}
                    type="button"
                    onClick={() => handleSelectRange(days)}
                    $active={rangeFilter === days}
                  >
                    {`Останні ${getRangeLabel(days)}`}
                    <span>
                      {days === 7 ? 'Фокус на тиждень' : days === 14 ? 'Двотижневий перегляд' : 'Місячна активність'}
                    </span>
                  </RangeOption>
                ))}
              </RangeDropdown>
            )}
          </RangeSelector>
        </Filters>
        <span style={{ color: theme.colors.subtleText, fontSize: '0.95rem' }}>
          Показано {filteredLeads.length} / {dedupedLeads.length}
        </span>
      </ControlsRow>

      <LeadsPanel>
        <PanelHeader>
          <h2>Список лідів</h2>
          <span>Автоматично оновлюється після синхронізації Gmail</span>
        </PanelHeader>

        <TableWrapper>
          {filteredLeads.length === 0 ? (
            <EmptyState>
              Немає лідів, що відповідають вибраним фільтрам. Змініть фільтри або запустіть синхронізацію.
            </EmptyState>
          ) : (
            <LeadsTable>
              <thead>
                <tr>
                  <th>Лід</th>
                  <th>Компанія</th>
                  <th>Повідомлення</th>
                  <th>Оновлено</th>
                  <th>Статус</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead, index) => {
                  const qualified = isQualifiedLead(lead);
                  const key = getLeadKey(lead);
                  const decision = decisions[key];
                  const leadStatus = getLeadStatus(lead);
                  const decisionStatus = decision?.status;
                  const resolvedStatus = decisionStatus ?? leadStatus;
                  const badgeVariant =
                    resolvedStatus === 'call_lead'
                      ? 'call_lead'
                      : ['confirmed', 'rejected', 'snoozed'].includes(resolvedStatus)
                      ? resolvedStatus
                      : resolvedStatus === 'waiting'
                      ? 'waiting'
                      : qualified
                      ? 'qualified'
                      : 'new';
                  const badgeLabel = BADGE_LABELS[badgeVariant] ?? BADGE_LABELS.new;
                  const rowStyle = DECISION_ROW_TONES[resolvedStatus]
                    ? { '--row-bg': DECISION_ROW_TONES[resolvedStatus] }
                    : resolvedStatus === 'waiting'
                    ? { '--row-bg': WAITING_ROW_TONE }
                    : undefined;
                  const displayName = lead.full_name || [lead.first_name, lead.last_name].filter(Boolean).join(' ') || 'Невідомий контакт';
                  const companySummary = lead.company_info;

                  return (
                    <tr
                      key={key}
                      style={rowStyle}
                      onClick={() => handleRowClick(lead)}
                      onKeyDown={(event) => handleRowKeyDown(event, lead)}
                      role="button"
                      tabIndex={0}
                    >
                      <td>
                        <LeadName>{displayName}</LeadName>
                        <LeadEmail>{lead.email || 'email не вказано'}</LeadEmail>
                        {lead._messagesFromEmail > 1 && <LeadMeta>Останній лист • ще {lead._messagesFromEmail - 1} з цього email</LeadMeta>}
                        {lead.person_summary && <LeadMeta>{lead.person_summary}</LeadMeta>}
                      </td>
                      <td>
                        <LeadSubject>{lead.company || lead.company_name || '—'}</LeadSubject>
                        <LeadMeta>{lead.website || 'Сайт не вказано'}</LeadMeta>
                        {companySummary && <LeadMeta>{companySummary}</LeadMeta>}
                      </td>
                      <td>
                        <LeadSubject>{lead.subject || 'Без теми'}</LeadSubject>
                        <LeadMeta>
                          {(lead.body || '').slice(0, 120)}
                          {(lead.body || '').length > 120 ? '…' : ''}
                        </LeadMeta>
                      </td>
                      <td>
                        <LeadSubject>{formatDate(lead.received_at)}</LeadSubject>
                        <LeadMeta>{formatRelative(lead.received_at)}</LeadMeta>
                      </td>
                      <td>
                        <BadgeColumn>
                          <StatusBadge 
                            $variant={badgeVariant}
                            title={STATUS_TOOLTIPS[badgeVariant] || STATUS_TOOLTIPS.new}
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              if (lead?.email) {
                                navigate(`/lead/${encodeURIComponent(lead.email)}`);
                              }
                            }}
                          >
                            {badgeLabel}
                          </StatusBadge>
                          {decision && (
                            <DecisionNote>
                              {`Рішення: ${DECISION_LABELS[decision.status]} • ${formatRelative(decision.decidedAt)}`}
                            </DecisionNote>
                          )}
                        </BadgeColumn>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </LeadsTable>
          )}
        </TableWrapper>
      </LeadsPanel>

      {activeModals
        .filter((modal) => modal?.type === 'reject_modal')
        .map((modal) => (
          <ModalOverlay
            key={modal.id}
            onClick={() => closeGlobalModal(modal.id)}
            $shifted={false}
          >
            <ModalContent
              onClick={(event) => event.stopPropagation()}
              $shifted={false}
              style={{ height: 'min(86vh, 560px)' }}
            >
              <ModalMain>
                <ModalCloseButton type="button" onClick={() => closeGlobalModal(modal.id)} aria-label="Закрити">
                  ×
                </ModalCloseButton>
                <ModalHeader>
                  <ModalTitle>{modal?.props?.title || 'Відхилення'}</ModalTitle>
                </ModalHeader>
                <ModalScroller>
                  <ModalBody>{modal?.props?.content}</ModalBody>
                </ModalScroller>
              </ModalMain>
            </ModalContent>
          </ModalOverlay>
        ))}

      {selectedLead && (
        <ModalOverlay onClick={closeLocalModal} $shifted={showReader}>
          <ModalContent
            onClick={(event) => event.stopPropagation()}
            $shifted={showReader}
          >
            <ModalMain>
              <ModalCloseButton type="button" onClick={closeLocalModal} aria-label="Закрити">×</ModalCloseButton>
              <ModalHeader>
                <ModalTitle>{selectedLead.subject || 'Без теми'}</ModalTitle>
                <ModalMeta>
                  <MetaLine>
                    <MetaLabel>Від</MetaLabel>
                    <MetaValue>{selectedLead.full_name || 'Невідомий контакт'}</MetaValue>
                    {selectedLead.email && <MetaHint>({selectedLead.email})</MetaHint>}
                  </MetaLine>
                  {(selectedLead.company || selectedLead.company_name) && (
                    <MetaLine>
                      <MetaLabel>Компанія</MetaLabel>
                      <MetaValue>{selectedLead.company || selectedLead.company_name}</MetaValue>
                      {selectedLead.website && <MetaHint>{selectedLead.website}</MetaHint>}
                    </MetaLine>
                  )}
                  <MetaLine>
                    <MetaLabel>Отримано</MetaLabel>
                    <MetaValue>{formatDate(selectedLead.received_at)}</MetaValue>
                    <MetaHint>{formatRelative(selectedLead.received_at)}</MetaHint>
                  </MetaLine>
                  <MetaLine>
                    <MetaLabel>Телефон</MetaLabel>
                    <MetaValue>{selectedLead.phone || 'Телефон не вказано'}</MetaValue>
                  </MetaLine>
                </ModalMeta>
              </ModalHeader>
              <ModalScroller>
                <ModalBody>
                  <ModalSections>
                    <InsightPanel>
                      {insightsError ? (
                        <ErrorBanner>Не вдалося завантажити інсайти: {insightsError}</ErrorBanner>
                      ) : (
                        <>
                          <InsightSection>
                            <SectionTitle>Профіль контакту</SectionTitle>
                            <SectionHint>Автоматична довідка за ім'ям та листом</SectionHint>
                            <InfoGrid>
                              <InfoRow>
                                <InfoLabel>Ім'я</InfoLabel>
                                <InfoValue>
                                  {selectedInsights?.full_name || [selectedInsights?.first_name, selectedInsights?.last_name]
                                    .filter(Boolean)
                                    .join(' ') || selectedPerson?.title || '—'}
                                </InfoValue>
                              </InfoRow>
                              {(selectedInsights?.first_name || selectedInsights?.last_name) && (
                                <InfoRow>
                                  <InfoLabel>Ім'я / Прізвище</InfoLabel>
                                  <InfoValue>
                                    {[selectedInsights?.first_name, selectedInsights?.last_name].filter(Boolean).join(' ') || '—'}
                                  </InfoValue>
                                </InfoRow>
                              )}
                              <InfoRow>
                                <InfoLabel>Роль</InfoLabel>
                                <InfoValue>{selectedInsights?.person_role || selectedPerson?.snippet || 'Потребує уточнення'}</InfoValue>
                              </InfoRow>
                              <InfoRow>
                                <InfoLabel>Локація</InfoLabel>
                                <InfoValue>{selectedInsights?.person_location || '—'}</InfoValue>
                              </InfoRow>
                              <InfoRow>
                                <InfoLabel>Досвід</InfoLabel>
                                <InfoValue>{selectedInsights?.person_experience || '—'}</InfoValue>
                              </InfoRow>
                              <InfoRow>
                                <InfoLabel>Email</InfoLabel>
                                <InfoValue>{selectedInsights?.email || selectedLead.email || '—'}</InfoValue>
                              </InfoRow>
                              <InfoRow>
                                <InfoLabel>Телефон</InfoLabel>
                                <InfoValue>{selectedInsights?.phone_number || selectedLead.phone || '—'}</InfoValue>
                              </InfoRow>
                            </InfoGrid>
                            <SummaryBlock>
                              <SummaryLabel>Коротко</SummaryLabel>
                              {selectedInsights?.person_summary ? (
                                <SummaryText>{selectedInsights.person_summary}</SummaryText>
                              ) : (
                                <SummaryHint>Немає зведеної інформації</SummaryHint>
                              )}
                            </SummaryBlock>
                            {!!selectedInsights?.person_links?.length && (
                              <TagRow>
                                {selectedInsights.person_links.slice(0, 3).map((link) => (
                                  <TagChip as="a" key={link} href={link} target="_blank" rel="noopener noreferrer">
                                    {link}
                                  </TagChip>
                                ))}
                              </TagRow>
                            )}
                            {!!selectedInsights?.person_insights?.length && (
                              <SearchResults>
                                {selectedInsights.person_insights.slice(0, 3).map((item, index) => (
                                  <SearchResultCard key={`${item.url || index}-${index}`}>
                                    <strong>{item.title || `Згадка ${index + 1}`}</strong>
                                    {item.snippet && <span>{item.snippet}</span>}
                                    {item.url && (
                                      <a href={item.url} target="_blank" rel="noopener noreferrer">
                                        {item.url}
                                      </a>
                                    )}
                                  </SearchResultCard>
                                ))}
                              </SearchResults>
                            )}
                          </InsightSection>

                          <InsightSection>
                            <SectionTitle>Інформація про компанію</SectionTitle>
                            <SectionHint>Підтягуємо з відкритих джерел та GPT</SectionHint>
                            <InfoGrid>
                              <InfoRow>
                                <InfoLabel>Компанія</InfoLabel>
                                <InfoValue>
                                  {selectedInsights?.company || selectedLead.company || selectedLead.company_name || '—'}
                                </InfoValue>
                              </InfoRow>
                              <InfoRow>
                                <InfoLabel>Сайт</InfoLabel>
                                <InfoValue>{selectedInsights?.website || selectedLead.website || '—'}</InfoValue>
                              </InfoRow>
                              <InfoRow>
                                <InfoLabel>Підсумок</InfoLabel>
                                <InfoValue>{selectedInsights?.company_summary || 'Дані не знайдено.'}</InfoValue>
                              </InfoRow>
                            </InfoGrid>
                            {(selectedInsights?.company_summary || selectedCompanySummary) && (
                              <SummaryBlock>
                                <SummaryLabel>Коротко про компанію</SummaryLabel>
                                {selectedInsights?.company_summary ? (
                                  <SummaryText>{selectedInsights.company_summary}</SummaryText>
                                ) : null}
                                {selectedCompanySummary && (
                                  <SummaryHint>{selectedCompanySummary}</SummaryHint>
                                )}
                              </SummaryBlock>
                            )}
                            {!!selectedCompanyInsights.length && (
                              <SearchResults>
                                {selectedCompanyInsights.slice(0, 3).map((entry, index) => (
                                  <SearchResultCard key={`${entry.url || index}-${index}`}>
                                    <strong>{entry.title || `Результат ${index + 1}`}</strong>
                                    {entry.snippet && <span>{entry.snippet}</span>}
                                    {entry.url && (
                                      <a href={entry.url} target="_blank" rel="noopener noreferrer">
                                        {entry.url}
                                      </a>
                                    )}
                                  </SearchResultCard>
                                ))}
                              </SearchResults>
                            )}
                          </InsightSection>
                        </>
                      )}
                    </InsightPanel>
                  </ModalSections>
                  <ModalFooter>
                    <FooterSecondaryActions>
                      <ReaderToggleButton type="button" onClick={toggleReader} $active={showReader}>
                        {showReader ? 'Сховати лист' : 'Показати лист'}
                      </ReaderToggleButton>
                      {selectedLead?.email && (
                        <LinkButton
                          type="button"
                          onClick={() => navigate(`/lead/${encodeURIComponent(selectedLead.email)}`)}
                        >
                          Профіль ліда
                        </LinkButton>
                      )}
                    </FooterSecondaryActions>
                    <FooterPrimaryActions>
                      <ActionButton type="button" $variant="snooze" onClick={() => handleDecision('snoozed')}>
                        Відкласти
                      </ActionButton>
                      <ActionButton type="button" $variant="reject" onClick={() => handleDecision('rejected')}>
                        Відхилити
                      </ActionButton>
                      <ActionButton
                        type="button"
                        $variant="confirm"
                        onClick={handleConfirmClick}
                        disabled={replyLoading}
                      >
                        {replyLoading ? 'Генеруємо...' : 'Підтвердити'}
                      </ActionButton>
                    </FooterPrimaryActions>
                  </ModalFooter>
                  {statusError && <ModalAlert role="alert">{statusError}</ModalAlert>}
                </ModalBody>
              </ModalScroller>
            </ModalMain>
          </ModalContent>
        </ModalOverlay>
      )}
      {showReader && (
        <ReaderOverlay>
          <ReaderWindow>
            <ReaderHeader>
              <div>
                <ReaderTitle>Вміст листа</ReaderTitle>
                <ReaderMeta>
                  <ReaderMetaRow>
                    <ReaderMetaLabel>Від</ReaderMetaLabel>
                    <ReaderMetaValue>
                      {selectedLead.full_name || 'Невідомий контакт'}
                    </ReaderMetaValue>
                    {selectedLead.email && <ReaderMetaValue>({selectedLead.email})</ReaderMetaValue>}
                  </ReaderMetaRow>
                  {selectedLead.subject && (
                    <ReaderMetaRow>
                      <ReaderMetaLabel>Тема</ReaderMetaLabel>
                      <ReaderMetaValue>{selectedLead.subject}</ReaderMetaValue>
                    </ReaderMetaRow>
                  )}
                  <ReaderMetaRow>
                    <ReaderMetaLabel>Отримано</ReaderMetaLabel>
                    <ReaderMetaValue>{formatDate(selectedLead.received_at)}</ReaderMetaValue>
                    <ReaderMetaValue>{formatRelative(selectedLead.received_at)}</ReaderMetaValue>
                  </ReaderMetaRow>
                </ReaderMeta>
              </div>
              <ReaderCloseButton type="button" onClick={toggleReader} aria-label="Закрити">
                ×
              </ReaderCloseButton>
            </ReaderHeader>
            <ReaderBody>{selectedLead.body || 'Повідомлення порожнє.'}</ReaderBody>
          </ReaderWindow>
        </ReaderOverlay>
      )}

      {showReplyComposer && (
        <ReplyComposerOverlay onClick={closeReplyComposer}>
          <ReplyComposerContent onClick={(event) => event.stopPropagation()}>
            <ReplyComposerHeader>
              <ReplyComposerTitle>Чернетка відповіді</ReplyComposerTitle>
              <ReplyComposerClose type="button" onClick={closeReplyComposer} aria-label="Закрити">×</ReplyComposerClose>
            </ReplyComposerHeader>
            <ReplyVariantsRow>
              {[
                { key: 'official', label: 'Офіційний' },
                { key: 'semi_official', label: 'Напів-офіційний' },
              ].map((item) => (
                <ReplyVariantButton
                  key={item.key}
                  type="button"
                  $active={replyStyle === item.key}
                  onClick={async () => {
                    setReplyStyle(item.key);
                    await handleGenerateReplies(item.key, { preserveSelectedKey: true });
                  }}
                  disabled={replyLoading}
                >
                  {item.label}
                </ReplyVariantButton>
              ))}
            </ReplyVariantsRow>
            <ReplyVariantsRow>
              {['quick', 'follow_up', 'recap'].map((key) => (
                <ReplyVariantButton
                  key={key}
                  type="button"
                  $active={selectedReplyKey === key}
                  onClick={() => handleSelectReplyOption(key)}
                  disabled={!(replyOptions[key] || '').trim()}
                >
                  {key === 'quick' ? 'Quick' : key === 'follow_up' ? 'Follow-up' : 'Recap & Proposal'}
                </ReplyVariantButton>
              ))}
            </ReplyVariantsRow>
            <SectionHint>
              {selectedReplyKey === 'quick'
                ? 'Дуже короткий варіант для швидкої відповіді.'
                : selectedReplyKey === 'follow_up'
                ? 'Варіант м’якого фолоу-апу після знайомства.'
                : 'Варіант з рекепом болей та пропозицією рішення.'}
            </SectionHint>
            {replyError && <ReplyStatusMessage $error>{replyError}</ReplyStatusMessage>}
            {!replyError && !replyDraft && (
              <ReplyStatusMessage>{replyLoading ? 'Генеруємо відповідь…' : 'Відповідь порожня — відредагуйте вручну перед надсиланням.'}</ReplyStatusMessage>
            )}
            <ReplyComposerTextarea
              value={replyDraft}
              onChange={(event) => setReplyDraft(event.target.value)}
            />
            <ReplyComposerActions>
              <ReplyComposerLeftActions>
                <HiddenFileInput
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFilesSelected}
                />
                <AttachmentButton type="button" onClick={handlePickAttachments} aria-label="Додати файли">
                  📎
                </AttachmentButton>
                {replyAttachments.length ? (
                  <AttachmentList>
                    {replyAttachments.map((item) => (
                      <AttachmentChip key={item.id}>
                        {item.file?.name || 'file'}
                        <AttachmentRemove type="button" onClick={() => removeAttachment(item.id)} aria-label="Видалити">
                          ×
                        </AttachmentRemove>
                      </AttachmentChip>
                    ))}
                  </AttachmentList>
                ) : null}
              </ReplyComposerLeftActions>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <ReplyComposerButton type="button" onClick={closeReplyComposer}>
                  Скасувати
                </ReplyComposerButton>
                <ReplyComposerButton type="button" $primary onClick={handleSendReply} disabled={replyLoading || !replyDraft.trim()}>
                  {replyLoading ? 'Надсилаємо...' : 'Відповісти та підтвердити'}
                </ReplyComposerButton>
              </div>
            </ReplyComposerActions>
          </ReplyComposerContent>
        </ReplyComposerOverlay>
      )}

    </PageContainer>
  );
};

export default Automation;
