const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const PendingUser = require('../models/PendingUser');
const { protect } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimiter');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/emailService');

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

// ─── FORGOT PASSWORD ─────────────────────────────────────
// POST /api/auth/forgot-password
router.post('/forgot-password', authLimiter, async (req, res, next) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    // always return success even if email not found
    // this prevents attackers from knowing which emails are registered
    if (!user) {
      return res.json({ message: 'If that email is registered you will receive a reset link shortly.' });
    }

    // generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // save token to user
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetExpires;
    await user.save();

    // send reset email
    await sendPasswordResetEmail(email, user.name, resetToken);

    res.json({ message: 'If that email is registered you will receive a reset link shortly.' });

  } catch (err) {
    next(err);
  }
});

// ─── RESET PASSWORD ──────────────────────────────────────
// POST /api/auth/reset-password/:token
router.post('/reset-password/:token', async (req, res, next) => {
  const { password, confirmPassword } = req.body;

  try {
    // check passwords match
    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    // check password length
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // find user by token and check it hasnt expired
    const user = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Reset link is invalid or has expired' });
    }

    // hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    // clear reset token fields
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    res.json({ message: 'Password reset successful! You can now log in with your new password.' });

  } catch (err) {
    next(err);
  }
});

// ─── RESEND VERIFICATION EMAIL ───────────────────────────
// POST /api/auth/resend-verification
router.post('/resend-verification', authLimiter, async (req, res, next) => {
  const { email } = req.body;

  try {
    // check if email is in PendingUser collection
    const pendingUser = await PendingUser.findOne({ email });

    // always return same message for security
    if (!pendingUser) {
      return res.json({ 
        message: 'If that email has a pending verification you will receive a new link shortly.' 
      });
    }

    // generate fresh token
    const newToken = crypto.randomBytes(32).toString('hex');

    // update pending user with new token
    // this resets the 24 hour expiry too
    await PendingUser.deleteOne({ email });
    await PendingUser.create({
      name: pendingUser.name,
      email: pendingUser.email,
      password: pendingUser.password,
      faculty: pendingUser.faculty,
      verificationToken: newToken
    });

    // send fresh verification email
    await sendVerificationEmail(email, pendingUser.name, newToken);

    res.json({ 
      message: 'If that email has a pending verification you will receive a new link shortly.' 
    });

  } catch (err) {
    next(err);
  }
});

module.exports = router;