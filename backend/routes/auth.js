const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  const { name, email, password, role, course } = req.body;

  try {
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'This email is already registered. Please login instead.', code: 'ALREADY_REGISTERED' });
    }

    // Create user
    const user = new User({ name, email, password, role, course: course || '' });
    await user.save();

    // Create token
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });

    res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role, course: user.course } });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password, role } = req.body;

  try {
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'No account found with this email. Please check your email or register first.', code: 'USER_NOT_FOUND' });
    }

    // Check if role matches (e.g. prevent student logging into tutor portal)
    if (role && user.role !== role) {
      return res.status(403).json({ message: `This account is not registered as a ${role}` });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect password. Please try again.', code: 'WRONG_PASSWORD' });
    }

    // Create token
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });

    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role, course: user.course } });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;