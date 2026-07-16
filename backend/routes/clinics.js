const express = require('express');
const pool = require('../config/db');
const { rankClinicsByDistance } = require('../utils/distance');

const router = express.Router();

// GET /clinics/nearby?lat=&lng=&openOnly=true
router.get('/nearby', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const openOnly = req.query.openOnly === 'true';

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({ error: 'lat and lng query params are required numbers' });
    }

    const [clinics] = await pool.query('SELECT * FROM clinics');
    const ranked = rankClinicsByDistance(clinics, lat, lng, { openOnly });

    return res.json({ clinics: ranked });
  } catch (err) {
    console.error('GET /clinics/nearby error:', err);
    return res.status(500).json({ error: 'Failed to load nearby clinics' });
  }
});

// GET /clinics/:id
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM clinics WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Clinic not found' });
    return res.json({ clinic: rows[0] });
  } catch (err) {
    console.error('GET /clinics/:id error:', err);
    return res.status(500).json({ error: 'Failed to load clinic' });
  }
});

module.exports = router;
