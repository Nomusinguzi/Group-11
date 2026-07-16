const express = require('express');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { decryptField } = require('../middleware/encryption');

const router = express.Router();

// GET /patients/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, phone, full_name, role, date_of_birth, sex, district, created_at
       FROM users WHERE id = ?`,
      [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    return res.json({ user: rows[0] });
  } catch (err) {
    console.error('GET /patients/me error:', err);
    return res.status(500).json({ error: 'Failed to load profile' });
  }
});

// GET /patients/me/history
// Returns visits, referrals, and symptom reports for the authenticated patient.
// Clinical notes are decrypted only here, for the authenticated owner.
router.get('/me/history', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const [visits] = await pool.query(
      `SELECT v.id, v.visit_date, v.diagnosis_summary, v.encrypted_notes, v.prescription,
              c.name AS clinic_name
       FROM visits v
       JOIN clinics c ON c.id = v.clinic_id
       WHERE v.user_id = ?
       ORDER BY v.visit_date DESC`,
      [userId]
    );

    const decryptedVisits = visits.map((v) => {
      let notes = null;
      if (v.encrypted_notes) {
        try {
          notes = decryptField(v.encrypted_notes);
        } catch (e) {
          notes = '[unable to decrypt notes]';
        }
      }
      const { encrypted_notes, ...rest } = v;
      return { ...rest, notes };
    });

    const [referrals] = await pool.query(
      `SELECT r.id, r.reason, r.status, r.created_at,
              fc.name AS from_clinic, tc.name AS to_clinic
       FROM referrals r
       JOIN clinics fc ON fc.id = r.from_clinic_id
       JOIN clinics tc ON tc.id = r.to_clinic_id
       WHERE r.user_id = ?
       ORDER BY r.created_at DESC`,
      [userId]
    );

    const [symptomReports] = await pool.query(
      `SELECT id, channel, urgency_level, advice_given, created_at
       FROM symptom_reports WHERE user_id = ? ORDER BY created_at DESC`,
      [userId]
    );

    return res.json({ visits: decryptedVisits, referrals, symptom_reports: symptomReports });
  } catch (err) {
    console.error('GET /patients/me/history error:', err);
    return res.status(500).json({ error: 'Failed to load history' });
  }
});

module.exports = router;
