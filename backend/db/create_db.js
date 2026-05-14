const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

async function createDatabase() {
  // Connect to the default 'postgres' database to create a new database
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: 'postgres', // connect to default db
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  });

  const targetDbName = process.env.DB_NAME || 'urbanlens';

  try {
    const res = await pool.query(`SELECT datname FROM pg_database WHERE datname = $1`, [targetDbName]);
    
    if (res.rowCount === 0) {
      console.log(`Database "${targetDbName}" does not exist. Creating...`);
      await pool.query(`CREATE DATABASE "${targetDbName}"`);
      console.log(`✅ Database "${targetDbName}" created successfully.`);
    } else {
      console.log(`✅ Database "${targetDbName}" already exists.`);
    }
  } catch (err) {
    console.error('❌ Error checking/creating database:', err);
  } finally {
    await pool.end();
  }
}

createDatabase();
