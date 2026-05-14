const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'postgres',
});

async function test() {
  try {
    await pool.query('SELECT 1');
    console.log('Success!');
  } catch (err) {
    console.error('Full Error:', err);
  } finally {
    await pool.end();
  }
}
test();
