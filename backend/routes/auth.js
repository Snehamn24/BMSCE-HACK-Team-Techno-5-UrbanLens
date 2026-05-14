const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../db/connection');
const { generateToken } = require('../middleware/auth');

const router = express.Router();
const SALT_ROUNDS = 10;

// ─── Citizen Signup ──────────────────────────────────────────
router.post('/signup', async (req, res) => {
  try {
    const { fullName, username, phone, password, address } = req.body;

    // Validation
    if (!fullName || !username || !phone || !password || !address) {
      return res.status(400).json({ error: 'All fields are required.' });
    }
    const normalizedUsername = username.toLowerCase();
    if (normalizedUsername.length < 3 || !/^[a-z0-9_]+$/.test(normalizedUsername)) {
      return res.status(400).json({ error: 'Username must be 3+ chars, alphanumeric and underscores only.' });
    }
    if (!/^[6-9]\d{9}$/.test(phone)) {
      return res.status(400).json({ error: 'Invalid Indian mobile number.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    // Check if username exists
    const existing = await pool.query('SELECT id FROM users WHERE username = $1', [normalizedUsername]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Username already taken.' });
    }

    // Create user
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const result = await pool.query(
      `INSERT INTO users (full_name, username, phone, address, password_hash, role, points)
       VALUES ($1, $2, $3, $4, $5, 'citizen', 0) RETURNING id, full_name, username, phone, address, role, points`,
      [fullName, normalizedUsername, phone, address, passwordHash]
    );

    const user = result.rows[0];
    const token = generateToken({ id: user.id, username: user.username, role: 'citizen' });

    res.status(201).json({
      message: 'Account created successfully!',
      token,
      user: { id: user.id, fullName: user.full_name, username: user.username, phone: user.phone, role: 'citizen', points: 0 },
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Server error during signup.' });
  }
});

// ─── Citizen Login ───────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const normalizedUsername = username.toLowerCase();
    const result = await pool.query(
      'SELECT id, full_name, username, phone, password_hash, role, points, badge FROM users WHERE username = $1',
      [normalizedUsername]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const token = generateToken({ id: user.id, username: user.username, role: 'citizen' });

    res.json({
      message: 'Login successful!',
      token,
      user: {
        id: user.id,
        fullName: user.full_name,
        username: user.username,
        phone: user.phone,
        role: 'citizen',
        points: user.points,
        badge: user.badge,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

// ─── Admin Login ─────────────────────────────────────────────
router.post('/admin-login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const normalizedUsername = username.toLowerCase();
    const result = await pool.query(
      'SELECT id, username, password_hash, full_name FROM admins WHERE username = $1',
      [normalizedUsername]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid admin credentials.' });
    }

    const admin = result.rows[0];
    const validPassword = await bcrypt.compare(password, admin.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid admin credentials.' });
    }

    const token = generateToken({ id: admin.id, username: admin.username, role: 'admin' });

    res.json({
      message: 'Admin login successful!',
      token,
      user: {
        id: admin.id,
        fullName: admin.full_name,
        username: admin.username,
        role: 'admin',
      },
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Server error during admin login.' });
  }
});

// ─── Officer Login ───────────────────────────────────────────
router.post('/officer-login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const normalizedEmail = email.toLowerCase();
    const result = await pool.query(
      'SELECT id, full_name, phone, municipal_area, email, password_hash FROM officers WHERE email = $1',
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email.' });
    }

    const officer = result.rows[0];

    const validPassword = await bcrypt.compare(password, officer.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid password.' });
    }

    const token = generateToken({
      id: officer.id,
      email: officer.email,
      role: 'officer',
      municipalArea: officer.municipal_area,
    });

    res.json({
      message: 'Officer login successful!',
      token,
      user: {
        id: officer.id,
        fullName: officer.full_name,
        phone: officer.phone,
        municipalArea: officer.municipal_area,
        email: officer.email,
        role: 'officer',
      },
    });
  } catch (error) {
    console.error('Officer login error:', error);
    res.status(500).json({ error: 'Server error during officer login.' });
  }
});

module.exports = router;
