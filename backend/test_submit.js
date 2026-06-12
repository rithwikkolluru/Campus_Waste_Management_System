require('dotenv').config();
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const http = require('http');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '1234567',
  database: process.env.DB_NAME     || 'collegeDB',
  port:     process.env.DB_PORT     || 5432,
});

async function run() {
  try {
    // 1. Get a student user
    const userRes = await pool.query("SELECT id, name, email, role FROM users WHERE role = 'student' LIMIT 1");
    if (userRes.rows.length === 0) {
      console.error('No student user found in database. Please register first.');
      process.exit(1);
    }
    const student = userRes.rows[0];
    console.log('Using student user:', student);

    // 2. Generate token
    const token = jwt.sign(
      { userId: student.id, email: student.email, role: student.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 3. Prepare FormData
    const form = new FormData();
    form.append('zone_id', '1');
    form.append('description', 'Test trash found near the canteen area.');
    form.append('waste_type', 'Plastic');
    form.append('priority', 'low');
    form.append('location', 'Canteen');
    form.append('latitude', '17.4910'); // within campus bounds
    form.append('longitude', '78.3910'); // within campus bounds
    form.append('gps_accuracy', '15');

    const imagePath = path.join(__dirname, 'uploads', 'waste-photos', 'demo-waste-1781228038460-0.png');
    if (!fs.existsSync(imagePath)) {
      console.error('Real garbage image not found!');
      process.exit(1);
    }
    form.append('image', fs.createReadStream(imagePath), {
      filename: 'test.png',
      contentType: 'image/png',
    });

    // 4. Send request
    const request = http.request({
      host: 'localhost',
      port: 8000,
      path: '/api/reports/submit',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        ...form.getHeaders()
      }
    }, (response) => {
      let data = '';
      response.on('data', (chunk) => { data += chunk; });
      response.on('end', () => {
        console.log(`STATUS: ${response.statusCode}`);
        console.log('RESPONSE:', data);
        process.exit(0);
      });
    });

    request.on('error', (err) => {
      console.error('Request error:', err);
      process.exit(1);
    });

    form.pipe(request);
  } catch (err) {
    console.error('Error running test submission:', err);
    process.exit(1);
  }
}

run();
