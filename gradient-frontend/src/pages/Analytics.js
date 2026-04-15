import React, { useEffect, useMemo, useState } from 'react';
import styled, { useTheme } from 'styled-components';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, BarChart, Bar } from 'recharts';
import { getGmailLeads } from '../api/client';
import { useModalManager } from '../context/ModalManagerContext';

const DashboardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: auto auto auto;
  gap: 2rem;
  grid-template-areas:
    'filters filters filters'
    'active completed percentage'
    'clients clients clients'
    'activity activity activity';

  @media (max-width: 1200px) {
    grid-template-columns: repeat(2, 1fr);
    grid-template-areas:
      'filters filters'
      'active completed'
      'percentage percentage'
      'clients clients'
      'activity activity';
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    grid-template-areas:
      'filters'
      'active'
      'completed'
      'percentage'
      'clients'
      'activity';
  }
`;

const FilterPanel = styled.div`
  grid-area: filters;
  background: ${({ theme }) => theme.colors.cardBackground};
  padding: 1.5rem;
  border-radius: 16px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: 0 8px 24px ${({ theme }) => theme.colors.shadow};
  display: flex;
  align-items: center;
  gap: 1rem;
  position: sticky;
  top: 0;
  z-index: 10;
`;

const FilterButton = styled.button`
  padding: 0.75rem 1.5rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  background: ${({ $active, theme }) => $active ? theme.colors.hover : 'transparent'};
  color: ${({ theme }) => theme.colors.text};
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: ${({ theme }) => theme.colors.hover};
  }
`;

const StatusBanner = styled.div`
  margin: 0 0 1rem;
  padding: 0.85rem 1.1rem;
  border-radius: 12px;
  background: ${({ $variant }) => ($variant === 'error' ? 'rgba(255, 77, 79, 0.15)' : 'rgba(75, 163, 255, 0.16)')};
  color: ${({ $variant }) => ($variant === 'error' ? '#ff898a' : '#4ba3ff')};
  font-size: 0.9rem;
  font-weight: 500;
`;

const Card = styled.div`
  background: ${({ theme }) => theme.colors.cardBackground};
  padding: 2rem;
  border-radius: 16px;
  color: ${({ theme }) => theme.colors.text};
  border: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: 0 8px 24px ${({ theme }) => theme.colors.shadow};
  transition: background 0.3s ease, color 0.3s ease;

  h3 {
    margin-top: 0;
    color: ${({ theme }) => theme.colors.text};
    font-weight: 600;
    font-size: 1.4rem;
  }
`;

const StatCard = styled(Card)`
  grid-area: ${props => props.area};
  ${props => props.$accent ? 'box-shadow: 0 0 0 2px #4BA3FF, 0 8px 24px rgba(0,0,0,0.2);' : ''}
  h2 {
    font-size: 4.25rem;
    margin: 0.5rem 0;
  }
  p {
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 1.05rem;
  }
`;

const ChartCard = styled(Card)`
  grid-area: clients;
`;

const ActivityCard = styled(Card)`
  grid-area: activity;
  margin-top: 2rem;
`;

const ActivityGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-top: 1rem;
`;

const ActivityItem = styled.div`
  background: ${({ theme }) => theme.colors.hover};
  padding: 1rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: ${({ theme }) => theme.colors.border};
    transform: translateY(-2px);
  }
  
  h4 {
    margin: 0 0 0.5rem 0;
    color: ${({ theme }) => theme.colors.text};
  }
  
  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.subtleText};
    font-size: 0.9rem;
  }
  
  .count {
    font-size: 1.5rem;
    font-weight: bold;
    color: ${({ theme }) => theme.colors.text};
  }
`;

const ChartHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;

  h3 {
    margin: 0;
  }
`;

const PeriodBadge = styled.button`
  appearance: none;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.hover};
  color: ${({ theme }) => theme.colors.textSecondary};
  padding: 0.4rem 0.75rem;
  border-radius: 12px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.border};
    color: ${({ theme }) => theme.colors.text};
  }
`;

const PercentageCard = styled(Card)`
  grid-area: percentage;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 360px;
`;

const zeroLineChart = [
  { name: 'JAN', uv: 0, pv: 0 },
  { name: 'FEB', uv: 0, pv: 0 },
  { name: 'MAR', uv: 0, pv: 0 },
  { name: 'APR', uv: 0, pv: 0 },
  { name: 'MAY', uv: 0, pv: 0 },
  { name: 'JUN', uv: 0, pv: 0 },
  { name: 'JUL', uv: 0, pv: 0 },
  { name: 'AUG', uv: 0, pv: 0 },
  { name: 'SEP', uv: 0, pv: 0 },
  { name: 'OCT', uv: 0, pv: 0 },
  { name: 'NOV', uv: 0, pv: 0 },
  { name: 'DEC', uv: 0, pv: 0 },
];

const zeroQuarterly = [
  { name: 'Q1', uv: 0, pv: 0 },
  { name: 'Q2', uv: 0, pv: 0 },
  { name: 'Q3', uv: 0, pv: 0 },
];

const zeroMonthly = [
  { name: 'W1', uv: 0, pv: 0 },
  { name: 'W2', uv: 0, pv: 0 },
  { name: 'W3', uv: 0, pv: 0 },
  { name: 'W4', uv: 0, pv: 0 },
];

const zeroPieChart = [
  { name: 'Активні', value: 0, color: '#34D399' },
  { name: 'Завершені', value: 0, color: '#313346' }
];
const COLORS = ['#34D399', '#313346'];

const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, value }) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (value === 0) return null;

  return (
    <text 
      x={x} 
      y={y} 
      fill="white" 
      textAnchor={x > cx ? 'start' : 'end'} 
      dominantBaseline="central"
      fontSize="14"
      fontWeight="bold"
    >
      {value}
    </text>
  );
};

const Analytics = () => {
  const [period, setPeriod] = useState('year');
  const [globalFilter, setGlobalFilter] = useState('all');
  const theme = useTheme();
  const { openModal } = useModalManager();
  const [lineData, setLineData] = useState(zeroLineChart);
  const [quarterData, setQuarterData] = useState(zeroQuarterly);
  const [monthData, setMonthData] = useState(zeroMonthly);
  const [pieData, setPieData] = useState(zeroPieChart);
  const [summary, setSummary] = useState({
    active: 0,
    completed: 0,
    percentage: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const globalFilters = [
    { key: 'all', label: 'Увесь час' },
    { key: 'year', label: 'Рік' },
    { key: 'month', label: 'Місяць' },
    { key: 'week', label: 'Тиждень' },
  ];

  // Mock data for pending proposals
  const pendingProposals = [
    { days: 3, count: 5, label: '3 дні' },
    { days: 5, count: 8, label: '5 днів' },
    { days: 10, count: 12, label: '10 днів' },
  ];

  const handlePendingClick = (days, count) => {
    openModal('pending-details', {
      title: `Пропозиції, що очікують ${days} днів`,
      content: (
        <div>
          <p><strong>Кількість:</strong> {count} пропозицій</p>
          <p><strong>Час очікування:</strong> {days} днів</p>
          <div style={{ marginTop: '1rem' }}>
            <p>Список пропозицій:</p>
            {/* Тут можна додати реальний список лідів */}
            <p style={{ color: theme.colors.subtleText }}>
              Детальна інформація буде доступна після реалізації бекенду
            </p>
          </div>
        </div>
      )
    });
  };

  useEffect(() => {
    let cancelled = false;

    const fetchAnalytics = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getGmailLeads();

        if (cancelled || !response) return;

        if (Array.isArray(response?.line)) {
          setLineData(response.line.length ? response.line : zeroLineChart);
        }

        if (Array.isArray(response?.quarter)) {
          setQuarterData(response.quarter.length ? response.quarter : zeroQuarterly);
        }

        if (Array.isArray(response?.month)) {
          setMonthData(response.month.length ? response.month : zeroMonthly);
        }

        if (Array.isArray(response?.pie)) {
          setPieData(response.pie.length ? response.pie.map((item, index) => ({
            ...item,
            name: item.name || (index === 0 ? 'Активні' : 'Завершені'),
            color: item.color || COLORS[index % COLORS.length]
          })) : zeroPieChart);
        }

        if (response?.stats) {
          setSummary(prev => ({
            active: response.stats.active ?? prev.active,
            completed: response.stats.completed ?? prev.completed,
            percentage: response.stats.percentage ?? prev.percentage,
          }));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || 'Не вдалося завантажити аналітику.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchAnalytics();

    return () => {
      cancelled = true;
    };
  }, []);

  const dataset = useMemo(() => {
    switch (period) {
      case 'quarter':
        return quarterData;
      case 'month':
        return monthData;
      default:
        return lineData;
    }
  }, [period, lineData, quarterData, monthData]);

  const cyclePeriod = () => {
    setPeriod(p => (p === 'month' ? 'quarter' : p === 'quarter' ? 'year' : 'month'));
  };

  return (
    <DashboardGrid>
      <FilterPanel>
        <span style={{ fontWeight: 'bold', color: theme.colors.text }}>Глобальні фільтри:</span>
        {globalFilters.map(filter => (
          <FilterButton
            key={filter.key}
            $active={globalFilter === filter.key}
            onClick={() => setGlobalFilter(filter.key)}
          >
            {filter.label}
          </FilterButton>
        ))}
      </FilterPanel>
      
      <StatCard area="active" $accent>
        <h3>Дані 1</h3>
        <h2>{summary.active}</h2>
        <p>активних проєктів</p>
      </StatCard>
      <StatCard area="completed">
        <h3>Дані 2</h3>
        <h2>{summary.completed}</h2>
        <p>завершено за період</p>
      </StatCard>
      <PercentageCard>
        <h3>Розподіл лідів</h3>
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie 
              data={pieData} 
              cx="50%" 
              cy="50%" 
              innerRadius={85} 
              outerRadius={110} 
              startAngle={90} 
              endAngle={450} 
              paddingAngle={0} 
              dataKey="value"
              label={CustomLabel}
            >
              {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />)}
            </Pie>
            <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" fontSize="56" fill={theme.colors.text}>
              {summary.percentage}%
            </text>
            <Legend 
              verticalAlign="bottom" 
              height={36}
              formatter={(value, entry) => (
                <span style={{ color: theme.colors.text }}>
                  {value}: {entry.payload.value}
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </PercentageCard>
      <ChartCard>
        <ChartHeader>
          <h3>Дані 4</h3>
          <PeriodBadge onClick={cyclePeriod} title="Клікніть, щоб змінити період">
            Період: {period === 'year' ? 'Рік' : period === 'quarter' ? 'Квартал' : 'Місяць'}
          </PeriodBadge>
        </ChartHeader>
        {loading && <StatusBanner>Завантажуємо аналітику…</StatusBanner>}
        {error && <StatusBanner $variant="error">{error}</StatusBanner>}
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={dataset}>
            <CartesianGrid strokeDasharray="3 3" stroke="#3a3d6b" />
            <XAxis dataKey="name" stroke="#a9a9a9" />
            <YAxis stroke="#a9a9a9" />
            <Tooltip contentStyle={{ backgroundColor: '#25274d', border: 'none', color: '#fff' }} />
            <Line type="monotone" dataKey="pv" stroke="#6b7cff" strokeWidth={2.4} dot={false} activeDot={{ r: 4 }} />
            <Line type="monotone" dataKey="uv" stroke="#df5cff" strokeWidth={2.4} dot={false} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
      
      <ActivityCard>
        <h3>Activity Dynamics - Очікуючі пропозиції</h3>
        <p>Пропозиції, що очікують на відповідь</p>
        <ActivityGrid>
          {pendingProposals.map(proposal => (
            <ActivityItem 
              key={proposal.days}
              onClick={() => handlePendingClick(proposal.days, proposal.count)}
            >
              <h4>{proposal.label}</h4>
              <div className="count">{proposal.count}</div>
              <p>пропозицій очікують</p>
            </ActivityItem>
          ))}
        </ActivityGrid>
      </ActivityCard>
    </DashboardGrid>
  );
};

export default Analytics;
