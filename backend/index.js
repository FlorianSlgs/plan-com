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

// TEST DE CONNEXION POSTGRESQL - AJOUT
console.log('=== TEST DE CONNEXION POSTGRESQL ===');
console.log('Host:', process.env.PGHOST);
console.log('Database:', process.env.PGDATABASE);
console.log('User:', process.env.PGUSER);
console.log('Port:', process.env.PGPORT);

// Test de connexion immédiat
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ ERREUR DE CONNEXION À POSTGRESQL:', err.message);
    console.error('Code d\'erreur:', err.code);
    console.error('Détails:', err.detail);
  } else {
    console.log('✅ CONNEXION POSTGRESQL RÉUSSIE !');
    
    // Test d'une requête simple
    client.query('SELECT NOW() as current_time, version() as pg_version', (err, result) => {
      release(); // Libérer le client
      
      if (err) {
        console.error('❌ ERREUR LORS DU TEST DE REQUÊTE:', err.message);
      } else {
        console.log('✅ TEST DE REQUÊTE RÉUSSI !');
        console.log('Heure actuelle:', result.rows[0].current_time);
        console.log('Version PostgreSQL:', result.rows[0].pg_version.split(' ')[0]);
        
        // Test spécifique à votre table users
        pool.query('SELECT COUNT(*) as user_count FROM users', (err, userResult) => {
          if (err) {
            console.error('❌ ERREUR LORS DE L\'ACCÈS À LA TABLE USERS:', err.message);
          } else {
            console.log('✅ TABLE USERS ACCESSIBLE !');
            console.log('Nombre d\'utilisateurs:', userResult.rows[0].user_count);
          }
        });
      }
    });
  }
});

// Gestion des erreurs de pool
pool.on('error', (err, client) => {
  console.error('❌ ERREUR INATTENDUE DU POOL POSTGRESQL:', err.message);
});

console.log('=====================================');

app.use(cors({
  origin: process.env.CORS,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  exposedHeaders: ['Set-Cookie']
}));
app.use(express.json());
app.use(cookieParser());

// ROUTE DE DIAGNOSTIC POSTGRESQL - AJOUT
app.get('/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as current_time, version() as pg_version');
    const userCount = await pool.query('SELECT COUNT(*) as count FROM users');
    
    res.json({
      status: '✅ PostgreSQL fonctionne'
    });
  } catch (err) {
    console.error('❌ ERREUR DANS /test-db:', err);
    res.status(500).json({
      status: '❌ Erreur PostgreSQL',
      error: err.message,
      code: err.code
    });
  }
});

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
  console.log(`📊 Test DB disponible sur: http://localhost:${PORT}/test-db`);
});