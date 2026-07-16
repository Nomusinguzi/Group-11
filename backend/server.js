const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: './.env'});

const authRoutes = require('./routes/auth');
const patientRoutes = require('./routes/patients');
const clinicRoutes = require('./routes/clinics');
const symptomRoutes = require('./routes/symptoms');
const sosRoutes = require('./routes/sos');
const ussdRoutes = require('./routes/ussd');
const appointmentRoutes = require('./routes/appointments');
const notificationRoutes = require('./routes/notifications');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Africa's Talking posts x-www-form-urlencoded

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'sym-care-api' }));

app.use('/auth', authRoutes);
app.use('/patients', patientRoutes);
app.use('/clinics', clinicRoutes);
app.use('/symptoms', symptomRoutes);
app.use('/sos', sosRoutes);
app.use('/ussd', ussdRoutes);
app.use('/appointments', appointmentRoutes);
app.use('/notifications', notificationRoutes);

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// centralized error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`SYM-CARE API listening on port ${PORT}`);
});

module.exports = app;
