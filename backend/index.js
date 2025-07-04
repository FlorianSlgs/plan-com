const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const app = express();
const cookieParser = require('cookie-parser');

require('dotenv').config();

const PORT = process.env.PORT;

app.use('/uploads/goals_images', express.static(__dirname + '/uploads/goals_images'));

// PostgreSQL connection
const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
});

app.use(cors({
  origin: process.env.CORS,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Importer et utiliser les routes
const authRoutes = require('./auth.routes')(pool);
app.use('/api/auth', authRoutes);

const header = require('./routes/header.routes')(pool);
app.use('/api/header', header);

const goals = require('./routes/goals.routes')(pool);
app.use('/api/goals', goals);

const actionsRoutes = require('./routes/actions.routes')(pool);
app.use('/api/actions', actionsRoutes);

const tasksRoutes = require('./routes/tasks.routes')(pool);
app.use('/api/tasks', tasksRoutes);

// Start the server
app.listen(PORT, () => {
  console.log(`Serveur plan de com l'écoute sur http://localhost:${PORT}`);
});