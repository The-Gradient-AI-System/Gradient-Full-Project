import React from 'react';
import styled from 'styled-components';

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
  th, td {
    text-align: left;
    padding: 0.7rem 0.8rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }
  th {
    color: ${({ theme }) => theme.colors.subtleText};
    text-transform: uppercase;
    font-size: 0.72rem;
    letter-spacing: 0.07em;
  }
`;

const Empty = styled.div`
  padding: 1rem 0;
  color: ${({ theme }) => theme.colors.subtleText};
`;

const formatDate = (iso) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const LeadHistoryTable = ({ history = [] }) => {
  if (!history.length) return <Empty>Історія статусів поки порожня.</Empty>;
  return (
    <Table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Lead Name</th>
          <th>Status</th>
          <th>Assignee</th>
        </tr>
      </thead>
      <tbody>
        {[...history].map((row) => (
          <tr key={row.id}>
            <td>{formatDate(row.date)}</td>
            <td>{row.leadName || '—'}</td>
            <td>{row.status || '—'}</td>
            <td>{row.assignee || '—'}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
};

export default LeadHistoryTable;

