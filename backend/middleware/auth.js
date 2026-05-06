const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Single source of truth for JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_change_in_production';

// Protect routes — verifies token and attaches req.user
const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ success: false, message: 'User no longer exists.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

// Require global admin role
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required.' });
  }
  next();
};

// Require project-level admin (owner or member with admin role)
const requireProjectAdmin = (project) => (req, res, next) => {
  const isOwner = project.owner.toString() === req.user._id.toString();
  const member = project.members.find(
    m => m.user.toString() === req.user._id.toString()
  );
  const isMemberAdmin = member?.role === 'admin';
  const isGlobalAdmin = req.user.role === 'admin';

  if (!isOwner && !isMemberAdmin && !isGlobalAdmin) {
    return res.status(403).json({ success: false, message: 'Project admin access required.' });
  }
  next();
};

module.exports = { protect, requireAdmin, requireProjectAdmin };