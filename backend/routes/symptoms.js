const express = require('express');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { classifyTriage } = require('../utils/triage');

const router = express.Router();

// POST /symptoms
// Body: { chestPain, breathingDifficulty, heavyBleeding, lossOfConsciousness, fever, durationDays, painLocation }
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      chestPain = false,
      breathingDifficulty = false,
      heavyBleeding = false,
      lossOfConsciousness = false,
      fever = false,
      durationDays = 0,
      painLocation = null,
    } = req.body;

    // Single source of truth for triage - shared with the USSD handler
    const { level, advice } = classifyTriage({
      chestPain,
      breathingDifficulty,
      heavyBleeding,
      lossOfConsciousness,
      fever,
      durationDays,
    });

    const [result] = await pool.query(
      `INSERT INTO symptom_reports
        (user_id, channel, chest_pain, breathing_difficulty, heavy_bleeding,
         loss_of_consciousness, fever, duration_days, pain_location, urgency_level, advice_given)
       VALUES (?, 'app', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        chestPain,
        breathingDifficulty,
        heavyBleeding,
        lossOfConsciousness,
        fever,
        durationDays,
        painLocation,
        level,
        advice,
      ]
    );

    return res.status(201).json({ report_id: result.insertId, urgency_level: level, advice });
  } catch (err) {
    console.error('POST /symptoms error:', err);
    return res.status(500).json({ error: 'Failed to process symptom report' });
  }
});

module.exports = router;
