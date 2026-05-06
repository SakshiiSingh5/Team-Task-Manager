import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { projectAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { format, isValid } from 'date-fns';
import './Projects.css';

const COLORS = ['#cba6f7', '#89b4fa', '#94e2d5', '#a6e3a1', '#f9e2af', '#fab387', '#f38ba8', '#74c7ec'];

const ProjectModal = ({ onClose, onSave, project }) => {
  const [form, setForm] = useState({
    name: project?.name || '',
    description: project?.description || '',
    dueDate: project?.dueDate ? project.dueDate.slice(0, 10) : '',
    color: project?.color || '#cba6f7',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(form);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{project ? 'Edit Project' : 'New Project'}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label className="form-label">Project Name *</label>
            <input className="form-input" placeholder="e.g. Website Redesign"
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-input" rows={3} placeholder="What's this project about?"
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Due Date</label>
            <input type="date" className="form-input"
              value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Color</label>
            <div className="color-picker">
              {COLORS.map(c => (
                <button key={c} type="button" className={`color-swatch ${form.color === c ? 'selected' : ''}`}
                  style={{ background: c }} onClick={() => setForm(f => ({ ...f, color: c }))} />
              ))}
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : (project ? 'Update' : 'Create Project')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ProjectCard = ({ project, onEdit, onDelete, userId }) => {
  const progress = project.taskCount > 0 ? Math.round((project.completedCount / project.taskCount) * 100) : 0;
  const isOwner = project.owner?._id === userId;

  return (
    <Link to={`/projects/${project._id}`} className="project-card card">
      <div className="project-card-header">
        <div className="project-color-dot" style={{ background: project.color || 'var(--mauve)' }} />
        <div className="project-card-actions" onClick={e => e.preventDefault()}>
          {isOwner && (
            <>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onEdit(project)} title="Edit">✎</button>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onDelete(project._id)} title="Delete" style={{ color: 'var(--red)' }}>✕</button>
            </>
          )}
        </div>
      </div>

      <h3 className="project-card-name">{project.name}</h3>
      {project.description && <p className="project-card-desc">{project.description}</p>}

      <div className="project-progress">
        <div className="project-progress-bar">
          <div className="project-progress-fill" style={{ width: `${progress}%`, background: project.color || 'var(--mauve)' }} />
        </div>
        <span className="project-progress-text">{progress}%</span>
      </div>

      <div className="project-card-footer">
        <span className={`badge status-${project.status}`}>{project.status}</span>
        <div className="project-card-stats">
          <span>{project.taskCount || 0} tasks</span>
          {project.dueDate && isValid(new Date(project.dueDate)) && (
            <span>{format(new Date(project.dueDate), 'MMM d')}</span>
          )}
        </div>
      </div>

      <div className="project-members">
        {project.members?.slice(0, 4).map((m, i) => (
          <div key={i} className="avatar avatar-sm member-avatar"
            style={{ marginLeft: i > 0 ? -8 : 0 }} title={m.user?.name}>
            {m.user?.name?.[0]?.toUpperCase()}
          </div>
        ))}
        {project.members?.length > 4 && (
          <div className="avatar avatar-sm member-avatar" style={{ marginLeft: -8, background: 'var(--surface1)' }}>
            +{project.members.length - 4}
          </div>
        )}
      </div>
    </Link>
  );
};

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editProject, setEditProject] = useState(null);
  const [filter, setFilter] = useState('all');
  const { user } = useAuth();
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      const { data } = await projectAPI.list();
      setProjects(data.projects);
    } catch {
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (form) => {
    try {
      if (editProject) {
        await projectAPI.update(editProject._id, form);
        toast.success('Project updated');
      } else {
        await projectAPI.create(form);
        toast.success('Project created');
      }
      setEditProject(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save project');
      throw err;
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this project and all its tasks?')) return;
    try {
      await projectAPI.delete(id);
      toast.success('Project deleted');
      setProjects(p => p.filter(x => x._id !== id));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  const filtered = filter === 'all' ? projects : projects.filter(p => p.status === filter);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditProject(null); setShowModal(true); }}>
          + New Project
        </button>
      </div>

      <div className="filter-tabs">
        {['all', 'active', 'completed', 'archived'].map(s => (
          <button key={s} className={`filter-tab ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="loader" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">◈</div>
          <h3>No projects yet</h3>
          <p>Create your first project to get started</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowModal(true)}>
            + Create Project
          </button>
        </div>
      ) : (
        <div className="grid-3">
          {filtered.map(p => (
            <ProjectCard key={p._id} project={p} userId={user?._id}
              onEdit={(proj) => { setEditProject(proj); setShowModal(true); }}
              onDelete={handleDelete} />
          ))}
        </div>
      )}

      {showModal && (
        <ProjectModal
          project={editProject}
          onClose={() => { setShowModal(false); setEditProject(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

export default Projects;