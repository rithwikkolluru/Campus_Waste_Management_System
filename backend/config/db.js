require('dotenv').config();
const { Pool } = require('pg');

// Create a new pool instance using the environment variables
const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME     || 'ecocampus_db',
  port:     process.env.DB_PORT     || 5432,
});

// Test connection on startup
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

console.log('PostgreSQL Pool Initialized');

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
