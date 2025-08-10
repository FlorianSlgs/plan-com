const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const createTestApp = (pool) => {
  const app = express();
  
  app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
  }));
  app.use(express.json());
  app.use(cookieParser());
  
  // Importer et utiliser les routes d'auth
  const authRoutes = require('../../auth.routes')(pool);
  app.use('/api/auth', authRoutes);
  
  return app;
};

module.exports = createTestApp;
