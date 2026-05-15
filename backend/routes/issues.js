const express = require('express');
const multer = require('multer');
const path = require('path');
const pool = require('../db/connection');
const { verifyToken, requireRole } = require('../middleware/auth');
const { analyzeImage } = require('../ai/analyzeImage');

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
    const { type, severity, description, latitude, longitude, wardId } = req.body;
    const userId = req.user.id;
    if (!type || !latitude || !longitude) {
      return res.status(400).json({ error: 'Issue type, latitude, and longitude are required.' });
    }
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    let aiType = type;
    let aiSeverity = severity || 'medium';
    let aiConfidence = null;
    let aiDescription = '';
    let aiPowered = false;

    // AI Image Analysis
    if (req.file) {
      try {
        const imgPath = path.join(__dirname, '..', 'uploads', req.file.filename);
        const aiResult = await analyzeImage(imgPath);
        console.log('🤖 AI Analysis:', aiResult);
        
        if (aiResult.type && aiResult.type !== 'unknown') {
          aiType = aiResult.type;
        }
        if (aiResult.severity) {
          aiSeverity = aiResult.severity;
        }
        aiConfidence = aiResult.confidence;
        aiDescription = aiResult.description || '';
        aiPowered = aiResult.ai_powered || false;
      } catch (err) {
        console.log('⚠️ AI analysis fallback:', err.message);
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
        return res.json({
          message: `Similar ${aiType} nearby — merged! +5 pts`,
          duplicate: true,
          existingIssueId: existing.id,
          pointsEarned: 5,
          aiAnalysis: { type: aiType, severity: aiSeverity, confidence: aiConfidence, description: aiDescription, ai_powered: aiPowered }
        });
      }
    } catch (e) { console.log('PostGIS dedup skipped:', e.message); }

    // Create new issue
    const parsedWardId = wardId ? parseInt(wardId) : null;
    let result;
    try {
      // Try with PostGIS location column + AI columns
      try {
        await pool.query('ALTER TABLE issues ADD COLUMN IF NOT EXISTS ai_confidence DECIMAL(3,2)');
        await pool.query('ALTER TABLE issues ADD COLUMN IF NOT EXISTS ai_detected_type VARCHAR(50)');
        await pool.query('ALTER TABLE issues ADD COLUMN IF NOT EXISTS ai_description TEXT');
      } catch(e) {}

      result = await pool.query(
        `INSERT INTO issues (type, severity, description, latitude, longitude, location, image_url, reported_by, ward_id, ai_confidence, ai_detected_type, ai_description)
         VALUES ($1,$2,$3,$4,$5, ST_SetSRID(ST_MakePoint($6,$7),4326), $8,$9,$10,$11,$12,$13) RETURNING *`,
        [aiType, aiSeverity, description||'', lat, lng, lng, lat, imageUrl, userId, parsedWardId, aiConfidence, aiType, aiDescription]);
    } catch (e) {
      result = await pool.query(
        `INSERT INTO issues (type, severity, description, latitude, longitude, image_url, reported_by, ward_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [aiType, aiSeverity, description||'', lat, lng, imageUrl, userId, parsedWardId]);
    }

    await pool.query('UPDATE users SET points = points + 10 WHERE id = $1', [userId]);
    await pool.query('INSERT INTO points_log (user_id, points, reason) VALUES ($1, 10, $2)',
      [userId, `Reported ${type} #${result.rows[0].id}`]);
    const pts = await pool.query('SELECT points FROM users WHERE id = $1', [userId]);
    const totalPoints = pts.rows[0].points;
    const badge = totalPoints >= 200 ? 'gold' : totalPoints >= 50 ? 'silver' : 'bronze';
    await pool.query('UPDATE users SET badge = $1 WHERE id = $2', [badge, userId]);

    res.status(201).json({
      message: `Reported! +10 pts`,
      issue: result.rows[0],
      pointsEarned: 10,
      totalPoints,
      badge,
      aiAnalysis: { type: aiType, severity: aiSeverity, confidence: aiConfidence, description: aiDescription, ai_powered: aiPowered }
    });
  } catch (error) {
    console.error('Report issue error:', error);
    res.status(500).json({ error: 'Server error reporting issue.' });
  }
});

// Get Issues (filtered)
router.get('/', verifyToken, async (req, res) => {
  try {
    const { status, type, assignedTo, reportedBy, wardId } = req.query;
    let query = `SELECT i.*, u.full_name as reporter_name, o.full_name as officer_name,
                        w.office_name as ward_office_name, w.ward_no as ward_number, w.area_name as ward_area
                 FROM issues i LEFT JOIN users u ON i.reported_by = u.id 
                 LEFT JOIN officers o ON i.assigned_to = o.id
                 LEFT JOIN wards w ON i.ward_id = w.id WHERE 1=1`;
    const params = [];
    let n = 0;
    if (status) { n++; query += ` AND i.status = $${n}`; params.push(status); }
    if (type) { n++; query += ` AND i.type = $${n}`; params.push(type); }
    if (assignedTo) { n++; query += ` AND i.assigned_to = $${n}`; params.push(assignedTo); }
    if (reportedBy) { n++; query += ` AND i.reported_by = $${n}`; params.push(reportedBy); }
    if (wardId) { n++; query += ` AND i.ward_id = $${n}`; params.push(wardId); }
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

// Submit Feedback (Citizen)
router.patch('/:id/feedback', verifyToken, requireRole('citizen'), async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, text } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5.' });
    }

    // Ensure feedback columns exist (safe migration)
    try {
      await pool.query('ALTER TABLE issues ADD COLUMN IF NOT EXISTS feedback_rating INTEGER');
      await pool.query('ALTER TABLE issues ADD COLUMN IF NOT EXISTS feedback_text TEXT');
    } catch (e) { /* columns already exist */ }

    const result = await pool.query(
      'UPDATE issues SET feedback_rating = $1, feedback_text = $2 WHERE id = $3 AND reported_by = $4 RETURNING *',
      [rating, text || '', id, req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Issue not found or not yours.' });

    // Bonus points for providing feedback
    await pool.query('UPDATE users SET points = points + 5 WHERE id = $1', [req.user.id]);
    await pool.query('INSERT INTO points_log (user_id, points, reason) VALUES ($1, 5, $2)',
      [req.user.id, `Feedback on Issue #${id}`]);

    res.json({ message: 'Feedback submitted! +5 pts', issue: result.rows[0] });
  } catch (error) {
    console.error('Feedback error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
