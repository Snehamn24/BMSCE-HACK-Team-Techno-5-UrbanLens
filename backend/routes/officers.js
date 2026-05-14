const express = require('express');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db/connection');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();
const SALT_ROUNDS = 10;

// ─── Create Officer (Admin only) ─────────────────────────────
router.post('/create', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { fullName, phone, municipalArea, email, password } = req.body;

    if (!fullName || !phone || !municipalArea || !email || !password) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    if (!/^[6-9]\d{9}$/.test(phone)) {
      return res.status(400).json({ error: 'Invalid Indian mobile number.' });
    }

    const normalizedEmail = email.toLowerCase();
    if (!normalizedEmail.endsWith('.gov.in')) {
      return res.status(400).json({ error: 'Email must end with .gov.in' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    // Check if email exists
    const existing = await pool.query('SELECT id FROM officers WHERE email = $1', [normalizedEmail]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Officer with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const result = await pool.query(
      `INSERT INTO officers (full_name, phone, municipal_area, email, password_hash)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, full_name, phone, municipal_area, email, created_at`,
      [fullName, phone, municipalArea, normalizedEmail, passwordHash]
    );

    const officer = result.rows[0];

    res.status(201).json({
      message: 'Officer created successfully!',
      officer: {
        id: officer.id,
        fullName: officer.full_name,
        phone: officer.phone,
        municipalArea: officer.municipal_area,
        email: officer.email,
        createdAt: officer.created_at,
      },
    });
  } catch (error) {
    console.error('Create officer error:', error);
    res.status(500).json({ error: 'Server error creating officer.' });
  }
});

// ─── List All Officers (Admin only) ──────────────────────────
router.get('/', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, full_name, phone, municipal_area, email, issues_resolved, created_at
       FROM officers ORDER BY created_at DESC`
    );

    const officers = result.rows.map(o => ({
      id: o.id,
      fullName: o.full_name,
      phone: o.phone,
      municipalArea: o.municipal_area,
      email: o.email,
      issuesResolved: o.issues_resolved,
      createdAt: o.created_at,
    }));

    res.json({ officers });
  } catch (error) {
    console.error('List officers error:', error);
    res.status(500).json({ error: 'Server error fetching officers.' });
  }
});

// ─── Officer Stats ───────────────────────────────────────────
router.get('/:id/stats', verifyToken, requireRole('admin', 'officer'), async (req, res) => {
  try {
    const { id } = req.params;

    const officer = await pool.query('SELECT full_name, municipal_area, issues_resolved FROM officers WHERE id = $1', [id]);
    if (officer.rows.length === 0) {
      return res.status(404).json({ error: 'Officer not found.' });
    }

    const pending = await pool.query('SELECT COUNT(*) FROM issues WHERE assigned_to = $1 AND status = $2', [id, 'pending']);
    const inProgress = await pool.query('SELECT COUNT(*) FROM issues WHERE assigned_to = $1 AND status = $2', [id, 'in_progress']);
    const resolved = await pool.query('SELECT COUNT(*) FROM issues WHERE assigned_to = $1 AND status = $2', [id, 'resolved']);

    res.json({
      officer: officer.rows[0],
      stats: {
        pending: parseInt(pending.rows[0].count),
        inProgress: parseInt(inProgress.rows[0].count),
        resolved: parseInt(resolved.rows[0].count),
      },
    });
  } catch (error) {
    console.error('Officer stats error:', error);
    res.status(500).json({ error: 'Server error fetching stats.' });
  }
});

module.exports = router;
