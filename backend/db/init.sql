-- UrbanLens Database Schema
-- Requires PostgreSQL with PostGIS extension

CREATE EXTENSION IF NOT EXISTS postgis;

-- Users table (citizens)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  phone VARCHAR(15) NOT NULL,
  address TEXT,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'citizen',
  points INTEGER DEFAULT 0,
  badge VARCHAR(20) DEFAULT 'bronze',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Admin table (pre-seeded)
CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) DEFAULT 'Admin',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Municipal wards (admin-managed)
CREATE TABLE IF NOT EXISTS wards (
  id SERIAL PRIMARY KEY,
  office_name VARCHAR(150) NOT NULL,
  ward_no VARCHAR(30) NOT NULL,
  area_name VARCHAR(150) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(office_name, ward_no)
);

-- Municipal officers (created by admin)
CREATE TABLE IF NOT EXISTS officers (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  phone VARCHAR(15) NOT NULL,
  municipal_area VARCHAR(100) NOT NULL,
  ward_id INTEGER REFERENCES wards(id) ON DELETE SET NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  issues_resolved INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Issues table with PostGIS geometry
CREATE TABLE IF NOT EXISTS issues (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) DEFAULT 'medium',
  description TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  location GEOMETRY(Point, 4326),
  image_url VARCHAR(500),
  after_image_url VARCHAR(500),
  status VARCHAR(20) DEFAULT 'pending',
  reported_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  assigned_to INTEGER REFERENCES officers(id) ON DELETE SET NULL,
  ward_id INTEGER REFERENCES wards(id) ON DELETE SET NULL,
  duplicate_of INTEGER REFERENCES issues(id) ON DELETE SET NULL,
  upvotes INTEGER DEFAULT 1,
  feedback_rating INTEGER,
  feedback_text TEXT,
  reported_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);

-- Contractors table
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
);

-- Bids table
CREATE TABLE IF NOT EXISTS bids (
  id SERIAL PRIMARY KEY,
  issue_id INTEGER REFERENCES issues(id) ON DELETE CASCADE,
  contractor_id VARCHAR(20) REFERENCES contractors(contractor_id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  note TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(issue_id, contractor_id)
);

-- Spatial index for deduplication queries
CREATE INDEX IF NOT EXISTS idx_issues_location ON issues USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status);
CREATE INDEX IF NOT EXISTS idx_issues_type ON issues(type);

-- Points log for gamification tracking
CREATE TABLE IF NOT EXISTS points_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  reason VARCHAR(200),
  created_at TIMESTAMP DEFAULT NOW()
);
