const express = require('express');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /notifications/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, title, body, kind, read_at, created_at
       FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 100`,
      [req.user.id]
    );
    return res.json({ notifications: rows });
  } catch (err) {
    console.error('GET /notifications/me error:', err);
    return res.status(500).json({ error: 'Failed to load notifications' });
  }
});

// PATCH /notifications/:id/read
router.patch('/:id/read', authenticate, async (req, res) => {
  try {
    const [result] = await pool.query(
      `UPDATE notifications SET read_at = NOW()
       WHERE id = ? AND user_id = ? AND read_at IS NULL`,
      [req.params.id, req.user.id]
    );
    return res.json({ updated: result.affectedRows });
  } catch (err) {
    console.error('PATCH /notifications/:id/read error:', err);
    return res.status(500).json({ error: 'Failed to update notification' });
  }
});

module.exports = router;
