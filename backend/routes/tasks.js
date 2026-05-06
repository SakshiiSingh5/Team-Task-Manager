const express = require('express');
const { body } = require('express-validator');
const {
  getTasks,
  createTask,
  getTask,
  updateTask,
  deleteTask,
  addComment
} = require('../controllers/taskController');

const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

// GET /api/tasks — get all tasks (with optional filters)
router.get('/', protect, getTasks);

// POST /api/tasks — create a new task
router.post(
  '/',
  protect,
  [
    body('title')
      .trim()
      .isLength({ min: 2, max: 200 })
      .withMessage('Title must be 2-200 characters'),
    body('project')
      .notEmpty()
      .withMessage('Project is required'),
    body('status')
      .optional()
      .isIn(['todo', 'in-progress', 'review', 'done'])
      .withMessage('Invalid status'),
    body('priority')
      .optional()
      .isIn(['low', 'medium', 'high', 'urgent'])
      .withMessage('Invalid priority'),
    body('dueDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid due date'),
  ],
  validate,
  createTask
);

// GET /api/tasks/:id — get single task
router.get('/:id', protect, getTask);

// PUT /api/tasks/:id — update task
router.put(
  '/:id',
  protect,
  [
    body('title')
      .optional()
      .trim()
      .isLength({ min: 2, max: 200 })
      .withMessage('Title must be 2-200 characters'),
    body('status')
      .optional()
      .isIn(['todo', 'in-progress', 'review', 'done'])
      .withMessage('Invalid status'),
    body('priority')
      .optional()
      .isIn(['low', 'medium', 'high', 'urgent'])
      .withMessage('Invalid priority'),
    body('dueDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid due date'),
  ],
  validate,
  updateTask
);

// DELETE /api/tasks/:id — delete task
router.delete('/:id', protect, deleteTask);

// POST /api/tasks/:id/comments — add comment
router.post(
  '/:id/comments',
  protect,
  [
    body('text')
      .trim()
      .notEmpty()
      .withMessage('Comment text is required')
      .isLength({ max: 1000 })
      .withMessage('Comment cannot exceed 1000 characters'),
  ],
  validate,
  addComment
);

module.exports = router;