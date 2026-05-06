import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dashboardAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { format, isValid } from 'date-fns';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import './Dashboard.css';

const STATUS_COLORS = {
  todo: '#6c7086',
  'in-progress': '#89b4fa',
  review: '#fab387',
  done: '#a6e3a1',
};

const PRIORITY_COLORS = {
  urgent: '#f38ba8',
  high: '#fab387',
  medium: '#f9e2af',
  low: '#94e2d5',
};

const StatCard = ({ label, value, color, icon, sub }) => (
  <div className="stat-card card fade-in">
    <div className="stat-icon" style={{ color }}>{icon}</div>
    <div className="stat-value" style={{ color }}>{value}</div>
    <div className="stat-label">{label}</div>
    {sub && <div className="stat-sub">{sub}</div>}
  </div>
);

const TaskRow = ({ task }) => {
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';
  return (
    <Link to={`/tasks/${task._id}`} className="task-row">
      <div className="task-row-info">
        <span className={`badge status-${task.status}`}>{task.status}</span>
        <span className="task-row-title">{task.title}</span>
      </div>
      <div className="task-row-meta">
        {task.project?.name && <span className="task-row-project">{task.project.name}</span>}
        {task.dueDate && (
          <span className={`task-row-date ${isOverdue ? 'overdue' : ''}`}>
            {isOverdue ? '⚠ ' : ''}
            {isValid(new Date(task.dueDate)) ? format(new Date(task.dueDate), 'MMM d') : ''}
          </span>
        )}
      </div>
    </Link>
  );
};

const Dashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardAPI.get()
      .then(r => setData(r.data.dashboard))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page"><div className="loader" /></div>;
  if (!data) return <div className="page"><p>Failed to load dashboard.</p></div>;

  const { stats, statusBreakdown, priorityBreakdown, projects, overdueTasks, dueSoonTasks, myActiveTasks, recentTasks } = data;

  const statusChartData = Object.entries(statusBreakdown).map(([k, v]) => ({ name: k, value: v, color: STATUS_COLORS[k] }));
  const priorityChartData = Object.entries(priorityBreakdown).filter(([, v]) => v > 0).map(([k, v]) => ({ name: k, value: v, color: PRIORITY_COLORS[k] }));

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Good {getGreeting()}, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="page-subtitle">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <Link to="/projects/new" className="btn btn-primary">+ New Project</Link>
      </div>

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom: 28 }}>
        <StatCard label="Total Projects" value={stats.totalProjects} icon="◈" color="var(--mauve)" />
        <StatCard label="Total Tasks" value={stats.totalTasks} icon="◫" color="var(--blue)" sub={`${stats.completedTasks} done`} />
        <StatCard label="My Tasks" value={stats.myTasks} icon="◉" color="var(--teal)" />
        <StatCard label="Overdue" value={stats.overdueTasks} icon="⚠" color={stats.overdueTasks > 0 ? 'var(--red)' : 'var(--green)'} />
      </div>

      {/* Charts row */}
      <div className="grid-2" style={{ marginBottom: 28 }}>
        <div className="card dashboard-chart">
          <h3 className="section-title">Task Status</h3>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={statusChartData} cx="50%" cy="50%" innerRadius={50} outerRadius={75}
                  dataKey="value" paddingAngle={3}>
                  {statusChartData.map((e, i) => <Cell key={i} fill={e.color} stroke="none" />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--mantle)', border: '1px solid var(--surface0)', borderRadius: 8, color: 'var(--text)', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="chart-legend">
              {statusChartData.map(e => (
                <div key={e.name} className="legend-item">
                  <span className="legend-dot" style={{ background: e.color }} />
                  <span>{e.name}</span>
                  <span className="legend-val">{e.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card dashboard-chart">
          <h3 className="section-title">Priority Breakdown</h3>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={priorityChartData} cx="50%" cy="50%" innerRadius={50} outerRadius={75}
                  dataKey="value" paddingAngle={3}>
                  {priorityChartData.map((e, i) => <Cell key={i} fill={e.color} stroke="none" />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--mantle)', border: '1px solid var(--surface0)', borderRadius: 8, color: 'var(--text)', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="chart-legend">
              {priorityChartData.map(e => (
                <div key={e.name} className="legend-item">
                  <span className="legend-dot" style={{ background: e.color }} />
                  <span>{e.name}</span>
                  <span className="legend-val">{e.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid-3">
        {/* My active tasks */}
        <div className="card">
          <div className="section-header">
            <h3 className="section-title">My Active Tasks</h3>
            <Link to="/tasks?assignee=me" className="section-link">View all</Link>
          </div>
          {myActiveTasks.length === 0 ? (
            <div className="empty-state" style={{ padding: '30px 0' }}>
              <div>✓</div>
              <p>All caught up!</p>
            </div>
          ) : (
            myActiveTasks.map(t => <TaskRow key={t._id} task={t} />)
          )}
        </div>

        {/* Overdue */}
        <div className="card">
          <div className="section-header">
            <h3 className="section-title" style={{ color: overdueTasks.length > 0 ? 'var(--red)' : undefined }}>
              Overdue {overdueTasks.length > 0 && `(${overdueTasks.length})`}
            </h3>
          </div>
          {overdueTasks.length === 0 ? (
            <div className="empty-state" style={{ padding: '30px 0' }}>
              <div>🎉</div>
              <p>No overdue tasks!</p>
            </div>
          ) : (
            overdueTasks.slice(0, 5).map(t => <TaskRow key={t._id} task={t} />)
          )}
        </div>

        {/* Due soon */}
        <div className="card">
          <div className="section-header">
            <h3 className="section-title">Due This Week</h3>
          </div>
          {dueSoonTasks.length === 0 ? (
            <div className="empty-state" style={{ padding: '30px 0' }}>
              <div>📅</div>
              <p>Nothing due soon</p>
            </div>
          ) : (
            dueSoonTasks.slice(0, 5).map(t => <TaskRow key={t._id} task={t} />)
          )}
        </div>
      </div>

      {/* Projects quick view */}
      {projects.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <div className="section-header" style={{ marginBottom: 16 }}>
            <h3 className="section-title">Recent Projects</h3>
            <Link to="/projects" className="section-link">View all</Link>
          </div>
          <div className="grid-3">
            {projects.map(p => (
              <Link key={p._id} to={`/projects/${p._id}`} className="project-quick-card card">
                <div className="project-color-bar" style={{ background: p.color || 'var(--mauve)' }} />
                <div className="project-quick-name">{p.name}</div>
                <div className={`badge status-${p.status}`}>{p.status}</div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
};

export default Dashboard;