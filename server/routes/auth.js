const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const PendingUser = require('../models/PendingUser');
const { protect } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimiter');
const { sendVerificationEmail } = require('../utils/emailService');

// helper to generate JWT token
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
    // check if email already exists in User collection
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // check if email already exists in PendingUser collection
    const existingPending = await PendingUser.findOne({ email });
    if (existingPending) {
      // delete old pending and allow re-registration
      await existingPending.deleteOne();
    }

    // hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // send verification email FIRST before saving anything
    await sendVerificationEmail(email, name, verificationToken);

    // only save to PendingUser after email succeeds
    await PendingUser.create({
      name,
      email,
      password: hashedPassword,
      faculty,
      verificationToken
    });

    res.status(201).json({
      message: 'Please check your email to verify your account. The link expires in 24 hours.',
    });

  } catch (err) {
    // if email failed, nothing was saved — clean
    if (err.message && err.message.includes('mail')) {
      return res.status(500).json({ message: 'Failed to send verification email. Please try again.' });
    }
    next(err);
  }
});

// ─── VERIFY EMAIL ────────────────────────────────────────
// GET /api/auth/verify/:token
router.get('/verify/:token', async (req, res, next) => {
  try {
    // find pending user by token
    const pendingUser = await PendingUser.findOne({
      verificationToken: req.params.token
    });

    if (!pendingUser) {
      return res.status(400).json({ message: 'Verification link is invalid or has expired' });
    }

    // create the real user account
    const user = await User.create({
      name: pendingUser.name,
      email: pendingUser.email,
      password: pendingUser.password,
      faculty: pendingUser.faculty
    });

    // delete pending user
    await pendingUser.deleteOne();

    res.json({ 
      message: 'Email verified successfully! You can now log in.',
      email: user.email
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
      // check if they have a pending verification
      const pending = await PendingUser.findOne({ email });
      if (pending) {
        return res.status(401).json({ message: 'Please verify your email before logging in. Check your inbox.' });
      }
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // check if banned
    if (user.isBanned) {
      return res.status(403).json({ message: 'Your account has been banned. Contact administration.' });
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
// GET /api/auth/me
router.get('/me', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    next(err);
  }
});

module.exports = router;