const fs = require('fs');
const path = require('path');
const pool = require('./connection');

async function initDatabase() {
  try {
    const sql = fs.readFileSync(path.join(__dirname, 'init.sql'), 'utf8');
    await pool.query(sql);
    console.log('✅ Database tables created successfully');
  } catch (error) {
    console.error('❌ Error initializing database:', error.message);
    // If PostGIS is not installed, try without it
    if (error.message.includes('postgis')) {
      console.log('⚠️  PostGIS extension not found. Trying without spatial features...');
      try {
        const sql = fs.readFileSync(path.join(__dirname, 'init.sql'), 'utf8');
        // Remove PostGIS-specific lines
        const fallbackSql = sql
          .replace(/CREATE EXTENSION IF NOT EXISTS postgis;/g, '-- PostGIS not available')
          .replace(/location GEOMETRY\(Point, 4326\),/g, '-- location GEOMETRY(Point, 4326),')
          .replace(/CREATE INDEX IF NOT EXISTS idx_issues_location ON issues USING GIST\(location\);/g, '-- Spatial index skipped');
        await pool.query(fallbackSql);
        console.log('✅ Database tables created (without PostGIS spatial features)');
      } catch (fallbackError) {
        console.error('❌ Fallback init also failed:', fallbackError.message);
      }
    }
  } finally {
    await pool.end();
  }
}

initDatabase();
