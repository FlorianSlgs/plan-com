/**
 * Routes pour la gestion des objectifs (goals)
 * Utilise le pattern Service/Controller pour une meilleure séparation des responsabilités
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const authenticateToken = require('../middlewares/auth');
const GoalsController = require('../controllers/goals.controller');

// Configuration multer pour l'upload d'images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/goals_images');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

module.exports = (pool) => {
  // Initialisation du contrôleur (qui instancie le service)
  const goalsController = new GoalsController(pool);

  // Routes des permissions
  router.get('/campaign-permissions/:campaignId', 
    authenticateToken, 
    goalsController.getCampaignPermissions
  );

  router.get('/permissions/:campaignId', 
    authenticateToken, 
    goalsController.getCampaignPermissions
  );

  // Routes CRUD des objectifs
  router.post('/upload-image', 
    authenticateToken, 
    upload.single('image'), 
    goalsController.createGoalWithImage
  );

  router.get('/campaign-id/:campaignId', 
    authenticateToken, 
    goalsController.getGoalsByCampaignId
  );

  router.get('/campaign/:campaignName', 
    authenticateToken, 
    goalsController.getGoalsByCampaignName
  );

  router.put('/update/:goalId', 
    authenticateToken, 
    upload.single('image'), 
    goalsController.updateGoal
  );

  router.delete('/delete/:goalId', 
    authenticateToken, 
    goalsController.deleteGoal
  );

  return router;
};