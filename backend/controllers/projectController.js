const Project = require('../models/Project');
const Task = require('../models/Task');
const User = require('../models/User');

// GET /api/projects
const getProjects = async (req, res) => {
  try {
    const projects = await Project.find({
      $or: [
        { owner: req.user._id },
        { 'members.user': req.user._id }
      ]
    })
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar')
      .sort({ updatedAt: -1 });

    const projectsWithCounts = await Promise.all(
      projects.map(async (p) => {
        const taskCount = await Task.countDocuments({ project: p._id });
        const completedCount = await Task.countDocuments({ project: p._id, status: 'done' });
        return { ...p.toJSON(), taskCount, completedCount };
      })
    );

    res.json({ success: true, projects: projectsWithCounts });

  } catch (err) {
    console.error('❌ getProjects:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/projects
const createProject = async (req, res) => {
  try {
    console.log('➡️ createProject body:', req.body);
    console.log('➡️ createProject user:', req.user?._id);

    const { name, description, dueDate, color, status } = req.body;

    // ✅ model field is 'dueDate' (confirmed from Project model)
    const projectData = {
      name,
      description: description || '',
      owner: req.user._id,
      color: color || '#6366f1',
      status: status || 'active',
      members: [{ user: req.user._id, role: 'admin' }]
    };

    // Only set dueDate if it's a valid date
    if (dueDate) {
      const parsed = new Date(dueDate);
      if (!isNaN(parsed.getTime())) {
        projectData.dueDate = parsed;
      }
    }

    const project = await Project.create(projectData);

    await project.populate('owner', 'name email avatar');
    await project.populate('members.user', 'name email avatar');

    res.status(201).json({ success: true, project });

  } catch (err) {
    console.error('❌ createProject:', err.message);
    console.error(err.stack);
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/projects/:id
const getProject = async (req, res) => {
  try {
    // ✅ Guard against frontend route keyword 'new' hitting this endpoint
    if (req.params.id === 'new') {
      return res.status(400).json({ success: false, message: 'Invalid project ID.' });
    }

    const project = await Project.findById(req.params.id)
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar');

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    const isOwner = project.owner._id.toString() === req.user._id.toString();
    const isMember = project.members.some(
      m => m.user._id.toString() === req.user._id.toString()
    );

    if (!isOwner && !isMember) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const tasks = await Task.find({ project: project._id })
      .populate('assignee', 'name email avatar')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ success: true, project, tasks });

  } catch (err) {
    console.error('❌ getProject:', err.message);
    if (err.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid project ID format.' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/projects/:id
const updateProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    const isOwner = project.owner.toString() === req.user._id.toString();
    const member = project.members.find(
      m => m.user.toString() === req.user._id.toString()
    );

    if (!isOwner && (!member || member.role !== 'admin')) {
      return res.status(403).json({ success: false, message: 'Only project admins can update the project.' });
    }

    const { name, description, status, dueDate, color } = req.body;

    if (name !== undefined) project.name = name;
    if (description !== undefined) project.description = description;
    if (color !== undefined) project.color = color;

    // ✅ Validate against model enum: 'active' | 'completed' | 'archived'
    if (status !== undefined) {
      if (!['active', 'completed', 'archived'].includes(status)) {
        return res.status(400).json({ success: false, message: "Status must be 'active', 'completed', or 'archived'." });
      }
      project.status = status;
    }

    if (dueDate !== undefined) {
      if (dueDate === null || dueDate === '') {
        project.dueDate = null;
      } else {
        const parsed = new Date(dueDate);
        if (isNaN(parsed.getTime())) {
          return res.status(400).json({ success: false, message: 'Invalid due date.' });
        }
        project.dueDate = parsed;
      }
    }

    await project.save();
    await project.populate('owner', 'name email avatar');
    await project.populate('members.user', 'name email avatar');

    res.json({ success: true, project });

  } catch (err) {
    console.error('❌ updateProject:', err.message);
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/projects/:id
const deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    if (project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the project owner can delete it.' });
    }

    await Task.deleteMany({ project: project._id });
    await project.deleteOne();

    res.json({ success: true, message: 'Project deleted successfully.' });

  } catch (err) {
    console.error('❌ deleteProject:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/projects/:id/members
const addMember = async (req, res) => {
  try {
    const { email, role } = req.body;
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    const isOwner = project.owner.toString() === req.user._id.toString();
    const requestingMember = project.members.find(
      m => m.user.toString() === req.user._id.toString()
    );

    if (!isOwner && (!requestingMember || requestingMember.role !== 'admin')) {
      return res.status(403).json({ success: false, message: 'Only project admins can add members.' });
    }

    const userToAdd = await User.findOne({ email });
    if (!userToAdd) {
      return res.status(404).json({ success: false, message: 'No user found with that email.' });
    }

    const alreadyMember = project.members.some(
      m => m.user.toString() === userToAdd._id.toString()
    );
    if (alreadyMember) {
      return res.status(400).json({ success: false, message: 'User is already a member.' });
    }

    project.members.push({ user: userToAdd._id, role: role || 'member' });
    await project.save();
    await project.populate('members.user', 'name email avatar');

    res.json({ success: true, project });

  } catch (err) {
    console.error('❌ addMember:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/projects/:id/members/:userId
const removeMember = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    const isOwner = project.owner.toString() === req.user._id.toString();
    const requestingMember = project.members.find(
      m => m.user.toString() === req.user._id.toString()
    );

    if (!isOwner && (!requestingMember || requestingMember.role !== 'admin')) {
      return res.status(403).json({ success: false, message: 'Only project admins can remove members.' });
    }

    if (project.owner.toString() === req.params.userId) {
      return res.status(400).json({ success: false, message: 'Cannot remove the project owner.' });
    }

    project.members = project.members.filter(
      m => m.user.toString() !== req.params.userId
    );

    await project.save();
    await project.populate('members.user', 'name email avatar');

    res.json({ success: true, project });

  } catch (err) {
    console.error('❌ removeMember:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getProjects,
  createProject,
  getProject,
  updateProject,
  deleteProject,
  addMember,
  removeMember
};