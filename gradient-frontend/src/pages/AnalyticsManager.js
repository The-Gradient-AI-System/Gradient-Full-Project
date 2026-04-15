import React, { useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { getGmailLeads } from '../api/client';
import { useModalManager } from '../context/ModalManagerContext';
import { useAuth } from '../context/AuthContext';

const Title = styled.h4`
  margin: 0;
  font-size: 1.1rem;
`;
const Card = styled.section`
  background: ${({ theme }) => theme.colors.cardBackground};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 14px;
  padding: 0.9rem;
`;

const DashboardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(260px, 1fr));
  gap: 1.05rem;
  @media (max-width: 1120px) {
    grid-template-columns: repeat(2, minmax(260px, 1fr));
  }
  @media (max-width: 680px) {
    grid-template-columns: 1fr;
  }
`;

const KpiGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(260px, 1fr));
  gap: 1.05rem;
  margin-bottom: 1.05rem;
  @media (max-width: 680px) {
    grid-template-columns: 1fr;
  }
`;

const BreakdownGrid = styled(DashboardGrid)`
  margin-top: 1.05rem;
`;

const FilterBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 1rem;
  margin-bottom: 1.2rem;
  padding: 0.4rem 0.6rem;
`;

const FilterGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  background: rgba(255, 255, 255, 0.04);
  padding: 0.35rem 0.5rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.08);
`;

const FilterButton = styled.button`
  border-radius: 999px;
  padding: 0.4rem 0.85rem;
  font-size: 0.85rem;
  cursor: pointer;
  border: 1px solid transparent;
  background: ${({ $active }) => ($active ? 'rgba(255, 255, 255, 0.12)' : 'transparent')};
  color: #fff;
  font-weight: ${({ $active }) => ($active ? '600' : '400')};
  transition: all 0.18s ease;
  white-space: nowrap;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.2);
  }
`;

const PendingCard = styled(Card)`
  margin-top: 1.2rem;
  cursor: default;
`;

const PendingGroupList = styled.div`
  display: flex;
  gap: 0.85rem;
  flex-wrap: wrap;
`;

const PendingGroupButton = styled.button`
  border-radius: 12px;
  padding: 0.6rem 1rem;
  font-size: 0.9rem;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  transition: all 0.18s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:hover {
    transform: translateY(-1px);
    border-color: #fff;
    background: rgba(255, 255, 255, 0.15);
  }

  span.count {
    background: rgba(255, 255, 255, 0.12);
    padding: 0.1rem 0.45rem;
    border-radius: 6px;
    font-weight: 700;
    font-size: 0.8rem;
  }
`;

const DrilldownList = styled.div`
  margin-top: 1rem;
  display: grid;
  gap: 0.8rem;
  overflow-y: auto;
  max-height: 480px;
  padding-right: 0.5rem;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.12);
    border-radius: 10px;
  }
`;

const DrilldownRow = styled.button`
  width: 100%;
  text-align: left;
  padding: 1rem 1.1rem;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.02);
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  cursor: pointer;
  transition: all 0.18s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(104, 123, 255, 0.4);
    transform: translateX(4px);
  }
`;

const LegendRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1.1rem;
  margin-top: 0.8rem;
  align-items: center;
`;

const LegendItem = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  font-size: 0.92rem;
  color: ${({ theme }) => theme.colors.subtleText};
`;

const LegendDot = styled.span`
  width: 10px;
  height: 10px;
  border-radius: 3px;
  background: ${({ $color }) => $color};
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.12);
`;

const DrilldownTitle = styled.strong`
  font-size: 1.05rem;
  color: #fff;
`;

const DrilldownMeta = styled.div`
  color: ${({ theme }) => theme.colors.subtleText};
  font-size: 0.92rem;
  line-height: 1.45;
`;

const StatusBadgeMinimal = styled.span`
  font-size: 0.72rem;
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  background: ${({ $color }) => ($color || 'rgba(255,255,255,0.12)')};
  color: #fff;
  font-weight: 700;
  text-transform: uppercase;
  margin-left: auto;
`;
const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.7rem;
`;
const Expand = styled.button`
  border: none;
  border-radius: 10px;
  padding: 0.35rem 0.55rem;
  background: rgba(255,255,255,0.08);
  color: ${({ theme }) => theme.colors.text};
  cursor: pointer;
`;
const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 90;
`;
const Modal = styled.div`
  width: min(92vw, 980px);
  height: min(86vh, 680px);
  background: ${({ theme }) => theme.colors.cardBackground};
  border-radius: 14px;
  padding: 1rem;
`;

const StatCard = styled(Card)`
  padding: 1.05rem 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  strong {
    font-size: 2.2rem;
    line-height: 1.05;
    letter-spacing: -0.02em;
  }
  span {
    font-size: 0.92rem;
    color: ${({ theme }) => theme.colors.textSecondary || theme.colors.subtleText};
  }
`;

const chartColors = ['#5f7dff', '#51d7aa', '#ffb969', '#ff7d9c'];

const AnalyticsManager = () => {
  const navigate = useNavigate();
  const { activeModals, openModal, closeModal } = useModalManager();
  const [metrics, setMetrics] = useState({ stats: {}, line: [], month: [], pie: [] });
  const [leads, setLeads] = useState([]);
  const [pendingGroups, setPendingGroups] = useState([]);
  const [drilldownStatus, setDrilldownStatus] = useState(null);
  const [rangeKey, setRangeKey] = useState('all');
  const { leadSnapshot, updateLeadSnapshot } = useAuth();
  const didHydrateRef = useRef(false);

  const rangeDays =
    rangeKey === 'all' ? null : rangeKey === 'year' ? 365 : rangeKey === 'month' ? 30 : 7;

  useEffect(() => {
    if (!didHydrateRef.current && leadSnapshot) {
      didHydrateRef.current = true;
      setLeads(leadSnapshot?.leads || []);
      setMetrics({
        stats: leadSnapshot?.stats || {},
        line: leadSnapshot?.line || [],
        month: leadSnapshot?.month || [],
        pie: leadSnapshot?.pie || [],
      });
      setPendingGroups(leadSnapshot?.pending_groups || []);
    }
  }, [leadSnapshot]); // hydrate once when snapshot appears

  useEffect(() => {
    (async () => {
      const payload = await getGmailLeads(rangeDays);
      setLeads(payload?.leads || []);
      setMetrics({
        stats: payload?.stats || {},
        line: payload?.line || [],
        month: payload?.month || [],
        pie: payload?.pie || [],
      });
      setPendingGroups(payload?.pending_groups || []);
      updateLeadSnapshot?.(payload);
    })();
  }, [updateLeadSnapshot, rangeDays]);

  const statusDistribution = useMemo(() => {
    const map = {};
    leads.forEach((lead) => {
      const key = (lead.status || 'NEW').toUpperCase();
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [leads]);

  const managerStatuses = useMemo(() => {
    const map = {};
    leads.forEach((lead) => {
      const manager = lead.assigned_username || 'Unassigned';
      if (!map[manager]) map[manager] = 0;
      map[manager] += 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [leads]);

  const drilldownLeads = useMemo(() => {
    if (!drilldownStatus) return [];
    const key = String(drilldownStatus || '').toUpperCase();
    return leads.filter((lead) => String((lead.status || 'NEW')).toUpperCase() === key);
  }, [drilldownStatus, leads]);

  const activityDynamics = metrics.month || [];
  const statusOverTime = metrics.line || [];

  const kpis = useMemo(() => {
    const active = Number(metrics.stats?.active ?? 0);
    const completed = Number(metrics.stats?.completed ?? 0);
    return [
      { label: 'Кількість Активних Проєктів', value: active, hint: 'в роботі' },
      { label: 'Завершені Проєкти', value: completed, hint: 'за цей період' },
    ];
  }, [metrics.stats]);

  const openChart = (id, title) =>
    openModal({ id: `chart-${id}`, type: 'chart_modal', props: { title, chartId: id } });

  const openPendingModal = (group) =>
    openModal({
      id: `pending-${group?.key}`,
      type: 'pending_modal',
      props: { title: `Pending: ${group?.label}`, group },
    });

  const expanded = activeModals.filter((modal) => ['chart_modal', 'pending_modal'].includes(modal.type));

  const renderExpanded = (item) => {
    const id = item.props?.chartId;
    const title = item.props?.title;

    if (item.type === 'pending_modal') {
      const group = item.props?.group;
      return (
        <Overlay key={item.id} onClick={() => closeModal(item.id)}>
          <Modal onClick={(e) => e.stopPropagation()}>
            <Header>
              <h3>{title}</h3>
              <Expand onClick={() => closeModal(item.id)}>Close</Expand>
            </Header>

            <DrilldownList>
              {(group?.leads || []).map((lead) => {
                const status = (lead.status || 'new').toLowerCase();
                const statusColor = status === 'call_lead' ? '#f59e0b' : 
                                   status === 'confirmed' ? '#10b981' :
                                   status === 'rejected' ? '#ef4444' : '#3b82f6';
                
                return (
                  <DrilldownRow 
                    key={lead.gmail_id || lead.email}
                    onClick={() => {
                      closeModal(item.id);
                      if (lead.email) {
                        navigate('/work-zone', { state: { openLeadEmail: lead.email } });
                      }
                    }}
                  >
                    <div style={{ display: 'flex', width: '100%', alignItems: 'flex-start' }}>
                      <DrilldownTitle>{lead.full_name || lead.email || 'Lead'}</DrilldownTitle>
                      <StatusBadgeMinimal $color={statusColor}>{status}</StatusBadgeMinimal>
                    </div>
                    <DrilldownMeta>
                      {lead.company || lead.company_name || '—'} · {lead.subject || 'Без теми'}
                      <br />
                      Received: {lead.received_at || '—'}
                    </DrilldownMeta>
                    {!!lead.rejection_reason && (
                      <DrilldownMeta style={{ marginTop: '4px', padding: '4px 8px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '6px', color: '#fca5a5' }}>
                        Reason: {lead.rejection_reason}
                      </DrilldownMeta>
                    )}
                  </DrilldownRow>
                );
              })}
              {!group?.leads?.length && <DrilldownMeta>Немає даних для цього групування.</DrilldownMeta>}
            </DrilldownList>
          </Modal>
        </Overlay>
      );
    }

    return (
      <Overlay key={item.id} onClick={() => closeModal(item.id)}>
        <Modal onClick={(e) => e.stopPropagation()}>
          <Header>
            <h3>{title}</h3>
            <Expand onClick={() => closeModal(item.id)}>Close</Expand>
          </Header>
          <ResponsiveContainer width="100%" height="90%">
            {id === 'percentage' ? (
              <PieChart>
                <Pie
                  data={[
                    { name: 'done', value: Number(metrics.stats?.percentage ?? 0) },
                    { name: 'rest', value: Math.max(0, 100 - Number(metrics.stats?.percentage ?? 0)) },
                  ]}
                  dataKey="value"
                  innerRadius={120}
                  outerRadius={170}
                  startAngle={90}
                  endAngle={450}
                  label={({ value }) => `${value}%`}
                  labelLine={false}
                >
                  <Cell fill={chartColors[1]} />
                  <Cell fill="rgba(255,255,255,0.12)" />
                </Pie>
                <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" fontSize="68" fill="currentColor">
                  {Number(metrics.stats?.percentage ?? 0)}%
                </text>
                <Tooltip />
              </PieChart>
            ) : id === 'distribution' ? (
              <PieChart>
                <Pie
                  data={statusDistribution}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={180}
                  label={({ value }) => String(value)}
                  labelLine={false}
                >
                  {statusDistribution.map((entry, index) => <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            ) : id === 'dynamics' ? (
              <LineChart data={activityDynamics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line dataKey="pv" stroke={chartColors[0]} />
                <Line dataKey="uv" stroke={chartColors[1]} />
              </LineChart>
            ) : id === 'status-time' ? (
              <LineChart data={statusOverTime}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line dataKey="pv" stroke={chartColors[2]} />
                <Line dataKey="uv" stroke={chartColors[3]} />
              </LineChart>
            ) : (
              <BarChart data={managerStatuses}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" label={{ position: 'top', fill: '#fff' }}>
                  {managerStatuses.map((entry, index) => (
                    <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </Modal>
      </Overlay>
    );
  };

  return (
    <>
      <FilterBar>
        <FilterGroup>
          <FilterButton type="button" $active={rangeKey === 'all'} onClick={() => setRangeKey('all')}>
            All time
          </FilterButton>
          <FilterButton type="button" $active={rangeKey === 'year'} onClick={() => setRangeKey('year')}>
            Рік
          </FilterButton>
          <FilterButton type="button" $active={rangeKey === 'month'} onClick={() => setRangeKey('month')}>
            Місяць
          </FilterButton>
          <FilterButton type="button" $active={rangeKey === 'week'} onClick={() => setRangeKey('week')}>
            Тиждень
          </FilterButton>
        </FilterGroup>
      </FilterBar>

      <KpiGrid>
        {kpis.map((item) => (
          <StatCard key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <span>{item.hint}</span>
          </StatCard>
        ))}
      </KpiGrid>

      <BreakdownGrid>
        <Card>
          <Header>
            <h4>Відсоток виконання</h4>
            <Expand onClick={() => openChart('percentage', 'Відсоток виконання')}>Expand</Expand>
          </Header>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Виконано', value: Number(metrics.stats?.percentage ?? 0) },
                  { name: 'Залишилось', value: Math.max(0, 100 - Number(metrics.stats?.percentage ?? 0)) },
                ]}
                dataKey="value"
                innerRadius={70}
                outerRadius={90}
                startAngle={90}
                endAngle={450}
                label={({ value }) => `${value}%`}
                labelLine={false}
              >
                <Cell fill={chartColors[1]} />
                <Cell fill="rgba(255,255,255,0.12)" />
              </Pie>
              <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" fontSize="44" fill="currentColor">
                {Number(metrics.stats?.percentage ?? 0)}%
              </text>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <LegendRow>
            <LegendItem>
              <LegendDot $color={chartColors[1]} />
              Виконано
            </LegendItem>
            <LegendItem>
              <LegendDot $color="rgba(255,255,255,0.12)" />
              Залишилось
            </LegendItem>
          </LegendRow>
        </Card>

        <Card>
          <Header>
            <h4>Lead Distribution</h4>
            <Expand onClick={() => openChart('distribution', 'Lead Distribution')}>Expand</Expand>
          </Header>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={statusDistribution}
                dataKey="value"
                nameKey="name"
                outerRadius={80}
                label={({ value }) => String(value)}
                labelLine={false}
              >
                {statusDistribution.map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={chartColors[index % chartColors.length]}
                    onClick={() =>
                      setDrilldownStatus((prev) => (prev === entry.name ? null : entry.name))
                    }
                    style={{ cursor: 'pointer' }}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <LegendRow>
            {statusDistribution.map((entry, index) => (
              <LegendItem key={`${entry.name}-${index}`}>
                <LegendDot
                  $color={chartColors[index % chartColors.length]}
                />
                {entry.name}
              </LegendItem>
            ))}
          </LegendRow>
        </Card>

        <Card>
          <Header>
            <h4>Leads by manager</h4>
            <Expand onClick={() => openChart('manager', 'Leads by manager')}>Expand</Expand>
          </Header>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={managerStatuses}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" label={{ position: 'top', fill: '#fff' }}>
                {managerStatuses.map((entry, index) => (
                  <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <LegendRow>
            {managerStatuses.map((entry, index) => (
              <LegendItem key={`${entry.name}-${index}`}>
                <LegendDot $color={chartColors[index % chartColors.length]} />
                {entry.name}
              </LegendItem>
            ))}
          </LegendRow>
        </Card>

        <Card>
          <Header>
            <h4>Activity Dynamics</h4>
            <Expand onClick={() => openChart('dynamics', 'Activity Dynamics')}>Expand</Expand>
          </Header>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={activityDynamics}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
              <YAxis stroke="#9ca3af" fontSize={12} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px' }}
              />
              <Line type="monotone" dataKey="pv" stroke={chartColors[0]} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="uv" stroke={chartColors[1]} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
          <LegendRow>
            <LegendItem>
              <LegendDot $color={chartColors[0]} />
              Всього лідів
            </LegendItem>
            <LegendItem>
              <LegendDot $color={chartColors[1]} />
              Кваліфіковані
            </LegendItem>
          </LegendRow>
        </Card>

        <Card>
          <Header>
            <h4>Status over Time</h4>
            <Expand onClick={() => openChart('status-time', 'Status over Time')}>Expand</Expand>
          </Header>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={statusOverTime}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
              <YAxis stroke="#9ca3af" fontSize={12} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px' }}
              />
              <Line type="monotone" dataKey="pv" stroke={chartColors[2]} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="uv" stroke={chartColors[3]} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
          <LegendRow>
            <LegendItem>
              <LegendDot $color={chartColors[2]} />
              Всього (міс)
            </LegendItem>
            <LegendItem>
              <LegendDot $color={chartColors[3]} />
              Кваліфіковані (міс)
            </LegendItem>
          </LegendRow>
        </Card>
      </BreakdownGrid>

      {drilldownStatus && (
        <Card style={{ marginTop: '1.2rem' }}>
          <Header>
            <h4>Деталі: {drilldownStatus}</h4>
            <Expand onClick={() => setDrilldownStatus(null)}>Згорнути</Expand>
          </Header>
          <DrilldownList>
            {drilldownLeads.map((lead) => {
              const status = (lead.status || 'new').toLowerCase();
              const statusColor = status === 'call_lead' ? '#f59e0b' : 
                                 status === 'confirmed' ? '#10b981' :
                                 status === 'rejected' ? '#ef4444' : '#3b82f6';
              return (
                <DrilldownRow 
                  key={lead.gmail_id || lead.email} 
                  onClick={() => {
                    if (lead.email) {
                      navigate('/work-zone', { state: { openLeadEmail: lead.email } });
                    }
                  }}
                >
                  <div style={{ display: 'flex', width: '100%', alignItems: 'flex-start' }}>
                    <DrilldownTitle>{lead.full_name || lead.email || 'Lead'}</DrilldownTitle>
                    <StatusBadgeMinimal $color={statusColor}>{status}</StatusBadgeMinimal>
                  </div>
                  <DrilldownMeta>
                    {lead.company || lead.company_name || '—'} · {lead.subject || 'Без теми'}
                    <br />
                    Received: {lead.received_at || '—'}
                  </DrilldownMeta>
                  {!!lead.rejection_reason && (
                    <DrilldownMeta style={{ marginTop: '4px', padding: '4px 8px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '6px', color: '#fca5a5' }}>
                      Reason: {lead.rejection_reason}
                    </DrilldownMeta>
                  )}
                </DrilldownRow>
              );
            })}
          </DrilldownList>
        </Card>
      )}

      {/* Pending proposals section at the bottom */}
      <PendingCard>
        <Header>
          <Title>Pending / hanging proposals</Title>
          <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
            Пропозиції, що очікують відповіді більше 3-х днів
          </div>
        </Header>
        <PendingGroupList>
          {pendingGroups.length > 0 ? (
            pendingGroups.map((group) => (
              <PendingGroupButton key={group.key} onClick={() => openPendingModal(group)}>
                {group.label} <span className="count">{group.count}</span>
              </PendingGroupButton>
            ))
          ) : (
            <DrilldownMeta>Дані про очікування відсутні або завантажуються...</DrilldownMeta>
          )}
        </PendingGroupList>
      </PendingCard>

      {expanded.map(renderExpanded)}
    </>
  );
};

export default AnalyticsManager;

