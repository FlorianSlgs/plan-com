const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const app = express();
const cookieParser = require('cookie-parser');

require('dotenv').config();

const PORT = process.env.PORT;

// PostgreSQL connection
const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
});

// Test de connexion immédiat
pool.connect((err) => {
  if (err) {
    console.error('❌ ERREUR DE CONNEXION À POSTGRESQL:', err.message);
    console.error('Code d\'erreur:', err.code);
    console.error('Détails:', err.detail);
  } else {
    console.log('✅ CONNEXION POSTGRESQL RÉUSSIE !');
  }
});

app.set("trust proxy", 1);

app.use(cors({
  origin: process.env.CORS,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  exposedHeaders: ['Set-Cookie']
}));
app.use(express.json());
app.use(cookieParser());

// Route sécurisée pour les images de goals avec middleware d'authentification
const authenticateGoalImage = require('./middlewares/authenticateGoalImage');
app.use('/uploads/goals_images', authenticateGoalImage(pool), express.static(__dirname + '/uploads/goals_images'));

// Route sécurisée pour les images de targets avec middleware d'authentification
const authenticateTargetImage = require('./middlewares/authenticateTargetImage');
app.use('/uploads/targets_images', authenticateTargetImage(pool), express.static(__dirname + '/uploads/targets_images'));

// Importer et utiliser les routes
const authRoutes = require('./auth.routes')(pool);
app.use('/api/auth', authRoutes);

const headerRoutes = require('./routes/header.routes')(pool);
app.use('/api/header', headerRoutes);

const goalsRoutes = require('./routes/goals.routes')(pool);
app.use('/api/goals', goalsRoutes);

const targetsRoutes = require('./routes/targets.routes')(pool);
app.use('/api/targets', targetsRoutes);

const actionsRoutes = require('./routes/actions.routes')(pool);
app.use('/api/actions', actionsRoutes);

const tasksRoutes = require('./routes/tasks.routes')(pool);
app.use('/api/tasks', tasksRoutes);

// Routes d'administration
const adminRoutes = require('./routes/admin.route')(pool);
app.use('/api/admin', adminRoutes);

// Lancer le server
app.listen(PORT, () => {
  console.log(`🚀 Serveur plan de com à l'écoute sur http://localhost:${PORT}`);
  console.log(`🌐 CORS autorisé pour: ${process.env.CORS}`);
});