const express = require('express');
const pool = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth');
const { rankClinicsByDistance } = require('../utils/distance');

const router = express.Router();

// POST /sos
// Body: { lat, lng }
// Auto-assigns the nearest OPEN clinic by distance and logs the alert.
router.post('/', authenticate, async (req, res) => {
  try {
    const { lat, lng } = req.body;
    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ error: 'lat and lng are required' });
    }

    const [clinics] = await pool.query('SELECT * FROM clinics');
    const ranked = rankClinicsByDistance(clinics, lat, lng, { openOnly: true });

    if (ranked.length === 0) {
      return res.status(503).json({
        error: 'No open clinics currently available nearby. Please call emergency services directly.',
      });
    }

    const nearest = ranked[0];

    const [result] = await pool.query(
      `INSERT INTO sos_alerts (user_id, channel, lat, lng, assigned_clinic_id, status)
       VALUES (?, 'app', ?, ?, ?, 'dispatched')`,
      [req.user.id, lat, lng, nearest.id]
    );

    return res.status(201).json({
      alert_id: result.insertId,
      status: 'dispatched',
      assigned_clinic: {
        id: nearest.id,
        name: nearest.name,
        distance_km: nearest.distance_km,
        phone: nearest.phone,
      },
    });
  } catch (err) {
    console.error('POST /sos error:', err);
    return res.status(500).json({ error: 'Failed to trigger SOS' });
  }
});

// GET /sos/:id - poll current status (used by the app's SOS live-status screen)
router.get('/:id', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT sa.*, c.name AS clinic_name, c.phone AS clinic_phone
       FROM sos_alerts sa
       LEFT JOIN clinics c ON c.id = sa.assigned_clinic_id
       WHERE sa.id = ? AND sa.user_id = ?`,
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Alert not found' });
    return res.json({ alert: rows[0] });
  } catch (err) {
    console.error('GET /sos/:id error:', err);
    return res.status(500).json({ error: 'Failed to load alert' });
  }
});

// PATCH /sos/:id/status
// Restricted to clinic_staff/vht/admin - patients cannot self-update dispatch status.
router.patch(
  '/:id/status',
  authenticate,
  requireRole('vht', 'clinic_staff', 'admin'),
  async (req, res) => {
    try {
      const { status } = req.body;
      const validStatuses = ['dispatched', 'en_route', 'arrived', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
      }

      const [result] = await pool.query('UPDATE sos_alerts SET status = ? WHERE id = ?', [
        status,
        req.params.id,
      ]);

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Alert not found' });
      }

      return res.json({ id: Number(req.params.id), status });
    } catch (err) {
      console.error('PATCH /sos/:id/status error:', err);
      return res.status(500).json({ error: 'Failed to update alert status' });
    }
  }
);

module.exports = router;
