// header.routes.js - Version modulaire avec gestion des invitations
const express = require('express');
const router = express.Router();
const authenticateToken = require('./middlewares/auth');

// Import des contrôleurs
const userController = require('./controllers/userController');
const campaignController = require('./controllers/campaignController');
const inviteController = require('./controllers/inviteController');
const invitationController = require('./controllers/invitationController');

module.exports = (pool) => {
  // Routes utilisateur
  router.get('/user', authenticateToken, userController.getUser(pool));
  
  // Routes campagnes
  router.post('/campaign', authenticateToken, campaignController.createCampaign(pool));
  router.get('/campaigns', authenticateToken, campaignController.getCampaigns(pool));
  router.delete('/campaign/:campaignId', authenticateToken, campaignController.deleteCampaign(pool));
  
  // Route pour quitter une campagne partagée
  router.delete('/shared-campaign/:campaignId', authenticateToken, campaignController.leaveSharedCampaign(pool));
  
  // Route compte
  router.delete('/account', authenticateToken, userController.deleteAccount(pool));
  
  // Route invitation (envoi d'invitations)
  router.post('/invite', authenticateToken, inviteController.inviteUser(pool));
  
  // Routes gestion des invitations reçues
  router.get('/invitations', authenticateToken, invitationController.getPendingInvitations(pool));
  router.put('/invitation/:invitationId/accept', authenticateToken, invitationController.acceptInvitation(pool));
  router.delete('/invitation/:invitationId/reject', authenticateToken, invitationController.rejectInvitation(pool));

  return router;
};