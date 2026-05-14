const pool = require('./connection');
const bcrypt = require('bcrypt');

async function seed() {
  try {
    const saltRounds = 10;

    // Seed default admin
    const adminPasswordHash = await bcrypt.hash('admin123', saltRounds);
    await pool.query(
      `INSERT INTO admins (username, password_hash, full_name) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (username) DO NOTHING`,
      ['admin', adminPasswordHash, 'System Administrator']
    );
    console.log('✅ Admin seeded: username=admin, password=admin123');

    // Seed a demo citizen
    const citizenPasswordHash = await bcrypt.hash('citizen123', saltRounds);
    await pool.query(
      `INSERT INTO users (full_name, username, phone, password_hash, role, points) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       ON CONFLICT (username) DO NOTHING`,
      ['Demo Citizen', 'citizen', '9876543210', citizenPasswordHash, 'citizen', 25]
    );
    console.log('✅ Demo citizen seeded: username=citizen, password=citizen123');

    // Seed a demo officer
    const officerPasswordHash = await bcrypt.hash('officer123', saltRounds);
    await pool.query(
      `INSERT INTO officers (full_name, phone, municipal_area, access_code, password_hash, is_registered) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       ON CONFLICT (access_code) DO NOTHING`,
      ['Demo Officer', '9876543211', 'Koramangala Ward', 'OFF-DEMO-001', officerPasswordHash, true]
    );
    console.log('✅ Demo officer seeded: access_code=OFF-DEMO-001, password=officer123');

    // Seed some demo issues
    const citizenResult = await pool.query(`SELECT id FROM users WHERE username = 'citizen' LIMIT 1`);
    if (citizenResult.rows.length > 0) {
      const citizenId = citizenResult.rows[0].id;
      
      const issues = [
        { type: 'pothole', severity: 'high', desc: 'Large pothole on MG Road near Metro station', lat: 12.9716, lng: 77.5946, status: 'pending' },
        { type: 'garbage', severity: 'medium', desc: 'Garbage dump near residential area in Jayanagar', lat: 12.9250, lng: 77.5938, status: 'in_progress' },
        { type: 'streetlight', severity: 'low', desc: 'Broken streetlight on 100ft Road', lat: 12.9352, lng: 77.6245, status: 'resolved' },
        { type: 'pothole', severity: 'critical', desc: 'Deep pothole causing accidents on Outer Ring Road', lat: 12.9568, lng: 77.7011, status: 'pending' },
        { type: 'drainage', severity: 'high', desc: 'Blocked drain flooding the street in BTM Layout', lat: 12.9166, lng: 77.6101, status: 'pending' },
      ];

      for (const issue of issues) {
        await pool.query(
          `INSERT INTO issues (type, severity, description, latitude, longitude, status, reported_by, reported_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW() - interval '${Math.floor(Math.random() * 7)} days')
           ON CONFLICT DO NOTHING`,
          [issue.type, issue.severity, issue.desc, issue.lat, issue.lng, issue.status, citizenId]
        );
      }
      console.log('✅ Demo issues seeded (5 issues)');
    }

    console.log('\n🎉 Database seeding complete!');
    console.log('───────────────────────────────');
    console.log('Admin Login:    admin / admin123');
    console.log('Citizen Login:  citizen / citizen123');
    console.log('Officer Login:  OFF-DEMO-001 / officer123');
    console.log('───────────────────────────────');
  } catch (error) {
    console.error('❌ Seeding error:', error.message);
  } finally {
    await pool.end();
  }
}

seed();
