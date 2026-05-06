const Task = require('../models/Task');
const Project = require('../models/Project');

// GET /api/dashboard
const getDashboard = async (req, res) => {
  try {
    const userId = req.user._id;
    const now = new Date();

    // Get user's projects
    const projects = await Project.find({ 'members.user': userId })
      .populate('owner', 'name email avatar')
      .select('name color status dueDate');

    const projectIds = projects.map(p => p._id);

    // All tasks in user's projects
    const allTasks = await Task.find({ project: { $in: projectIds } })
      .populate('assignee', 'name email avatar')
      .populate('project', 'name color')
      .populate('createdBy', 'name');

    // My tasks
    const myTasks = allTasks.filter(t => t.assignee?._id?.toString() === userId.toString());

    // Status breakdown (all accessible tasks)
    const statusBreakdown = {
      todo: allTasks.filter(t => t.status === 'todo').length,
      'in-progress': allTasks.filter(t => t.status === 'in-progress').length,
      review: allTasks.filter(t => t.status === 'review').length,
      done: allTasks.filter(t => t.status === 'done').length,
    };

    // Overdue tasks
    const overdueTasks = allTasks.filter(t =>
      t.dueDate && t.dueDate < now && t.status !== 'done'
    ).slice(0, 10);

    // Due soon (next 7 days)
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const dueSoonTasks = allTasks.filter(t =>
      t.dueDate && t.dueDate >= now && t.dueDate <= in7Days && t.status !== 'done'
    ).slice(0, 10);

    // Recent tasks
    const recentTasks = [...allTasks]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 5);

    // Priority breakdown
    const priorityBreakdown = {
      urgent: allTasks.filter(t => t.priority === 'urgent' && t.status !== 'done').length,
      high: allTasks.filter(t => t.priority === 'high' && t.status !== 'done').length,
      medium: allTasks.filter(t => t.priority === 'medium' && t.status !== 'done').length,
      low: allTasks.filter(t => t.priority === 'low' && t.status !== 'done').length,
    };

    res.json({
      success: true,
      dashboard: {
        stats: {
          totalProjects: projects.length,
          totalTasks: allTasks.length,
          myTasks: myTasks.length,
          completedTasks: statusBreakdown.done,
          overdueTasks: overdueTasks.length,
          dueSoon: dueSoonTasks.length,
        },
        statusBreakdown,
        priorityBreakdown,
        projects: projects.slice(0, 6),
        overdueTasks,
        dueSoonTasks,
        recentTasks,
        myActiveTasks: myTasks.filter(t => t.status !== 'done').slice(0, 5),
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getDashboard };