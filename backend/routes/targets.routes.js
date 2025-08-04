/**
 * Routes pour la gestion des objectifs (targets)
 * Utilise le pattern Service/Controller pour une meilleure séparation des responsabilités
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const authenticateToken = require('../middlewares/auth');
const TargetsController = require('../controllers/targets.controller');

// Configuration multer pour l'upload d'images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/targets_images');
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
  const targetsController = new TargetsController(pool);

  // Routes des permissions
  router.get('/campaign-permissions/:campaignId', 
    authenticateToken, 
    targetsController.getCampaignPermissions
  );

  router.get('/permissions/:campaignId', 
    authenticateToken, 
    targetsController.getCampaignPermissions
  );

  // Routes CRUD des objectifs
  router.post('/upload-image', 
    authenticateToken, 
    upload.single('image'), 
    targetsController.createTargetWithImage
  );

  router.get('/campaign-id/:campaignId', 
    authenticateToken, 
    targetsController.getTargetsByCampaignId
  );

  router.get('/campaign/:campaignName', 
    authenticateToken, 
    targetsController.getTargetsByCampaignName
  );

  router.put('/update/:targetId', 
    authenticateToken, 
    upload.single('image'), 
    targetsController.updateTarget
  );

  router.delete('/delete/:targetId', 
    authenticateToken, 
    targetsController.deleteTarget
  );

  return router;
};