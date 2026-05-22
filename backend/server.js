require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/saltmuchhh';

app.use(cors());
app.use(express.json());

// Serve static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const connectDatabase = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('\x1b[32m%s\x1b[0m', 'MongoDB Connected');
  } catch (err) {
    console.error('\x1b[31m%s\x1b[0m', 'MongoDB Not Connected');
    console.error(err);
  }
};

mongoose.connection.on('connected', () => {
  console.log('\x1b[32m%s\x1b[0m', 'MongoDB Connected');
});

mongoose.connection.on('error', (err) => {
  console.error('\x1b[31m%s\x1b[0m', 'MongoDB Not Connected');
  console.error(err);
});

mongoose.connection.on('disconnected', () => {
  console.error('\x1b[31m%s\x1b[0m', 'MongoDB Not Connected');
});

connectDatabase();

// Set up routes
app.use('/api', apiRoutes);

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
