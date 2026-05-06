const express = require('express');
const { body } = require('express-validator');
const {
  getProjects,
  createProject,
  getProject,
  updateProject,
  deleteProject,
  addMember,
  removeMember
} = require('../controllers/projectController');

const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

// GET /api/projects — get all projects for logged-in user
router.get('/', protect, getProjects);

// POST /api/projects — create a new project
router.post(
  '/',
  protect,
  [
    body('name')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Project name must be 2-100 characters'),
    body('description')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Description cannot exceed 500 characters'),
    body('color')
      .optional()
      .isHexColor()
      .withMessage('Color must be a valid hex color'),
    body('status')
      .optional()
      .isIn(['active', 'completed', 'archived'])
      .withMessage('Status must be active, completed, or archived'),
    body('dueDate')
      .optional()
      .isISO8601()
      .withMessage('Due date must be a valid date'),
  ],
  validate,       // ✅ separate argument, NOT inside the array
  createProject
);

// GET /api/projects/:id — get single project with tasks
router.get('/:id', protect, getProject);

// PUT /api/projects/:id — update project
router.put(
  '/:id',
  protect,
  [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Project name must be 2-100 characters'),
    body('description')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Description cannot exceed 500 characters'),
    body('status')
      .optional()
      .isIn(['active', 'completed', 'archived'])
      .withMessage('Status must be active, completed, or archived'),
    body('color')
      .optional()
      .isHexColor()
      .withMessage('Color must be a valid hex color'),
    body('dueDate')
      .optional()
      .isISO8601()
      .withMessage('Due date must be a valid date'),
  ],
  validate,       // ✅ separate argument
  updateProject
);

// DELETE /api/projects/:id — delete project (owner only)
router.delete('/:id', protect, deleteProject);

// POST /api/projects/:id/members — add member to project
router.post(
  '/:id/members',
  protect,
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email required'),
    body('role')
      .optional()
      .isIn(['admin', 'member'])
      .withMessage('Role must be admin or member'),
  ],
  validate,       // ✅ separate argument
  addMember
);

// DELETE /api/projects/:id/members/:userId — remove member
router.delete('/:id/members/:userId', protect, removeMember);

module.exports = router;