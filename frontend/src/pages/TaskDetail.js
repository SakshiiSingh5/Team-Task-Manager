import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { taskAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { format, isValid } from 'date-fns';
import toast from 'react-hot-toast';
import './TaskDetail.css';

const STATUSES = ['todo', 'in-progress', 'review', 'done'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

const TaskDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});

  const load = useCallback(async () => {
    try {
      const { data } = await taskAPI.get(id);
      setTask(data.task);
      setEditForm({
        title: data.task.title,
        description: data.task.description,
        status: data.task.status,
        priority: data.task.priority,
        dueDate: data.task.dueDate ? data.task.dueDate.slice(0, 10) : '',
      });
    } catch {
      toast.error('Task not found');
      navigate('/tasks');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);

  const handleUpdate = async (updates) => {
    try {
      const { data } = await taskAPI.update(id, updates);
      setTask(data.task);
      toast.success('Task updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    }
  };

  const handleSaveEdit = async () => {
    await handleUpdate(editForm);
    setEditing(false);
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setSubmitting(true);
    try {
      const { data } = await taskAPI.addComment(id, { text: comment });
      setTask(t => ({ ...t, comments: data.comments }));
      setComment('');
    } catch (err) {
      toast.error('Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="page"><div className="loader" /></div>;
  if (!task) return null;

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';
  const projectMembers = task.project?.members || [];
  const isAdmin = projectMembers.find(m => m.user?._id === user?._id)?.role === 'admin';
  const isCreator = task.createdBy?._id === user?._id;
  const isAssignee = task.assignee?._id === user?._id;
  const canEdit = isAdmin || isCreator || isAssignee;

  return (
    <div className="page">
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, fontSize: 13, color: 'var(--subtext0)' }}>
        <Link to="/tasks">Tasks</Link>
        {task.project && <>
          <span>/</span>
          <Link to={`/projects/${task.project._id}`}>{task.project.name}</Link>
        </>}
        <span>/</span>
        <span style={{ color: 'var(--text)' }}>Task</span>
      </div>

      <div className="task-detail-layout">
        {/* Main */}
        <div className="task-detail-main">
          {editing ? (
            <div className="edit-form">
              <div className="form-group">
                <input className="form-input" style={{ fontSize: 22, fontFamily: 'Syne, sans-serif', fontWeight: 700 }}
                  value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-input" rows={6} value={editForm.description}
                  onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-primary" onClick={handleSaveEdit}>Save</button>
                <button className="btn btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
                <h1 style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.3 }}>{task.title}</h1>
                {canEdit && (
                  <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>Edit</button>
                )}
              </div>
              {isOverdue && (
                <div className="overdue-notice">⚠ This task is overdue</div>
              )}
              {task.description && (
                <div className="task-description">{task.description}</div>
              )}
              {task.tags?.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '16px 0' }}>
                  {task.tags.map(t => <span key={t} className="tag">{t}</span>)}
                </div>
              )}
            </>
          )}

          {/* Comments */}
          <div className="comments-section">
            <h3 className="section-title" style={{ marginBottom: 16 }}>
              Comments ({task.comments?.length || 0})
            </h3>
            <form onSubmit={handleComment} className="comment-form">
              <div className="avatar avatar-sm">{user?.name?.[0]?.toUpperCase()}</div>
              <input className="form-input" placeholder="Add a comment..."
                value={comment} onChange={e => setComment(e.target.value)} />
              <button type="submit" className="btn btn-primary btn-sm" disabled={submitting || !comment.trim()}>
                {submitting ? '...' : 'Post'}
              </button>
            </form>
            <div className="comments-list">
              {task.comments?.length === 0 && (
                <p style={{ color: 'var(--overlay0)', fontSize: 13 }}>No comments yet.</p>
              )}
              {[...(task.comments || [])].reverse().map(c => (
                <div key={c._id} className="comment-item">
                  <div className="avatar avatar-sm">{c.author?.name?.[0]?.toUpperCase()}</div>
                  <div className="comment-body">
                    <div className="comment-meta">
                      <span className="comment-author">{c.author?.name}</span>
                      <span className="comment-time">
                        {isValid(new Date(c.createdAt)) ? format(new Date(c.createdAt), 'MMM d, yyyy HH:mm') : ''}
                      </span>
                    </div>
                    <p className="comment-text">{c.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="task-detail-sidebar">
          <div className="card">
            <h3 className="section-title" style={{ marginBottom: 16 }}>Details</h3>
            <div className="detail-fields">
              <div className="detail-field">
                <span className="detail-label">Status</span>
                <select className="form-select" value={task.status}
                  onChange={e => handleUpdate({ status: e.target.value })}>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="detail-field">
                <span className="detail-label">Priority</span>
                {canEdit ? (
                  <select className="form-select" value={task.priority}
                    onChange={e => handleUpdate({ priority: e.target.value })}>
                    {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                ) : (
                  <span className={`badge priority-${task.priority}`}>{task.priority}</span>
                )}
              </div>
              <div className="detail-field">
                <span className="detail-label">Assignee</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {task.assignee ? (
                    <>
                      <div className="avatar avatar-sm">{task.assignee.name?.[0]?.toUpperCase()}</div>
                      <span style={{ fontSize: 13 }}>{task.assignee.name}</span>
                    </>
                  ) : <span style={{ color: 'var(--overlay0)', fontSize: 13 }}>Unassigned</span>}
                </div>
              </div>
              <div className="detail-field">
                <span className="detail-label">Created by</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="avatar avatar-sm">{task.createdBy?.name?.[0]?.toUpperCase()}</div>
                  <span style={{ fontSize: 13 }}>{task.createdBy?.name}</span>
                </div>
              </div>
              <div className="detail-field">
                <span className="detail-label">Due Date</span>
                {canEdit ? (
                  <input type="date" className="form-input"
                    value={editForm.dueDate}
                    onChange={e => {
                      setEditForm(f => ({ ...f, dueDate: e.target.value }));
                      handleUpdate({ dueDate: e.target.value || null });
                    }} />
                ) : (
                  <span style={{ fontSize: 13, color: isOverdue ? 'var(--red)' : 'var(--text)' }}>
                    {task.dueDate && isValid(new Date(task.dueDate))
                      ? format(new Date(task.dueDate), 'MMM d, yyyy')
                      : 'No due date'}
                  </span>
                )}
              </div>
              <div className="detail-field">
                <span className="detail-label">Project</span>
                {task.project && (
                  <Link to={`/projects/${task.project._id}`} style={{ fontSize: 13, color: 'var(--mauve)' }}>
                    {task.project.name}
                  </Link>
                )}
              </div>
              <div className="detail-field">
                <span className="detail-label">Created</span>
                <span style={{ fontSize: 13, color: 'var(--subtext0)' }}>
                  {isValid(new Date(task.createdAt)) ? format(new Date(task.createdAt), 'MMM d, yyyy') : ''}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDetail;