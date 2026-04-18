const express = require('express');
const path = require('path');
const multer = require('multer');
const Groq = require('groq-sdk');
const auth = require('../middleware/auth');
const Submission = require('../models/Submission');
const Assignment = require('../models/Assignment');

const router = express.Router();

// ── Multer config (store uploads in /uploads folder) ──────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

// ── Groq AI ───────────────────────────────────────────────────────────────────
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });


// ─────────────────────────────────────────────────────────────────────────────
// POST /api/submissions — Student submits an assignment
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', auth, upload.single('file'), async (req, res) => {
  if (req.user.role !== 'student') {
    return res.status(403).json({ message: 'Only students can submit assignments' });
  }

  const { assignmentId, answerText } = req.body;

  if (!assignmentId) {
    return res.status(400).json({ message: 'Assignment ID is required' });
  }

  try {
    // Prevent duplicate submissions
    const existing = await Submission.findOne({
      assignmentId,
      studentId: req.user.id,
    });
    if (existing) {
      return res.status(409).json({ message: 'You have already submitted this assignment' });
    }

    const submission = new Submission({
      assignmentId,
      studentId: req.user.id,
      answerText: answerText || '',
      fileUrl: req.file ? `/uploads/${req.file.filename}` : '',
    });

    await submission.save();
    res.status(201).json(submission);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/submissions — Tutor: all submissions; Student: own submissions
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    let query = {};

    if (req.user.role === 'student') {
      query.studentId = req.user.id;
    }
    // Tutor gets everything

    const submissions = await Submission.find(query)
      .populate('assignmentId', 'title subject course dueDate maxMarks')
      .populate('studentId', 'name email course')
      .sort({ submittedAt: -1 });

    res.json(submissions);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/submissions/:id — Single submission detail
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id', auth, async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id)
      .populate('assignmentId', 'title subject course dueDate maxMarks description instructions')
      .populate('studentId', 'name email course');

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    res.json(submission);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/submissions/:id/ai-grade — Trigger Groq AI grading
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:id/ai-grade', auth, async (req, res) => {
  if (req.user.role !== 'tutor') {
    return res.status(403).json({ message: 'Only tutors can trigger AI grading' });
  }

  try {
    const submission = await Submission.findById(req.params.id)
      .populate('assignmentId');

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    const assignment = submission.assignmentId;

    if (!submission.answerText && !submission.fileUrl) {
      return res.status(400).json({ message: 'No answer to grade' });
    }

    // Build grading prompt
    const userPrompt = `Grade the following student assignment.

ASSIGNMENT TITLE: ${assignment.title}
SUBJECT: ${assignment.subject}
INSTRUCTIONS: ${assignment.instructions}
MAXIMUM MARKS: ${assignment.maxMarks}

STUDENT'S ANSWER:
${submission.answerText || '[Student submitted a file — evaluate based on context]'}

Please evaluate this submission and respond ONLY with a valid JSON object in this exact format:
{
  "score": <number between 0 and ${assignment.maxMarks}>,
  "grade": "<letter grade: A+, A, B+, B, C+, C, D, or F>",
  "remarks": "<2-3 sentences of constructive, specific feedback about the student's work>"
}

Be fair, constructive, and specific in your remarks. Do not include any text outside the JSON.`;

    // Retry logic for rate limits
    let chatCompletion;
    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        chatCompletion = await groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: 'You are an expert academic evaluator. You always respond with valid JSON only, no markdown, no extra text.',
            },
            {
              role: 'user',
              content: userPrompt,
            },
          ],
          temperature: 0.3,
          max_tokens: 512,
          response_format: { type: 'json_object' },
        });
        break; // success
      } catch (aiErr) {
        const isRateLimit = aiErr.status === 429 || aiErr.message?.includes('429') || aiErr.message?.includes('rate_limit');
        if (isRateLimit && attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
          console.log(`Rate limited. Retrying in ${delay / 1000}s (attempt ${attempt}/${maxRetries})...`);
          await new Promise(r => setTimeout(r, delay));
        } else {
          throw aiErr;
        }
      }
    }

    const text = chatCompletion.choices[0]?.message?.content?.trim();

    // Parse JSON from response
    let parsed;
    try {
      // Strip markdown code blocks if present
      const clean = text.replace(/```json\n?|```/g, '').trim();
      parsed = JSON.parse(clean);
    } catch {
      return res.status(500).json({ message: 'AI returned invalid response. Try again.', raw: text });
    }

    // Save AI grades
    submission.aiScore = parsed.score;
    submission.aiGrade = parsed.grade;
    submission.aiRemarks = parsed.remarks;
    submission.status = 'ai_graded';
    await submission.save();

    res.json(submission);
  } catch (err) {
    console.error('AI grading error:', err.message);
    const isRateLimit = err.status === 429 || err.message?.includes('429') || err.message?.includes('rate_limit');
    if (isRateLimit) {
      return res.status(429).json({ message: 'AI rate limit reached. Please wait 1 minute and try again.' });
    }
    res.status(500).json({ message: 'AI grading failed', error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/submissions/:id/confirm — Tutor confirms/edits final grade
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:id/confirm', auth, async (req, res) => {
  if (req.user.role !== 'tutor') {
    return res.status(403).json({ message: 'Only tutors can confirm grades' });
  }

  const { finalScore, finalGrade, finalRemarks } = req.body;

  try {
    const submission = await Submission.findById(req.params.id).populate('assignmentId');

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    const scoreToSave = finalScore ?? submission.aiScore;
    const maxMarks = submission.assignmentId?.maxMarks || 100;

    if (scoreToSave < 0 || scoreToSave > maxMarks) {
      return res.status(400).json({ message: `Score must be between 0 and ${maxMarks}` });
    }

    submission.finalScore = scoreToSave;
    submission.finalGrade = finalGrade || submission.aiGrade;
    submission.finalRemarks = finalRemarks || submission.aiRemarks;
    submission.tutorConfirmed = true;
    submission.status = 'confirmed';

    await submission.save();
    res.json(submission);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
