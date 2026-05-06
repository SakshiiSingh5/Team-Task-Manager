import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { projectAPI, taskAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { format, isValid } from 'date-fns';
import './ProjectDetail.css';

const STATUSES = ['todo', 'in-progress', 'review', 'done'];

const TaskCard = ({ task, onUpdate, onDelete, isAdmin, userId }) => {
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';
  const canDelete = isAdmin || task.createdBy?._id === userId;

  return (
    <div className={`task-kanban-card ${isOverdue ? 'overdue-card' : ''}`}>
      <div className="task-card-top">
        <span className={`badge priority-${task.priority}`}>{task.priority}</span>
        {canDelete && (
          <button className="btn btn-ghost btn-icon" style={{ fontSize: 11, color: 'var(--overlay0)', padding: 4 }}
            onClick={() => onDelete(task._id)}>✕</button>
        )}
      </div>
      <Link to={`/tasks/${task._id}`} className="task-card-title">{task.title}</Link>
      <div className="task-card-footer">
        {task.assignee ? (
          <div className="avatar avatar-sm" title={task.assignee.name}>
            {task.assignee.name?.[0]?.toUpperCase()}
          </div>
        ) : <div style={{ width: 28 }} />}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {task.dueDate && isValid(new Date(task.dueDate)) && (
            <span className={`task-due ${isOverdue ? 'overdue' : ''}`}>
              {format(new Date(task.dueDate), 'MMM d')}
            </span>
          )}
          <select
            className="status-select"
            value={task.status}
            onChange={e => onUpdate(task._id, { status: e.target.value })}
            onClick={e => e.preventDefault()}
          >
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
};

const TaskModal = ({ project, members, onClose, onSave }) => {
  const [form, setForm] = useState({ title: '', description: '', assignee: '', priority: 'medium', status: 'todo', dueDate: '', tags: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form, project: project._id, tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [] };
      if (!payload.assignee) delete payload.assignee;
      if (!payload.dueDate) delete payload.dueDate;
      await onSave(payload);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">New Task</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input className="form-input" placeholder="Task title" value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-input" rows={3} placeholder="Task details..."
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Assignee</label>
              <select className="form-select" value={form.assignee} onChange={e => setForm(f => ({ ...f, assignee: e.target.value }))}>
                <option value="">Unassigned</option>
                {members.map(m => <option key={m.user._id} value={m.user._id}>{m.user.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select className="form-select" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Due Date</label>
              <input type="date" className="form-input" value={form.dueDate}
                onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Tags (comma separated)</label>
            <input className="form-input" placeholder="bug, frontend, api" value={form.tags}
              onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Creating...' : 'Create Task'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AddMemberModal = ({ onClose, onAdd }) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try { await onAdd({ email, role }); onClose(); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <h2 className="modal-title">Add Member</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input type="email" className="form-input" placeholder="member@example.com" value={email}
              onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Role</label>
            <select className="form-select" value={role} onChange={e => setRole(e.target.value)}>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Adding...' : 'Add Member'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ProjectDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [view, setView] = useState('kanban');

  const load = useCallback(async () => {
    try {
      const { data } = await projectAPI.get(id);
      setProject(data.project);
      setTasks(data.tasks);
    } catch (err) {
      toast.error('Project not found');
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);

  const isAdmin = project?.members?.find(m => m.user._id === user?._id)?.role === 'admin'
    || project?.owner?._id === user?._id;

  const handleCreateTask = async (payload) => {
    try {
      const { data } = await taskAPI.create(payload);
      setTasks(t => [data.task, ...t]);
      toast.success('Task created');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create task');
      throw err;
    }
  };

  const handleUpdateTask = async (taskId, updates) => {
    try {
      const { data } = await taskAPI.update(taskId, updates);
      setTasks(t => t.map(x => x._id === taskId ? data.task : x));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update task');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await taskAPI.delete(taskId);
      setTasks(t => t.filter(x => x._id !== taskId));
      toast.success('Task deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete task');
    }
  };

  const handleAddMember = async (data) => {
    try {
      const res = await projectAPI.addMember(id, data);
      setProject(res.data.project);
      toast.success('Member added');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add member');
      throw err;
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Remove this member?')) return;
    try {
      const res = await projectAPI.removeMember(id, userId);
      setProject(res.data.project);
      toast.success('Member removed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove member');
    }
  };

  if (loading) return <div className="page"><div className="loader" /></div>;
  if (!project) return null;

  const tasksByStatus = STATUSES.reduce((acc, s) => {
    acc[s] = tasks.filter(t => t.status === s);
    return acc;
  }, {});

  const STATUS_LABELS = { 'todo': 'To Do', 'in-progress': 'In Progress', 'review': 'Review', 'done': 'Done' };

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 14, height: 14, borderRadius: '50%', background: project.color || 'var(--mauve)' }} />
            <Link to="/projects" style={{ fontSize: 13, color: 'var(--subtext0)' }}>Projects</Link>
            <span style={{ color: 'var(--overlay0)' }}>/</span>
          </div>
          <h1 className="page-title">{project.name}</h1>
          {project.description && <p className="page-subtitle">{project.description}</p>}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {isAdmin && (
            <button className="btn btn-secondary" onClick={() => setShowMemberModal(true)}>+ Member</button>
          )}
          <button className="btn btn-primary" onClick={() => setShowTaskModal(true)}>+ Task</button>
        </div>
      </div>

      {/* Members */}
      <div className="members-section">
        {project.members?.map((m) => (
          <div key={m.user._id} className="member-chip">
            <div className="avatar avatar-sm">{m.user.name?.[0]?.toUpperCase()}</div>
            <span>{m.user.name}</span>
            <span className={`badge ${m.role === 'admin' ? 'status-in-progress' : 'status-todo'}`} style={{ fontSize: 10 }}>
              {m.role}
            </span>
            {isAdmin && m.user._id !== project.owner._id && (
              <button className="btn btn-ghost btn-icon" style={{ fontSize: 10, padding: 2, color: 'var(--overlay0)' }}
                onClick={() => handleRemoveMember(m.user._id)}>✕</button>
            )}
          </div>
        ))}
      </div>

      {/* View toggle */}
      <div className="view-toggle" style={{ marginBottom: 20 }}>
        <button className={`filter-tab ${view === 'kanban' ? 'active' : ''}`} onClick={() => setView('kanban')}>Kanban</button>
        <button className={`filter-tab ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')}>List</button>
      </div>

      {/* Kanban board */}
      {view === 'kanban' && (
        <div className="kanban-board">
          {STATUSES.map(status => (
            <div key={status} className="kanban-column">
              <div className="kanban-column-header">
                <span className={`badge status-${status}`}>{STATUS_LABELS[status]}</span>
                <span className="kanban-count">{tasksByStatus[status].length}</span>
              </div>
              <div className="kanban-cards">
                {tasksByStatus[status].map(task => (
                  <TaskCard key={task._id} task={task} isAdmin={isAdmin} userId={user?._id}
                    onUpdate={handleUpdateTask} onDelete={handleDeleteTask} />
                ))}
                {tasksByStatus[status].length === 0 && (
                  <div className="kanban-empty">No tasks</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List view */}
      {view === 'list' && (
        <div className="task-list">
          {tasks.length === 0 ? (
            <div className="empty-state"><p>No tasks yet</p></div>
          ) : tasks.map(task => (
            <Link key={task._id} to={`/tasks/${task._id}`} className="task-list-row card">
              <span className={`badge status-${task.status}`}>{task.status}</span>
              <span className={`badge priority-${task.priority}`}>{task.priority}</span>
              <span className="task-list-title">{task.title}</span>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
                {task.assignee && <div className="avatar avatar-sm" title={task.assignee.name}>{task.assignee.name?.[0]?.toUpperCase()}</div>}
                {task.dueDate && isValid(new Date(task.dueDate)) && (
                  <span style={{ fontSize: 12, color: 'var(--subtext0)', fontFamily: 'JetBrains Mono, monospace' }}>
                    {format(new Date(task.dueDate), 'MMM d')}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {showTaskModal && (
        <TaskModal project={project} members={project.members}
          onClose={() => setShowTaskModal(false)} onSave={handleCreateTask} />
      )}
      {showMemberModal && (
        <AddMemberModal onClose={() => setShowMemberModal(false)} onAdd={handleAddMember} />
      )}
    </div>
  );
};

export default ProjectDetail;
