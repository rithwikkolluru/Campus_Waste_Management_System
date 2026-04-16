require('dotenv').config({ path: '../.env' });
const { Pool } = require('pg');
const fs       = require('fs');
const path     = require('path');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME     || 'ecocampus_db',
  port:     process.env.DB_PORT     || 5432,
});

const schema = `
DROP TABLE IF EXISTS points_logs CASCADE;
DROP TABLE IF EXISTS report_logs CASCADE;
DROP TABLE IF EXISTS report_images CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS assignments CASCADE;
DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS zones CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- User Roles: student, coordinator, admin, staff
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    phone VARCHAR(15) UNIQUE,
    email VARCHAR(100) UNIQUE,
    password TEXT,
    role VARCHAR(20) CHECK (role IN ('student', 'coordinator', 'admin', 'staff')) NOT NULL DEFAULT 'student',
    otp VARCHAR(10),
    otp_expiry TIMESTAMP,
    otp_retries INTEGER DEFAULT 0,
    total_points INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE zones (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    priority_level INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE reports (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    zone_id INTEGER REFERENCES zones(id),
    description TEXT,
    image_url TEXT,
    waste_type VARCHAR(50),
    priority VARCHAR(10) CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'low',
    status VARCHAR(20) CHECK (status IN ('reported', 'under_review', 'assigned', 'in_progress', 'resolved')) DEFAULT 'reported',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE assignments (
    id SERIAL PRIMARY KEY,
    report_id INTEGER REFERENCES reports(id) ON DELETE CASCADE,
    staff_id INTEGER REFERENCES users(id),
    assigned_by INTEGER REFERENCES users(id),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE report_images (
    id SERIAL PRIMARY KEY,
    report_id INTEGER REFERENCES reports(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE report_logs (
    id SERIAL PRIMARY KEY,
    report_id INTEGER REFERENCES reports(id) ON DELETE CASCADE,
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    changed_by INTEGER REFERENCES users(id),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE points_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    points INTEGER NOT NULL,
    report_id INTEGER REFERENCES reports(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indices for performance
CREATE INDEX idx_reports_zone ON reports(zone_id);
CREATE INDEX idx_reports_status ON reports(status);

-- Initial Data
INSERT INTO zones (name, description, priority_level) VALUES 
('Hostel Area', 'Student hostel residential zone', 3),
('Canteen', 'Campus food court and kitchen area', 5),
('Academic Block', 'Main classrooms and laboratories', 4),
('Library', 'Quiet study zone and resources', 2),
('Sports Ground', 'Outdoor athletic fields', 1);
`;

async function initDB() {
  try {
    console.log('Connecting to PostgreSQL to build EcoCampus tables...');
    await pool.query(schema);
    console.log('✅ EcoCampus Database initialized with all tables successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to initialize database:', err.message);
    process.exit(1);
  }
}

initDB();
