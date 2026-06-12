require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const FormData = require('form-data');
const http = require('http');
const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '1234567',
  database: process.env.DB_NAME     || 'collegeDB',
  port:     process.env.DB_PORT     || 5432,
});

// Create express app
const app = express();
app.use(express.json());

// Override submitReport to capture and print error directly
const reportController = require('./controllers/reportController');
const origSubmit = reportController.submitReport;

// Wrap to print error
reportController.submitReport = async (req, res) => {
  try {
    await origSubmit(req, res);
  } catch (err) {
    console.error('DIRECT CAPTURED ERROR:', err);
    throw err;
  }
};

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/reports', require('./routes/reportRoutes'));

const server = app.listen(9090, async () => {
  console.log('Test server listening on 9090');
  
  try {
    // Get student user
    const userRes = await pool.query("SELECT id, name, email, role FROM users WHERE role = 'student' LIMIT 1");
    const student = userRes.rows[0];
    
    const token = jwt.sign(
      { id: student.id, email: student.email, role: student.role },
      process.env.JWT_SECRET
    );

    const form = new FormData();
    form.append('zone_id', '1');
    form.append('description', 'Test trash description');
    form.append('waste_type', 'Mixed');
    form.append('priority', 'medium');
    form.append('location', 'Hostel Area');
    form.append('latitude', '17.4910');
    form.append('longitude', '78.3910');
    form.append('gps_accuracy', '15');

    const imagePath = path.join(__dirname, 'uploads', 'waste-photos', 'demo-waste-1781228038460-0.png');
    form.append('image', fs.createReadStream(imagePath));

    const request = http.request({
      host: 'localhost',
      port: 9090,
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
        server.close();
        process.exit(0);
      });
    });

    request.on('error', (err) => {
      console.error('Request error:', err);
      server.close();
      process.exit(1);
    });

    form.pipe(request);
  } catch (err) {
    console.error('Setup error:', err);
    server.close();
    process.exit(1);
  }
});
