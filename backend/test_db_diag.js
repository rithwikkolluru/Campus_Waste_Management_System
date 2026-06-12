require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '1234567',
  database: process.env.DB_NAME     || 'collegeDB',
  port:     process.env.DB_PORT     || 5432,
});

async function run() {
  try {
    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'reports' 
      ORDER BY column_name
    `);
    console.log('REPORTS COLUMNS:');
    console.log(JSON.stringify(res.rows, null, 2));

    const photosRes = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'report_photos' 
      ORDER BY column_name
    `);
    console.log('REPORT_PHOTOS COLUMNS:');
    console.log(JSON.stringify(photosRes.rows, null, 2));

    const usersRes = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY column_name
    `);
    console.log('USERS COLUMNS:');
    console.log(JSON.stringify(usersRes.rows, null, 2));
    
    process.exit(0);
  } catch (err) {
    console.error('Error querying columns:', err);
    process.exit(1);
  }
}

run();
