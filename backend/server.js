const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadsDir));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/officers', require('./routes/officers'));
app.use('/api/issues', require('./routes/issues'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/wards', require('./routes/wards'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'UrbanLens API is running 🚀', timestamp: new Date().toISOString() });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`\n🚀 UrbanLens Backend running on http://localhost:${PORT}`);
  console.log(`📡 API Health: http://localhost:${PORT}/api/health\n`);
});
