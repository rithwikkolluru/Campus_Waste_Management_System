require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const morgan  = require('morgan');
const path    = require('path');
const compression = require('compression');
const fs = require('fs');

const uploadDir = path.join(__dirname, 'uploads/waste-photos');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('Created uploads folder');
}

const app = express();
const PORT = process.env.PORT || 8000;
const { xssCleaner } = require('./middleware/xssMiddleware');

// Enable CORS and JSON parsing
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(xssCleaner);
app.use(morgan('dev'));

// Static folder for uploaded garbage images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check route
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'EcoCampus API is live!' });
});

// Route Imports
const authRoutes   = require('./routes/authRoutes');
const reportRoutes = require('./routes/reportRoutes');
const zoneRoutes    = require('./routes/zoneRoutes');
const staffRoutes   = require('./routes/staffRoutes');
const adminRoutes   = require('./routes/adminRoutes');

// API Routes
app.use('/api/auth',    authRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/zones',   zoneRoutes);
app.use('/api/staff',   staffRoutes);
app.use('/api/admin',   adminRoutes);

// Catch 404 - Not Found
app.use((req, res) => {
  res.status(404).json({ status: 'error', message: 'API endpoint not found.' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ status: 'error', message: err.message || 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`EcoCampus Backend listening on http://localhost:${PORT}`);
});
