const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { signToken } = require('../middleware/auth');

const router = express.Router();

const VALID_ROLES = ['patient', 'vht', 'clinic_staff', 'admin'];

// POST /auth/register
router.post('/register', async (req, res) => {
  try {
    const { phone, password, full_name, role = 'patient', date_of_birth, sex, district } =
      req.body;

    if (!phone || !password || !full_name) {
      return res.status(400).json({ error: 'phone, password, and full_name are required' });
    }
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: `role must be one of: ${VALID_ROLES.join(', ')}` });
    }

    const [existing] = await pool.query('SELECT id FROM users WHERE phone = ?', [phone]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'An account with this phone number already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      `INSERT INTO users (phone, password_hash, full_name, role, date_of_birth, sex, district)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [phone, passwordHash, full_name, role, date_of_birth || null, sex || null, district || null]
    );

    const token = signToken({ id: result.insertId, phone, role });

    return res.status(201).json({
      token,
      user: { id: result.insertId, phone, full_name, role },
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) {
      return res.status(400).json({ error: 'phone and password are required' });
    }

    const [rows] = await pool.query('SELECT * FROM users WHERE phone = ?', [phone]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid phone number or password' });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid phone number or password' });
    }

    const token = signToken({ id: user.id, phone: user.phone, role: user.role });

    return res.json({
      token,
      user: {
        id: user.id,
        phone: user.phone,
        full_name: user.full_name,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = router;
