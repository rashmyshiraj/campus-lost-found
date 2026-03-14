const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authLimiter } = require('../middleware/rateLimiter');

// helper to generate token
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// ─── REGISTER ───────────────────────────────────────────
// POST /api/auth/register
router.post('/register', authLimiter, async (req, res, next) => {
  const { name, email, password, faculty } = req.body;

  try {
    // check if email already exists
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // create the user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      faculty
    });

    res.status(201).json({
      message: 'Account created successfully',
      token: generateToken(user),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        faculty: user.faculty,
        role: user.role
      }
    });

  } catch (err) {
    next(err);
  }
});

// ─── LOGIN ──────────────────────────────────────────────
// POST /api/auth/login
router.post('/login', authLimiter, async (req, res, next) => {
  const { email, password } = req.body;

  try {
    // find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    res.json({
      message: 'Login successful',
      token: generateToken(user),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        faculty: user.faculty,
        role: user.role
      }
    });

  } catch (err) {
    next(err);
  }
});

// ─── GET CURRENT USER ───────────────────────────────────
// GET /api/auth/me  (protected)
const { protect } = require('../middleware/authMiddleware');

router.get('/me', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
 } catch (err) {
    next(err);
  }
});

module.exports = router;