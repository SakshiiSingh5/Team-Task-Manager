const User = require('../models/User');

// GET /api/users — list all users (for assigning tasks, adding members)
const getUsers = async (req, res) => {
  try {
    const { search } = req.query;
    const filter = search
      ? { $or: [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }] }
      : {};

    const users = await User.find(filter).select('name email avatar role').limit(50);
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getUsers };