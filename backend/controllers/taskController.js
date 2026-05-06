const Task = require('../models/Task');
const Project = require('../models/Project');

// ================= GET TASKS =================
const getTasks = async (req, res) => {
  try {
    const { project, status, assignee, priority, search } = req.query;

    let filter = {};

    if (project) filter.project = project;
    if (status) filter.status = status;
    if (assignee) filter.assignee = assignee;
    if (priority) filter.priority = priority;
    if (search) filter.title = { $regex: search, $options: 'i' };

    const tasks = await Task.find(filter)
      .populate('assignee', 'name email avatar')
      .populate('createdBy', 'name email')
      .populate('project', 'name color')
      .sort({ createdAt: -1 });

    res.json({ success: true, tasks });

  } catch (err) {
    console.error('❌ getTasks:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ================= CREATE TASK =================
const createTask = async (req, res) => {
  try {
    const { title, description, project, assignee, status, priority, dueDate, tags } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }
    if (!project) {
      return res.status(400).json({ success: false, message: 'Project is required' });
    }

    // Verify user is a member of the project
    const proj = await Project.findById(project);
    if (!proj) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const isMember = proj.members.some(
      m => m.user.toString() === req.user._id.toString()
    );
    const isOwner = proj.owner.toString() === req.user._id.toString();

    if (!isMember && !isOwner) {
      return res.status(403).json({ success: false, message: 'Access denied. Not a project member.' });
    }

    const taskData = {
      title,
      description: description || '',
      project,
      status: status || 'todo',
      priority: priority || 'medium',
      tags: tags || [],
      createdBy: req.user._id  // ✅ use real user, not hardcoded ID
    };

    if (assignee) taskData.assignee = assignee;
    if (dueDate) {
      const parsed = new Date(dueDate);
      if (!isNaN(parsed.getTime())) taskData.dueDate = parsed;
    }

    const task = await Task.create(taskData);

    await task.populate('assignee', 'name email avatar');
    await task.populate('createdBy', 'name email');

    res.status(201).json({ success: true, task });

  } catch (err) {
    console.error('❌ createTask:', err.message);
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

// ================= GET SINGLE TASK =================
const getTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignee', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .populate('project', 'name color');

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    res.json({ success: true, task });

  } catch (err) {
    console.error('❌ getTask:', err.message);
    if (err.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid task ID' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

// ================= UPDATE TASK =================
const updateTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const { title, description, assignee, status, priority, dueDate, tags } = req.body;

    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (assignee !== undefined) task.assignee = assignee || null;
    if (status !== undefined) task.status = status;
    if (priority !== undefined) task.priority = priority;
    if (tags !== undefined) task.tags = tags;

    if (dueDate !== undefined) {
      if (!dueDate) {
        task.dueDate = null;
      } else {
        const parsed = new Date(dueDate);
        if (!isNaN(parsed.getTime())) task.dueDate = parsed;
      }
    }

    await task.save();
    await task.populate('assignee', 'name email avatar');
    await task.populate('createdBy', 'name email');

    res.json({ success: true, task });

  } catch (err) {
    console.error('❌ updateTask:', err.message);
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

// ================= DELETE TASK =================
const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    // Only task creator or project admin can delete
    const isCreator = task.createdBy.toString() === req.user._id.toString();
    const project = await Project.findById(task.project);
    const isProjectAdmin = project?.members?.find(
      m => m.user.toString() === req.user._id.toString()
    )?.role === 'admin';
    const isOwner = project?.owner?.toString() === req.user._id.toString();

    if (!isCreator && !isProjectAdmin && !isOwner) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this task' });
    }

    await task.deleteOne();

    res.json({ success: true, message: 'Task deleted' });

  } catch (err) {
    console.error('❌ deleteTask:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ================= ADD COMMENT =================
const addComment = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    if (!req.body.text) {
      return res.status(400).json({ success: false, message: 'Comment text is required' });
    }

    task.comments = task.comments || [];
    task.comments.push({
      author: req.user._id,  // ✅ use real user
      text: req.body.text
    });

    await task.save();

    res.json({ success: true, comments: task.comments });

  } catch (err) {
    console.error('❌ addComment:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getTasks, createTask, getTask, updateTask, deleteTask, addComment };