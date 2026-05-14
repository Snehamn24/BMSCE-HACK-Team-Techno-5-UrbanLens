const express = require('express');
const pool = require('../db/connection');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Overview stats (Admin)
router.get('/overview', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const total = await pool.query('SELECT COUNT(*) FROM issues');
    const resolved = await pool.query("SELECT COUNT(*) FROM issues WHERE status = 'resolved'");
    const pending = await pool.query("SELECT COUNT(*) FROM issues WHERE status = 'pending'");
    const inProgress = await pool.query("SELECT COUNT(*) FROM issues WHERE status = 'in_progress'");
    const officers = await pool.query('SELECT COUNT(*) FROM officers WHERE is_registered = TRUE');
    const citizens = await pool.query('SELECT COUNT(*) FROM users');

    const totalCount = parseInt(total.rows[0].count);
    const resolvedCount = parseInt(resolved.rows[0].count);
    const rate = totalCount > 0 ? Math.round((resolvedCount / totalCount) * 100) : 0;

    res.json({
      totalReports: totalCount,
      resolved: resolvedCount,
      pending: parseInt(pending.rows[0].count),
      inProgress: parseInt(inProgress.rows[0].count),
      resolutionRate: rate,
      activeOfficers: parseInt(officers.rows[0].count),
      totalCitizens: parseInt(citizens.rows[0].count),
    });
  } catch (error) {
    console.error('Analytics overview error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

// Issue breakdown by category (Admin)
router.get('/by-category', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT type, COUNT(*) as count, 
              SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved
       FROM issues GROUP BY type ORDER BY count DESC`
    );
    res.json({ categories: result.rows });
  } catch (error) {
    console.error('By category error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

// Leaderboard (top citizens by points)
router.get('/leaderboard', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, full_name, username, points, badge FROM users 
       ORDER BY points DESC LIMIT 20`
    );
    res.json({ leaderboard: result.rows });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
