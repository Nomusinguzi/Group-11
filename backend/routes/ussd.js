const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { classifyTriage } = require('../utils/triage');
const { rankClinicsByDistance } = require('../utils/distance');

const router = express.Router();

// Approximate district centroids, used as a stand-in for GPS on feature phones.
// A registered patient's district (set at registration) drives distance ranking,
// through the SAME rankClinicsByDistance() function the app's REST routes use.
const DISTRICT_COORDS = {
  mukono: { lat: 0.3533, lng: 32.7553 },
  kampala: { lat: 0.3476, lng: 32.5825 },
  wakiso: { lat: 0.4044, lng: 32.4592 },
  jinja: { lat: 0.4478, lng: 33.2026 },
};

function normalizeDistrict(input) {
  const key = String(input || '').trim().toLowerCase();
  return DISTRICT_COORDS[key] ? key : null;
}

// Africa's Talking POSTs: sessionId, phoneNumber, text, serviceCode
// `text` accumulates every keypress in the session, separated by '*'.
router.post('/', async (req, res) => {
  res.set('Content-Type', 'text/plain');

  try {
    const { phoneNumber, text = '' } = req.body;
    const parts = text.split('*').filter((p) => p !== '');
    const level0 = parts[0];

    // ---------- Root menu ----------
    if (text === '') {
      return res.send(
        `CON Welcome to SYM-CARE\n` +
          `1. Register\n` +
          `2. Find clinic nearby\n` +
          `3. Check symptoms\n` +
          `4. SOS emergency\n` +
          `5. Check SOS status`
      );
    }

    // ---------- 1. Register: name -> district -> password -> confirm ----------
    if (level0 === '1') {
      if (parts.length === 1) {
        return res.send('CON Enter your full name:');
      }
      if (parts.length === 2) {
        return res.send(
          'CON Enter your district:\n1. Mukono\n2. Kampala\n3. Wakiso\n4. Jinja'
        );
      }
      if (parts.length === 3) {
        return res.send('CON Create a PIN (4 digits):');
      }
      if (parts.length === 4) {
        const fullName = parts[1];
        const districtMap = { 1: 'Mukono', 2: 'Kampala', 3: 'Wakiso', 4: 'Jinja' };
        const district = districtMap[parts[2]];
        const pin = parts[3];

        if (!district) {
          return res.send('END Invalid district selection. Please dial again.');
        }
        if (!/^\d{4}$/.test(pin)) {
          return res.send('END PIN must be exactly 4 digits. Please dial again.');
        }

        const [existing] = await pool.query('SELECT id FROM users WHERE phone = ?', [
          phoneNumber,
        ]);
        if (existing.length > 0) {
          return res.send('END This phone number is already registered. Dial and select 2-5 to continue.');
        }

        const passwordHash = await bcrypt.hash(pin, 10);
        await pool.query(
          `INSERT INTO users (phone, password_hash, full_name, role, district)
           VALUES (?, ?, ?, 'patient', ?)`,
          [phoneNumber, passwordHash, fullName, district]
        );

        return res.send(`END Registration complete. Welcome, ${fullName}. Dial again to use SYM-CARE.`);
      }
    }

    // ---------- 2. Find clinic nearby (uses registered district) ----------
    if (level0 === '2') {
      const [userRows] = await pool.query('SELECT * FROM users WHERE phone = ?', [phoneNumber]);
      if (userRows.length === 0) {
        return res.send('END You are not registered yet. Dial again and select 1 to register.');
      }
      const district = normalizeDistrict(userRows[0].district);
      if (!district) {
        return res.send('END No district on file. Please contact a Village Health Team member.');
      }

      const { lat, lng } = DISTRICT_COORDS[district];
      const [clinics] = await pool.query('SELECT * FROM clinics');
      const ranked = rankClinicsByDistance(clinics, lat, lng).slice(0, 3);

      if (ranked.length === 0) {
        return res.send('END No clinics found in the system yet.');
      }

      const lines = ranked
        .map(
          (c, i) =>
            `${i + 1}. ${c.name} (${c.distance_km}km) - ${c.status === 'open' ? 'OPEN' : 'CLOSED'}`
        )
        .join('\n');

      return res.send(`END Nearest clinics:\n${lines}`);
    }

    // ---------- 3. Symptom checker: chest pain -> breathing -> fever -> duration ----------
    if (level0 === '3') {
      if (parts.length === 1) {
        return res.send('CON Do you have chest pain?\n1. Yes\n2. No');
      }
      if (parts.length === 2) {
        return res.send('CON Do you have difficulty breathing?\n1. Yes\n2. No');
      }
      if (parts.length === 3) {
        return res.send('CON Do you have a fever?\n1. Yes\n2. No');
      }
      if (parts.length === 4) {
        return res.send('CON How many days have you had these symptoms? (enter a number)');
      }
      if (parts.length === 5) {
        const chestPain = parts[1] === '1';
        const breathingDifficulty = parts[2] === '1';
        const fever = parts[3] === '1';
        const durationDays = parseInt(parts[4], 10) || 0;

        // Same classifyTriage() used by POST /symptoms on the app - identical behavior.
        const { level, advice } = classifyTriage({
          chestPain,
          breathingDifficulty,
          fever,
          durationDays,
        });

        const [userRows] = await pool.query('SELECT id FROM users WHERE phone = ?', [
          phoneNumber,
        ]);

        if (userRows.length > 0) {
          await pool.query(
            `INSERT INTO symptom_reports
              (user_id, channel, chest_pain, breathing_difficulty, fever, duration_days,
               urgency_level, advice_given)
             VALUES (?, 'ussd', ?, ?, ?, ?, ?, ?)`,
            [userRows[0].id, chestPain, breathingDifficulty, fever, durationDays, level, advice]
          );
        }

        return res.send(`END Urgency: ${level.toUpperCase()}\n${advice}`);
      }
    }

    // ---------- 4. SOS emergency ----------
    if (level0 === '4') {
      const [userRows] = await pool.query('SELECT * FROM users WHERE phone = ?', [phoneNumber]);
      if (userRows.length === 0) {
        return res.send('END You are not registered yet. Dial again and select 1 to register.');
      }
      const district = normalizeDistrict(userRows[0].district);
      if (!district) {
        return res.send('END No district on file. Please contact a Village Health Team member.');
      }

      const { lat, lng } = DISTRICT_COORDS[district];
      const [clinics] = await pool.query('SELECT * FROM clinics');
      const ranked = rankClinicsByDistance(clinics, lat, lng, { openOnly: true });

      if (ranked.length === 0) {
        return res.send('END No open clinics available right now. Please seek help immediately by other means.');
      }

      const nearest = ranked[0];
      await pool.query(
        `INSERT INTO sos_alerts (user_id, channel, lat, lng, assigned_clinic_id, status)
         VALUES (?, 'ussd', ?, ?, ?, 'dispatched')`,
        [userRows[0].id, lat, lng, nearest.id]
      );

      return res.send(
        `END SOS sent. ${nearest.name} has been notified and is the responding clinic (${nearest.distance_km}km away). Stay where you are if possible.`
      );
    }

    // ---------- 5. Check SOS status ----------
    if (level0 === '5') {
      const [userRows] = await pool.query('SELECT id FROM users WHERE phone = ?', [phoneNumber]);
      if (userRows.length === 0) {
        return res.send('END You are not registered yet. Dial again and select 1 to register.');
      }

      const [alerts] = await pool.query(
        `SELECT sa.status, c.name AS clinic_name
         FROM sos_alerts sa
         LEFT JOIN clinics c ON c.id = sa.assigned_clinic_id
         WHERE sa.user_id = ?
         ORDER BY sa.created_at DESC LIMIT 1`,
        [userRows[0].id]
      );

      if (alerts.length === 0) {
        return res.send('END You have no SOS alerts on record.');
      }

      const a = alerts[0];
      return res.send(`END Latest SOS status: ${a.status.toUpperCase()}\nResponding clinic: ${a.clinic_name || 'Not yet assigned'}`);
    }

    return res.send('END Invalid selection. Please dial again.');
  } catch (err) {
    console.error('POST /ussd error:', err);
    return res.set('Content-Type', 'text/plain').send('END Sorry, something went wrong. Please try again later.');
  }
});

module.exports = router;
