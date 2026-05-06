import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { taskAPI, projectAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { format, isValid } from 'date-fns';
import toast from 'react-hot-toast';
import './Tasks.css';

const STATUSES = ['todo', 'in-progress', 'review', 'done'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

const Tasks = () => {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', priority: '', project: '', search: '' });
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  useEffect(() => {
    projectAPI.list().then(r => setProjects(r.data.projects)).catch(console.error);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.priority) params.priority = filters.priority;
      if (filters.project) params.project = filters.project;
      if (filters.search) params.search = filters.search;
      if (searchParams.get('assignee') === 'me') params.assignee = 'me';
      const { data } = await taskAPI.list(params);
      setTasks(data.tasks);
    } catch (err) {
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [filters, searchParams]);

  useEffect(() => { load(); }, [load]);

  const handleStatusChange = async (taskId, status) => {
    try {
      const { data } = await taskAPI.update(taskId, { status });
      setTasks(t => t.map(x => x._id === taskId ? data.task : x));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await taskAPI.delete(id);
      setTasks(t => t.filter(x => x._id !== id));
      toast.success('Task deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Tasks</h1>
          <p className="page-subtitle">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="task-filters">
        <input
          className="form-input" placeholder="🔍 Search tasks..."
          value={filters.search}
          onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
          style={{ maxWidth: 280 }}
        />
        <select className="form-select" style={{ maxWidth: 160 }} value={filters.status}
          onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="form-select" style={{ maxWidth: 160 }} value={filters.priority}
          onChange={e => setFilters(f => ({ ...f, priority: e.target.value }))}>
          <option value="">All Priorities</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select className="form-select" style={{ maxWidth: 200 }} value={filters.project}
          onChange={e => setFilters(f => ({ ...f, project: e.target.value }))}>
          <option value="">All Projects</option>
          {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
        </select>
        {(filters.status || filters.priority || filters.project || filters.search) && (
          <button className="btn btn-ghost btn-sm" onClick={() => setFilters({ status: '', priority: '', project: '', search: '' })}>
            Clear
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="loader" /></div>
      ) : tasks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">◫</div>
          <h3>No tasks found</h3>
          <p>Try adjusting your filters or create a task inside a project</p>
        </div>
      ) : (
        <div className="tasks-table">
          <div className="tasks-table-header">
            <span>Task</span>
            <span>Project</span>
            <span>Assignee</span>
            <span>Priority</span>
            <span>Status</span>
            <span>Due</span>
            <span></span>
          </div>
          {tasks.map(task => {
            const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';
            return (
              <div key={task._id} className={`tasks-table-row ${isOverdue ? 'overdue-row' : ''}`}>
                <Link to={`/tasks/${task._id}`} className="task-title-cell">
                  <span className="task-title-text">{task.title}</span>
                  {isOverdue && <span className="overdue-badge">overdue</span>}
                </Link>
                <span className="task-project-cell">
                  {task.project && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: task.project.color || 'var(--mauve)' }} />
                      <span style={{ fontSize: 13, color: 'var(--subtext1)' }}>{task.project.name}</span>
                    </div>
                  )}
                </span>
                <span>
                  {task.assignee ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div className="avatar avatar-sm">{task.assignee.name?.[0]?.toUpperCase()}</div>
                      <span style={{ fontSize: 13 }}>{task.assignee.name?.split(' ')[0]}</span>
                    </div>
                  ) : <span style={{ color: 'var(--overlay0)', fontSize: 13 }}>—</span>}
                </span>
                <span><span className={`badge priority-${task.priority}`}>{task.priority}</span></span>
                <span>
                  <select className="status-select-sm"
                    value={task.status}
                    onChange={e => handleStatusChange(task._id, e.target.value)}>
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </span>
                <span style={{ fontSize: 12, color: isOverdue ? 'var(--red)' : 'var(--subtext0)', fontFamily: 'JetBrains Mono, monospace' }}>
                  {task.dueDate && isValid(new Date(task.dueDate)) ? format(new Date(task.dueDate), 'MMM d') : '—'}
                </span>
                <span>
                  <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--overlay0)' }}
                    onClick={() => handleDelete(task._id)}>✕</button>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Tasks;