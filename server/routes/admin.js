const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// all routes here are protected — admin only
router.use(protect);
router.use(adminOnly);

// ─── GET ALL USERS ───────────────────────────────────────
// GET /api/admin/users
router.get('/users', async (req, res, next) => {
  try {
    const users = await User.find({ role: 'student' })
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({
      count: users.length,
      users
    });

  } catch (err) {
    next(err);
  }
});

// ─── GET SINGLE USER ─────────────────────────────────────
// GET /api/admin/users/:id
router.get('/users/:id', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);

  } catch (err) {
    next(err);
  }
});

// ─── BAN / UNBAN A USER ──────────────────────────────────
// PATCH /api/admin/users/:id/ban
router.patch('/users/:id/ban', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // prevent admin from banning themselves
    if (user.role === 'admin') {
      return res.status(400).json({ message: 'Cannot ban an admin account' });
    }

    // toggle ban status
    user.isBanned = !user.isBanned;
    await user.save();

    res.json({
      message: user.isBanned
        ? `${user.name} has been banned`
        : `${user.name} has been unbanned`,
      isBanned: user.isBanned
    });

  } catch (err) {
    next(err);
  }
});

// ─── DELETE A USER ───────────────────────────────────────
// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // prevent admin from deleting themselves
    if (user.role === 'admin') {
      return res.status(400).json({ message: 'Cannot delete an admin account' });
    }

    await user.deleteOne();

    res.json({ message: `${user.name} has been deleted` });

  } catch (err) {
    next(err);
  }
});

module.exports = router;