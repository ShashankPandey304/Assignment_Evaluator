const express = require('express');
const auth = require('../middleware/auth');
const Assignment = require('../models/Assignment');

const router = express.Router();

// POST /api/assignments — Tutor creates an assignment
router.post('/', auth, async (req, res) => {
  if (req.user.role !== 'tutor') {
    return res.status(403).json({ message: 'Only tutors can create assignments' });
  }

  const { title, subject, description, instructions, course, dueDate, maxMarks } = req.body;

  if (!title || !subject || !description || !instructions || !course || !dueDate) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const assignment = new Assignment({
      title,
      subject,
      description,
      instructions,
      course,
      dueDate,
      maxMarks: maxMarks || 100,
      createdBy: req.user.id,
    });

    await assignment.save();
    res.status(201).json(assignment);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/assignments — Get assignments
// Tutor: all assignments they created
// Student: assignments filtered by their course
router.get('/', auth, async (req, res) => {
  try {
    let filter = {};

    if (req.user.role === 'tutor') {
      filter.createdBy = req.user.id;
    } else if (req.user.role === 'student') {
      if (req.query.course) {
        filter.course = req.query.course;
      }
    }

    const assignments = await Assignment.find(filter)
      .populate('createdBy', 'name email')
      .sort({ dueDate: 1 });

    res.json(assignments);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/assignments/:id — Get single assignment details
router.get('/:id', auth, async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    res.json(assignment);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/assignments/:id — Tutor deletes an assignment
router.delete('/:id', auth, async (req, res) => {
  if (req.user.role !== 'tutor') {
    return res.status(403).json({ message: 'Only tutors can delete assignments' });
  }

  try {
    await Assignment.findByIdAndDelete(req.params.id);
    res.json({ message: 'Assignment deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
