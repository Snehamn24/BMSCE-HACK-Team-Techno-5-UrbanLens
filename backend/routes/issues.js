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

// ─── Report Issue (Citizen) ─────────────────────────────────
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

    // PostGIS Deduplication: check within 10 meters for same type
    // Also check if the SAME USER reported the same issue type nearby
    try {
      // First check same user + same type + within 50m (same person reporting again)
      const sameUserNearby = await pool.query(
        `SELECT id, type, upvotes FROM issues WHERE type = $1 AND status != 'resolved'
         AND reported_by = $4
         AND ST_DWithin(location::geography, ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography, 50)
         ORDER BY reported_at DESC LIMIT 1`, [aiType, lng, lat, userId]
      );
      if (sameUserNearby.rows.length > 0) {
        const existing = sameUserNearby.rows[0];
        await pool.query('UPDATE issues SET upvotes = upvotes + 1 WHERE id = $1', [existing.id]);
        // Update severity based on upvote count (more reports = higher priority)
        const updatedIssue = await pool.query('SELECT upvotes FROM issues WHERE id = $1', [existing.id]);
        const newUpvotes = updatedIssue.rows[0].upvotes;
        let newSeverity = 'low';
        if (newUpvotes >= 5) newSeverity = 'high';
        else if (newUpvotes >= 3) newSeverity = 'medium';
        await pool.query('UPDATE issues SET severity = $1 WHERE id = $2', [newSeverity, existing.id]);

        await pool.query('UPDATE users SET points = points + 5 WHERE id = $1', [userId]);
        await pool.query('INSERT INTO points_log (user_id, points, reason) VALUES ($1, 5, $2)',
          [userId, `Re-reported ${aiType} #${existing.id} — priority increased`]);
        return res.json({
          message: `Same issue re-reported — priority increased! Count: ${newUpvotes}. +5 pts`,
          duplicate: true,
          existingIssueId: existing.id,
          reportCount: newUpvotes,
          pointsEarned: 5,
          aiAnalysis: { type: aiType, severity: newSeverity, confidence: aiConfidence, description: aiDescription, ai_powered: aiPowered }
        });
      }

      // Then check any user + same type + within 10m (general dedup)
      const nearby = await pool.query(
        `SELECT id, type, upvotes FROM issues WHERE type = $1 AND status != 'resolved'
         AND ST_DWithin(location::geography, ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography, 10)
         ORDER BY reported_at DESC LIMIT 1`, [aiType, lng, lat]
      );
      if (nearby.rows.length > 0) {
        const existing = nearby.rows[0];
        await pool.query('UPDATE issues SET upvotes = upvotes + 1 WHERE id = $1', [existing.id]);
        const updatedIssue = await pool.query('SELECT upvotes FROM issues WHERE id = $1', [existing.id]);
        const newUpvotes = updatedIssue.rows[0].upvotes;
        let newSeverity = 'low';
        if (newUpvotes >= 5) newSeverity = 'high';
        else if (newUpvotes >= 3) newSeverity = 'medium';
        await pool.query('UPDATE issues SET severity = $1 WHERE id = $2', [newSeverity, existing.id]);

        await pool.query('UPDATE users SET points = points + 5 WHERE id = $1', [userId]);
        await pool.query('INSERT INTO points_log (user_id, points, reason) VALUES ($1, 5, $2)',
          [userId, `Upvoted existing ${aiType} #${existing.id}`]);
        return res.json({
          message: `Similar ${aiType} nearby — merged! Count: ${newUpvotes}. +5 pts`,
          duplicate: true,
          existingIssueId: existing.id,
          reportCount: newUpvotes,
          pointsEarned: 5,
          aiAnalysis: { type: aiType, severity: newSeverity, confidence: aiConfidence, description: aiDescription, ai_powered: aiPowered }
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

// ─── Get Issues for Officer (ward-scoped, priority-ordered) ──
router.get('/officer', verifyToken, requireRole('officer'), async (req, res) => {
  try {
    const wardId = req.user.wardId;
    let query, params;

    if (wardId) {
      query = `SELECT i.*, u.full_name as reporter_name, o.full_name as officer_name,
                      w.office_name as ward_office_name, w.ward_no as ward_number, w.area_name as ward_area,
                      i.assigned_contractor, i.contractor_feedback_rating
               FROM issues i LEFT JOIN users u ON i.reported_by = u.id
               LEFT JOIN officers o ON i.assigned_to = o.id
               LEFT JOIN wards w ON i.ward_id = w.id
               WHERE i.ward_id = $1
               ORDER BY i.upvotes DESC, 
                        CASE i.severity WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
                        i.reported_at DESC`;
      params = [wardId];
    } else {
      // Officer without ward assignment sees all unassigned issues
      query = `SELECT i.*, u.full_name as reporter_name, o.full_name as officer_name,
                      w.office_name as ward_office_name, w.ward_no as ward_number, w.area_name as ward_area,
                      i.assigned_contractor, i.contractor_feedback_rating
               FROM issues i LEFT JOIN users u ON i.reported_by = u.id
               LEFT JOIN officers o ON i.assigned_to = o.id
               LEFT JOIN wards w ON i.ward_id = w.id
               ORDER BY i.upvotes DESC,
                        CASE i.severity WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
                        i.reported_at DESC`;
      params = [];
    }

    const result = await pool.query(query, params);
    res.json({ issues: result.rows });
  } catch (error) {
    console.error('Officer issues error:', error);
    res.status(500).json({ error: 'Server error fetching officer issues.' });
  }
});

// ─── Get Issues (filtered) ──────────────────────────────────
router.get('/', verifyToken, async (req, res) => {
  try {
    const { status, type, assignedTo, reportedBy, wardId } = req.query;
    let query = `SELECT i.*, u.full_name as reporter_name, o.full_name as officer_name,
                        w.office_name as ward_office_name, w.ward_no as ward_number, w.area_name as ward_area,
                        i.assigned_contractor, i.contractor_feedback_rating
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
    query += ' ORDER BY i.upvotes DESC, i.reported_at DESC';
    const result = await pool.query(query, params);
    res.json({ issues: result.rows });
  } catch (error) {
    console.error('Get issues error:', error);
    res.status(500).json({ error: 'Server error fetching issues.' });
  }
});

// ─── Update Issue Status (Officer/Admin) ────────────────────
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

// ─── Assign Issue to Officer (Admin/Officer) ────────────────
router.patch('/:id/assign', verifyToken, requireRole('admin', 'officer'), async (req, res) => {
  try {
    const { officerId } = req.body;
    if (!officerId) return res.status(400).json({ error: 'Officer ID required.' });
    const result = await pool.query(
      `UPDATE issues SET assigned_to = $1, status = 'in_progress' WHERE id = $2 RETURNING *`, [officerId, req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Issue not found.' });
    res.json({ message: 'Assigned.', issue: result.rows[0] });
  } catch (error) { res.status(500).json({ error: 'Server error.' }); }
});

// ─── Upload After Image (Officer) — with 100m location validation ─
router.post('/:id/after-image', verifyToken, requireRole('officer'), upload.single('afterImage'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Image required.' });

    const { latitude, longitude } = req.body;

    // If location is provided, validate it's within 100 meters of the original issue
    if (latitude && longitude) {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);

      const issue = await pool.query('SELECT latitude, longitude FROM issues WHERE id = $1', [req.params.id]);
      if (issue.rows.length === 0) return res.status(404).json({ error: 'Issue not found.' });

      const origLat = issue.rows[0].latitude;
      const origLng = issue.rows[0].longitude;

      if (origLat && origLng) {
        // Calculate distance using Haversine formula (in meters)
        const R = 6371000; // Earth's radius in meters
        const dLat = (lat - origLat) * Math.PI / 180;
        const dLng = (lng - origLng) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(origLat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
                  Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        if (distance > 100) {
          return res.status(400).json({
            error: `After-image location is ${Math.round(distance)}m from the original issue. Must be within 100m.`,
            distance: Math.round(distance),
            maxDistance: 100
          });
        }
      }
    }

    const result = await pool.query('UPDATE issues SET after_image_url = $1 WHERE id = $2 RETURNING *',
      [`/uploads/${req.file.filename}`, req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Issue not found.' });
    res.json({ message: 'After image uploaded successfully.', issue: result.rows[0] });
  } catch (error) {
    console.error('After image upload error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─── Submit Feedback (Citizen) ──────────────────────────────
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
