const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const app = express();
const PORT = 3000;

app.use('/uploads/goals_images', express.static(__dirname + '/uploads/goals_images'));

// PostgreSQL connection
require('dotenv').config();
const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
});

app.use(cors());
app.use(express.json());

// Helper to generate a fake token
const generateToken = (email) => {
  return Buffer.from(email + Date.now()).toString('base64');
};

// Import and use the auth routes
const authRoutes = require('./auth.routes')(pool, generateToken);
app.use('/api/auth', authRoutes);

const header = require('./header.routes')(pool);
app.use('/api/header', header);

const goals = require('./goals.routes')(pool);
app.use('/api/goals', goals);

// Start the server
app.listen(PORT, () => {
  console.log(`Serveur plan de com l'écoute sur http://localhost:${PORT}`);
});