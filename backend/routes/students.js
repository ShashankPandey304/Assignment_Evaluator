const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

// GET /api/students — Tutor fetches all registered students
router.get('/', auth, async (req, res) => {
  if (req.user.role !== 'tutor') {
    return res.status(403).json({ message: 'Only tutors can access student list' });
  }

  try {
    const students = await User.find({ role: 'student' })
      .select('name email course createdAt')
      .sort({ createdAt: -1 });

    res.json(students);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
