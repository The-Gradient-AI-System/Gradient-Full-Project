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
import { getGmailLeads } from '../api/client';
import { useModalManager } from '../context/ModalManagerContext';
import { useAuth } from '../context/AuthContext';

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
const Card = styled.section`
  background: ${({ theme }) => theme.colors.cardBackground};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 14px;
  padding: 0.9rem;
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
  const { activeModals, openModal, closeModal } = useModalManager();
  const [metrics, setMetrics] = useState({ stats: {}, line: [], month: [], pie: [] });
  const [leads, setLeads] = useState([]);
  const { leadSnapshot, updateLeadSnapshot } = useAuth();
  const didHydrateRef = useRef(false);

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
    }
  }, [leadSnapshot]); // hydrate once when snapshot appears

  useEffect(() => {
    (async () => {
      const payload = await getGmailLeads();
      setLeads(payload?.leads || []);
      setMetrics({
        stats: payload?.stats || {},
        line: payload?.line || [],
        month: payload?.month || [],
        pie: payload?.pie || [],
      });
      updateLeadSnapshot?.(payload);
    })();
  }, [updateLeadSnapshot]);

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

  const openChart = (id, title) => openModal({ id: `chart-${id}`, type: 'chart_modal', props: { title, chartId: id } });
  const expanded = activeModals.filter((modal) => modal.type === 'chart_modal');

  const renderExpanded = (item) => {
    const id = item.props?.chartId;
    const title = item.props?.title;
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
                <Pie data={statusDistribution} dataKey="value" nameKey="name" outerRadius={180}>
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
                <Bar dataKey="value" fill={chartColors[0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </Modal>
      </Overlay>
    );
  };

  return (
    <>
      <DashboardGrid>
        {kpis.map((item) => (
          <StatCard key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <span>{item.hint}</span>
          </StatCard>
        ))}

        <Card>
          <Header>
            <h4>Відсоток виконання</h4>
            <Expand onClick={() => openChart('percentage', 'Відсоток виконання')}>Expand</Expand>
          </Header>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={[
                  { name: 'done', value: Number(metrics.stats?.percentage ?? 0) },
                  { name: 'rest', value: Math.max(0, 100 - Number(metrics.stats?.percentage ?? 0)) },
                ]}
                dataKey="value"
                innerRadius={70}
                outerRadius={90}
                startAngle={90}
                endAngle={450}
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
        </Card>

        <Card>
          <Header><h4>Lead Distribution</h4><Expand onClick={() => openChart('distribution', 'Lead Distribution')}>Expand</Expand></Header>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={statusDistribution} dataKey="value" nameKey="name" outerRadius={80}>
                {statusDistribution.map((entry, index) => <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <Header><h4>Activity Dynamics</h4><Expand onClick={() => openChart('dynamics', 'Activity Dynamics')}>Expand</Expand></Header>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={activityDynamics}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line dataKey="pv" stroke={chartColors[0]} />
              <Line dataKey="uv" stroke={chartColors[1]} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <Header><h4>Status over Time</h4><Expand onClick={() => openChart('status-time', 'Status over Time')}>Expand</Expand></Header>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={statusOverTime}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line dataKey="pv" stroke={chartColors[2]} />
              <Line dataKey="uv" stroke={chartColors[3]} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </DashboardGrid>
      {expanded.map(renderExpanded)}
    </>
  );
};

export default AnalyticsManager;

