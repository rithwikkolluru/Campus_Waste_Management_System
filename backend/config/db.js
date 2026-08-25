require('dotenv').config();
const { Pool } = require('pg');

// Support Render's DATABASE_URL (production) or individual env vars (local dev)
const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    }
  : {
      host:     process.env.DB_HOST     || 'localhost',
      user:     process.env.DB_USER     || 'postgres',
      password: process.env.DB_PASSWORD || '1234567',
      database: process.env.DB_NAME     || 'collegeDB',
      port:     process.env.DB_PORT     || 5432,
    };

const pool = new Pool(poolConfig);

// Test connection on startup and confirm DB is reachable
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Failed to connect to PostgreSQL:', err.message);
    console.error('👉 Check your .env file — DB_HOST, DB_USER, DB_PASSWORD, DB_NAME');
    process.exit(1);
  }
  console.log('✅ Connected to PostgreSQL — Database:', process.env.DB_NAME || 'collegeDB');
  release();
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};