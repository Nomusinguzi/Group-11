const express = require('express');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /appointments/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT a.*, c.name AS clinic_name
       FROM appointments a
       JOIN clinics c ON c.id = a.clinic_id
       WHERE a.user_id = ?
       ORDER BY a.appointment_date DESC`,
      [req.user.id]
    );
    return res.json({ appointments: rows });
  } catch (err) {
    console.error('GET /appointments/me error:', err);
    return res.status(500).json({ error: 'Failed to load appointments' });
  }
});

// GET /appointments/upcoming/count
router.get('/upcoming/count', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT COUNT(*) AS count FROM appointments
       WHERE user_id = ? AND status = 'scheduled' AND appointment_date >= NOW()`,
      [req.user.id]
    );
    return res.json({ count: rows[0].count });
  } catch (err) {
    console.error('GET /appointments/upcoming/count error:', err);
    return res.status(500).json({ error: 'Failed to load count' });
  }
});

// POST /appointments
router.post('/', authenticate, async (req, res) => {
  try {
    const { clinic_id, appointment_date, reason } = req.body;
    if (!clinic_id || !appointment_date) {
      return res.status(400).json({ error: 'clinic_id and appointment_date are required' });
    }
    const [clinic] = await pool.query('SELECT id FROM clinics WHERE id = ?', [clinic_id]);
    if (clinic.length === 0) return res.status(404).json({ error: 'Clinic not found' });

    const [result] = await pool.query(
      `INSERT INTO appointments (user_id, clinic_id, appointment_date, reason)
       VALUES (?, ?, ?, ?)`,
      [req.user.id, clinic_id, appointment_date, reason || null]
    );

    // fire-and-forget notification
    await pool.query(
      `INSERT INTO notifications (user_id, title, body, kind)
       VALUES (?, ?, ?, 'appointment')`,
      [req.user.id, 'Appointment scheduled',
       `Your appointment on ${appointment_date} has been booked.`]
    );

    const [rows] = await pool.query(
      `SELECT a.*, c.name AS clinic_name
       FROM appointments a JOIN clinics c ON c.id = a.clinic_id
       WHERE a.id = ?`, [result.insertId]
    );
    return res.status(201).json({ appointment: rows[0] });
  } catch (err) {
    console.error('POST /appointments error:', err);
    return res.status(500).json({ error: 'Failed to create appointment' });
  }
});

// PATCH /appointments/:id/status
router.patch('/:id/status', authenticate, async (req, res) => {
  try {
    const { status } = req.body;
    const valid = ['scheduled', 'completed', 'cancelled', 'missed'];
    if (!valid.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${valid.join(', ')}` });
    }
    const [result] = await pool.query(
      `UPDATE appointments SET status = ? WHERE id = ? AND user_id = ?`,
      [status, req.params.id, req.user.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Appointment not found' });

    const [rows] = await pool.query(
      `SELECT a.*, c.name AS clinic_name
       FROM appointments a JOIN clinics c ON c.id = a.clinic_id
       WHERE a.id = ?`, [req.params.id]
    );
    return res.json({ appointment: rows[0] });
  } catch (err) {
    console.error('PATCH /appointments/:id/status error:', err);
    return res.status(500).json({ error: 'Failed to update appointment' });
  }
});

module.exports = router;
