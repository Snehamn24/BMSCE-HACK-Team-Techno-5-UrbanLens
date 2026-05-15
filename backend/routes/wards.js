const express = require('express');
const pool = require('../db/connection');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// ─── Ensure wards table exists (safe migration) ─────────────
const ensureWardsTable = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS wards (
        id SERIAL PRIMARY KEY,
        office_name VARCHAR(150) NOT NULL,
        ward_no VARCHAR(30) NOT NULL,
        area_name VARCHAR(150) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(office_name, ward_no)
      )
    `);
  } catch (e) { /* table already exists */ }
};
ensureWardsTable();

// ─── Create Ward (Admin only) ────────────────────────────────
router.post('/', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { officeName, wardNo, areaName } = req.body;
    if (!officeName || !wardNo || !areaName) {
      return res.status(400).json({ error: 'Office name, ward number, and area name are required.' });
    }

    // Check for duplicate
    const existing = await pool.query(
      'SELECT id FROM wards WHERE office_name = $1 AND ward_no = $2',
      [officeName.trim(), wardNo.trim()]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'This ward already exists.' });
    }

    const result = await pool.query(
      `INSERT INTO wards (office_name, ward_no, area_name) VALUES ($1, $2, $3) RETURNING *`,
      [officeName.trim(), wardNo.trim(), areaName.trim()]
    );

    res.status(201).json({ message: 'Ward created successfully!', ward: result.rows[0] });
  } catch (error) {
    console.error('Create ward error:', error);
    res.status(500).json({ error: 'Server error creating ward.' });
  }
});

// ─── List All Wards (Public - visible to citizens) ──────────
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM wards ORDER BY office_name, ward_no');
    res.json({ wards: result.rows });
  } catch (error) {
    console.error('List wards error:', error);
    res.status(500).json({ error: 'Server error fetching wards.' });
  }
});

// ─── Delete Ward (Admin only) ────────────────────────────────
router.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM wards WHERE id = $1 RETURNING *', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Ward not found.' });
    res.json({ message: 'Ward deleted.', ward: result.rows[0] });
  } catch (error) {
    console.error('Delete ward error:', error);
    res.status(500).json({ error: 'Server error deleting ward.' });
  }
});

module.exports = router;
