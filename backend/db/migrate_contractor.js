const pool = require('./connection');

async function migrate() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS contractors (
        contractor_id VARCHAR(20) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(15) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        ward_id INTEGER REFERENCES wards(id) ON DELETE SET NULL,
        rating NUMERIC(3,2) DEFAULT 0,
        total_ratings INTEGER DEFAULT 0,
        jobs_completed INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('contractors table OK');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS bids (
        id SERIAL PRIMARY KEY,
        issue_id INTEGER REFERENCES issues(id) ON DELETE CASCADE,
        contractor_id VARCHAR(20) REFERENCES contractors(contractor_id) ON DELETE CASCADE,
        amount NUMERIC(12,2) NOT NULL,
        note TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(issue_id, contractor_id)
      )
    `);
    console.log('bids table OK');

    await pool.query(`ALTER TABLE issues ADD COLUMN IF NOT EXISTS assigned_contractor VARCHAR(20)`);
    await pool.query(`ALTER TABLE issues ADD COLUMN IF NOT EXISTS budget_amount NUMERIC(12,2)`);
    await pool.query(`ALTER TABLE issues ADD COLUMN IF NOT EXISTS contractor_feedback_rating INTEGER`);
    console.log('issues columns OK');

    process.exit(0);
  } catch (e) {
    console.error('Migration failed:', e.message);
    process.exit(1);
  }
}

migrate();
