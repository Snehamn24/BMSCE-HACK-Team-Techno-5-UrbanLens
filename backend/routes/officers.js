const express = require('express');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db/connection');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();
const SALT_ROUNDS = 10;

// ─── Create Officer handler (shared by /create and /register) ─
const createOfficerHandler = async (req, res) => {
  try {
    const { fullName, phone, municipalArea, email, password, wardId } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    // Phone is optional — default to '0000000000' if not provided
    const officerPhone = phone || '0000000000';

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

    // Ensure ward_id column exists
    try { await pool.query('ALTER TABLE officers ADD COLUMN IF NOT EXISTS ward_id INTEGER REFERENCES wards(id) ON DELETE SET NULL'); } catch (e) {}

    // Derive municipalArea from ward if not provided
    let finalMunicipalArea = municipalArea || '';
    const parsedWardId = wardId ? parseInt(wardId) : null;
    if (!finalMunicipalArea && parsedWardId) {
      try {
        const wardResult = await pool.query('SELECT office_name, area_name FROM wards WHERE id = $1', [parsedWardId]);
        if (wardResult.rows.length > 0) {
          finalMunicipalArea = `${wardResult.rows[0].area_name} (${wardResult.rows[0].office_name})`;
        }
      } catch (e) {}
    }
    if (!finalMunicipalArea) finalMunicipalArea = 'Unassigned';

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const result = await pool.query(
      `INSERT INTO officers (full_name, phone, municipal_area, email, password_hash, ward_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, full_name, phone, municipal_area, email, ward_id, created_at`,
      [fullName, officerPhone, finalMunicipalArea, normalizedEmail, passwordHash, parsedWardId]
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
        wardId: officer.ward_id,
        createdAt: officer.created_at,
      },
    });
  } catch (error) {
    console.error('Create officer error:', error);
    res.status(500).json({ error: 'Server error creating officer.' });
  }
};

// Both /create and /register point to the same handler
router.post('/create', verifyToken, requireRole('admin'), createOfficerHandler);
router.post('/register', verifyToken, requireRole('admin'), createOfficerHandler);

// ─── List All Officers (Admin only) ──────────────────────────
router.get('/', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT o.id, o.full_name, o.phone, o.municipal_area, o.email, o.issues_resolved, o.ward_id, o.created_at,
              w.office_name as ward_office_name, w.ward_no as ward_number, w.area_name as ward_area
       FROM officers o LEFT JOIN wards w ON o.ward_id = w.id
       ORDER BY o.created_at DESC`
    );

    const officers = result.rows.map(o => ({
      id: o.id,
      fullName: o.full_name,
      phone: o.phone,
      municipalArea: o.municipal_area,
      email: o.email,
      issuesResolved: o.issues_resolved,
      wardId: o.ward_id,
      wardOfficeName: o.ward_office_name,
      wardNumber: o.ward_number,
      wardArea: o.ward_area,
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
