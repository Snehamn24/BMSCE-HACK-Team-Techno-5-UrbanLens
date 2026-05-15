const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../db/connection');
const { generateToken, verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();
const SALT = 10;

// Admin: Register contractor
router.post('/register', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { contractorId, name, phone, password, wardId } = req.body;
    if (!contractorId || !name || !phone || !password) {
      return res.status(400).json({ error: 'Contractor ID, name, phone, and password are required.' });
    }
    const existing = await pool.query('SELECT contractor_id FROM contractors WHERE contractor_id = $1', [contractorId]);
    if (existing.rows.length > 0) return res.status(409).json({ error: 'Contractor ID already exists.' });

    const hash = await bcrypt.hash(password, SALT);
    await pool.query(
      'INSERT INTO contractors (contractor_id, name, phone, password_hash, ward_id) VALUES ($1,$2,$3,$4,$5)',
      [contractorId, name, phone, hash, wardId || null]
    );
    res.status(201).json({ message: 'Contractor registered.', contractorId });
  } catch (e) {
    console.error('Register contractor error:', e);
    res.status(500).json({ error: 'Server error.' });
  }
});

// Contractor login
router.post('/login', async (req, res) => {
  try {
    const { contractorId, password } = req.body;
    if (!contractorId || !password) return res.status(400).json({ error: 'ID and password required.' });

    const result = await pool.query('SELECT * FROM contractors WHERE contractor_id = $1', [contractorId]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid contractor ID.' });

    const c = result.rows[0];
    const valid = await bcrypt.compare(password, c.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid password.' });

    const token = generateToken({ id: c.contractor_id, role: 'contractor', wardId: c.ward_id });
    res.json({
      token,
      user: { id: c.contractor_id, fullName: c.name, phone: c.phone, role: 'contractor', wardId: c.ward_id, rating: parseFloat(c.rating), jobsCompleted: c.jobs_completed }
    });
  } catch (e) {
    console.error('Contractor login error:', e);
    res.status(500).json({ error: 'Server error.' });
  }
});

// List all contractors (admin)
router.get('/', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, w.office_name, w.ward_no, w.area_name
      FROM contractors c LEFT JOIN wards w ON c.ward_id = w.id
      ORDER BY c.created_at DESC
    `);
    res.json({ contractors: result.rows });
  } catch (e) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// List contractors by ward (officer/admin)
router.get('/by-ward/:wardId', verifyToken, requireRole('officer', 'admin'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.contractor_id, c.name, c.phone, c.rating, c.total_ratings, c.jobs_completed,
             w.office_name, w.ward_no, w.area_name
      FROM contractors c LEFT JOIN wards w ON c.ward_id = w.id
      WHERE c.ward_id = $1
      ORDER BY c.rating DESC, c.jobs_completed DESC
    `, [req.params.wardId]);
    res.json({ contractors: result.rows });
  } catch (e) {
    console.error('By-ward contractors error:', e);
    res.status(500).json({ error: 'Server error.' });
  }
});

// Get unresolved issues for bidding (contractor)
router.get('/available-issues', verifyToken, requireRole('contractor'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT i.*, w.office_name as ward_office_name, w.ward_no as ward_number, w.area_name as ward_area
      FROM issues i LEFT JOIN wards w ON i.ward_id = w.id
      WHERE i.status IN ('pending','in_progress') AND i.assigned_contractor IS NULL
      ORDER BY i.upvotes DESC, i.severity DESC, i.reported_at DESC
    `);
    // Also get any existing bids by this contractor
    const bids = await pool.query('SELECT issue_id, amount, status FROM bids WHERE contractor_id = $1', [req.user.id]);
    const bidMap = {};
    bids.rows.forEach(b => { bidMap[b.issue_id] = b; });
    res.json({ issues: result.rows, myBids: bidMap });
  } catch (e) {
    console.error('Available issues error:', e);
    res.status(500).json({ error: 'Server error.' });
  }
});

// Get contractor's assigned issues
router.get('/my-issues', verifyToken, requireRole('contractor'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT i.*, w.office_name as ward_office_name, w.ward_no as ward_number
      FROM issues i LEFT JOIN wards w ON i.ward_id = w.id
      WHERE i.assigned_contractor = $1
      ORDER BY i.reported_at DESC
    `, [req.user.id]);
    res.json({ issues: result.rows });
  } catch (e) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// Submit a bid on an issue (contractor)
router.post('/bid/:issueId', verifyToken, requireRole('contractor'), async (req, res) => {
  try {
    const { amount, note } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Valid amount required.' });

    await pool.query(
      `INSERT INTO bids (issue_id, contractor_id, amount, note) VALUES ($1,$2,$3,$4)
       ON CONFLICT (issue_id, contractor_id) DO UPDATE SET amount=$3, note=$4, status='pending'`,
      [req.params.issueId, req.user.id, amount, note || '']
    );
    res.json({ message: 'Bid submitted.' });
  } catch (e) {
    console.error('Bid error:', e);
    res.status(500).json({ error: 'Server error.' });
  }
});

// Get all bids for an issue (admin/officer)
router.get('/bids/:issueId', verifyToken, requireRole('admin', 'officer'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT b.*, c.name as contractor_name, c.phone, c.rating, c.jobs_completed
      FROM bids b JOIN contractors c ON b.contractor_id = c.contractor_id
      WHERE b.issue_id = $1 ORDER BY b.amount ASC
    `, [req.params.issueId]);
    res.json({ bids: result.rows });
  } catch (e) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// Assign a bid / contractor to an issue (admin OR officer)
router.post('/assign/:issueId', verifyToken, requireRole('admin', 'officer'), async (req, res) => {
  try {
    const { contractorId, amount } = req.body;
    await pool.query('UPDATE issues SET assigned_contractor=$1, budget_amount=$2, status=$3 WHERE id=$4',
      [contractorId, amount, 'in_progress', req.params.issueId]);
    await pool.query("UPDATE bids SET status='accepted' WHERE issue_id=$1 AND contractor_id=$2",
      [req.params.issueId, contractorId]);
    await pool.query("UPDATE bids SET status='rejected' WHERE issue_id=$1 AND contractor_id!=$2",
      [req.params.issueId, contractorId]);
    res.json({ message: 'Contractor assigned.' });
  } catch (e) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// Mark issue complete (admin or officer)
router.patch('/complete/:issueId', verifyToken, requireRole('admin', 'officer'), async (req, res) => {
  try {
    await pool.query("UPDATE issues SET status='resolved', resolved_at=NOW() WHERE id=$1", [req.params.issueId]);
    const issue = await pool.query('SELECT assigned_contractor FROM issues WHERE id=$1', [req.params.issueId]);
    if (issue.rows[0]?.assigned_contractor) {
      await pool.query('UPDATE contractors SET jobs_completed = jobs_completed + 1 WHERE contractor_id=$1',
        [issue.rows[0].assigned_contractor]);
    }
    res.json({ message: 'Issue marked resolved.' });
  } catch (e) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// Rate contractor (citizen feedback)
router.patch('/rate/:issueId', verifyToken, async (req, res) => {
  try {
    const { rating } = req.body;
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating 1-5 required.' });

    // Ensure column exists
    try { await pool.query('ALTER TABLE issues ADD COLUMN IF NOT EXISTS contractor_feedback_rating INTEGER'); } catch(e) {}

    await pool.query('UPDATE issues SET contractor_feedback_rating=$1 WHERE id=$2', [rating, req.params.issueId]);
    const issue = await pool.query('SELECT assigned_contractor FROM issues WHERE id=$1', [req.params.issueId]);
    if (issue.rows[0]?.assigned_contractor) {
      const cid = issue.rows[0].assigned_contractor;
      await pool.query(`UPDATE contractors SET rating = (rating * total_ratings + $1) / (total_ratings + 1), total_ratings = total_ratings + 1 WHERE contractor_id = $2`, [rating, cid]);
    }
    res.json({ message: 'Contractor rated.' });
  } catch (e) {
    console.error('Rate contractor error:', e);
    res.status(500).json({ error: 'Server error.' });
  }
});

// Delete contractor (admin)
router.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM contractors WHERE contractor_id=$1', [req.params.id]);
    res.json({ message: 'Contractor deleted.' });
  } catch (e) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
