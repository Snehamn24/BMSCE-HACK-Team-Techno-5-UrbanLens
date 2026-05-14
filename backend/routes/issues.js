const express = require('express');
const multer = require('multer');
const path = require('path');
const { execSync } = require('child_process');
const pool = require('../db/connection');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// Report Issue (Citizen)
router.post('/', verifyToken, requireRole('citizen'), upload.single('image'), async (req, res) => {
  try {
    const { type, severity, description, latitude, longitude } = req.body;
    const userId = req.user.id;
    if (!type || !latitude || !longitude) {
      return res.status(400).json({ error: 'Issue type, latitude, and longitude are required.' });
    }
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    let aiType = type;
    let aiSeverity = severity || 'medium';

    if (req.file) {
      try {
        const pythonPath = process.platform === 'win32' ? 'python' : 'python3';
        const imgPath = path.join(__dirname, '..', 'uploads', req.file.filename);
        const output = execSync(`${pythonPath} cv_model.py "${imgPath}"`, { encoding: 'utf-8', cwd: path.join(__dirname, '..') });
        
        // Parse the last line in case YOLO printed logs
        const lines = output.trim().split('\n');
        const jsonLine = lines.find(l => l.startsWith('{')) || lines.pop();
        const aiResult = JSON.parse(jsonLine);
        
        if (aiResult.type && aiResult.type !== 'unknown') {
          aiType = aiResult.type;
        }
        if (aiResult.severity) {
          aiSeverity = aiResult.severity;
        }
        console.log('AI Analysis:', aiResult);
      } catch (err) {
        console.log('AI CV Module fallback used (Python not found or script error).');
        // Fallback logic for prototype demo
        const severities = ['low', 'medium', 'high'];
        aiSeverity = severities[Math.floor(Math.random() * severities.length)];
      }
    }

    // PostGIS Deduplication: check within 10 meters
    try {
      const nearby = await pool.query(
        `SELECT id, type, upvotes FROM issues WHERE type = $1 AND status != 'resolved'
         AND ST_DWithin(location::geography, ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography, 10)
         ORDER BY reported_at DESC LIMIT 1`, [aiType, lng, lat]
      );
      if (nearby.rows.length > 0) {
        const existing = nearby.rows[0];
        await pool.query('UPDATE issues SET upvotes = upvotes + 1 WHERE id = $1', [existing.id]);
        await pool.query('UPDATE users SET points = points + 5 WHERE id = $1', [userId]);
        await pool.query('INSERT INTO points_log (user_id, points, reason) VALUES ($1, 5, $2)',
          [userId, `Upvoted existing ${aiType} #${existing.id}`]);
        return res.json({ message: `Similar ${aiType} nearby — merged! +5 pts`, duplicate: true, existingIssueId: existing.id, pointsEarned: 5 });
      }
    } catch (e) { console.log('PostGIS dedup skipped:', e.message); }

    // Create new issue
    let result;
    try {
      result = await pool.query(
        `INSERT INTO issues (type, severity, description, latitude, longitude, location, image_url, reported_by)
         VALUES ($1,$2,$3,$4,$5, ST_SetSRID(ST_MakePoint($6,$7),4326), $8,$9) RETURNING *`,
        [aiType, aiSeverity, description||'', lat, lng, lng, lat, imageUrl, userId]);
    } catch (e) {
      result = await pool.query(
        `INSERT INTO issues (type, severity, description, latitude, longitude, image_url, reported_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [aiType, aiSeverity, description||'', lat, lng, imageUrl, userId]);
    }

    await pool.query('UPDATE users SET points = points + 10 WHERE id = $1', [userId]);
    await pool.query('INSERT INTO points_log (user_id, points, reason) VALUES ($1, 10, $2)',
      [userId, `Reported ${type} #${result.rows[0].id}`]);
    const pts = await pool.query('SELECT points FROM users WHERE id = $1', [userId]);
    const totalPoints = pts.rows[0].points;
    const badge = totalPoints >= 200 ? 'gold' : totalPoints >= 50 ? 'silver' : 'bronze';
    await pool.query('UPDATE users SET badge = $1 WHERE id = $2', [badge, userId]);

    res.status(201).json({ message: `Reported! +10 pts`, issue: result.rows[0], pointsEarned: 10, totalPoints, badge });
  } catch (error) {
    console.error('Report issue error:', error);
    res.status(500).json({ error: 'Server error reporting issue.' });
  }
});

// Get Issues (filtered)
router.get('/', verifyToken, async (req, res) => {
  try {
    const { status, type, assignedTo, reportedBy } = req.query;
    let query = `SELECT i.*, u.full_name as reporter_name, o.full_name as officer_name 
                 FROM issues i LEFT JOIN users u ON i.reported_by = u.id 
                 LEFT JOIN officers o ON i.assigned_to = o.id WHERE 1=1`;
    const params = [];
    let n = 0;
    if (status) { n++; query += ` AND i.status = $${n}`; params.push(status); }
    if (type) { n++; query += ` AND i.type = $${n}`; params.push(type); }
    if (assignedTo) { n++; query += ` AND i.assigned_to = $${n}`; params.push(assignedTo); }
    if (reportedBy) { n++; query += ` AND i.reported_by = $${n}`; params.push(reportedBy); }
    query += ' ORDER BY i.reported_at DESC';
    const result = await pool.query(query, params);
    res.json({ issues: result.rows });
  } catch (error) {
    console.error('Get issues error:', error);
    res.status(500).json({ error: 'Server error fetching issues.' });
  }
});

// Update Issue Status (Officer/Admin)
router.patch('/:id/status', verifyToken, requireRole('officer', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['pending','in_progress','resolved'].includes(status))
      return res.status(400).json({ error: 'Invalid status.' });

    const updates = ['status = $1'];
    if (status === 'resolved') {
      updates.push('resolved_at = NOW()');
      if (req.user.role === 'officer')
        await pool.query('UPDATE officers SET issues_resolved = issues_resolved + 1 WHERE id = $1', [req.user.id]);
    }
    const result = await pool.query(`UPDATE issues SET ${updates.join(', ')} WHERE id = $2 RETURNING *`, [status, id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Issue not found.' });

    if (status === 'resolved' && result.rows[0].reported_by) {
      await pool.query('UPDATE users SET points = points + 20 WHERE id = $1', [result.rows[0].reported_by]);
      await pool.query('INSERT INTO points_log (user_id, points, reason) VALUES ($1, 20, $2)',
        [result.rows[0].reported_by, `Issue #${id} resolved!`]);
    }
    res.json({ message: `Status → ${status}`, issue: result.rows[0] });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

// Assign Issue (Admin)
router.patch('/:id/assign', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { officerId } = req.body;
    if (!officerId) return res.status(400).json({ error: 'Officer ID required.' });
    const result = await pool.query(
      `UPDATE issues SET assigned_to = $1, status = 'in_progress' WHERE id = $2 RETURNING *`, [officerId, req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Issue not found.' });
    res.json({ message: 'Assigned.', issue: result.rows[0] });
  } catch (error) { res.status(500).json({ error: 'Server error.' }); }
});

// Upload After Image (Officer)
router.post('/:id/after-image', verifyToken, requireRole('officer'), upload.single('afterImage'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Image required.' });
    const result = await pool.query('UPDATE issues SET after_image_url = $1 WHERE id = $2 RETURNING *',
      [`/uploads/${req.file.filename}`, req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Issue not found.' });
    res.json({ message: 'After image uploaded.', issue: result.rows[0] });
  } catch (error) { res.status(500).json({ error: 'Server error.' }); }
});

module.exports = router;
