const pool = require('./db/connection');

async function migrate() {
  try {
    console.log('Migrating database schema...');
    
    // Add address to users
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;`);
    console.log('✅ Added address column to users table');
    
    // Recreate officers table since we changed the schema completely (access_code -> email)
    await pool.query(`DROP TABLE IF EXISTS officers CASCADE;`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS officers (
        id SERIAL PRIMARY KEY,
        full_name VARCHAR(100) NOT NULL,
        phone VARCHAR(15) NOT NULL,
        municipal_area VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        issues_resolved INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Recreated officers table with email and password fields');
    
    console.log('Migration complete!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    pool.end();
  }
}

migrate();
