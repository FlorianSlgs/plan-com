// controllers/invitationController.js
const invitationService = require('../services/invitationService');

const invitationController = {
  getPendingInvitations: (pool) => async (req, res) => {
    try {
      const invitations = await invitationService.getPendingInvitations(pool, req.user.id);
      
      res.json({
        invitations,
        success: true
      });
    } catch (err) {
      console.error('Erreur lors de la récupération des invitations:', err);
      res.status(500).json({
        message: 'Erreur lors de la récupération des invitations.',
        success: false
      });
    }
  },

  acceptInvitation: (pool) => async (req, res) => {
    const { invitationId } = req.params;
    
    try {
      const result = await invitationService.acceptInvitation(pool, invitationId, req.user.id);
      
      res.json({
        message: result.message,
        campaignId: result.campaignId,
        success: true
      });
    } catch (err) {
      console.error('Erreur lors de l\'acceptation de l\'invitation:', err);
      res.status(err.status || 500).json({
        message: err.message || 'Erreur lors de l\'acceptation de l\'invitation.',
        success: false
      });
    }
  },

  rejectInvitation: (pool) => async (req, res) => {
    const { invitationId } = req.params;
    
    try {
      const result = await invitationService.rejectInvitation(pool, invitationId, req.user.id);
      
      res.json({
        message: result.message,
        success: true
      });
    } catch (err) {
      console.error('Erreur lors du refus de l\'invitation:', err);
      res.status(err.status || 500).json({
        message: err.message || 'Erreur lors du refus de l\'invitation.',
        success: false
      });
    }
  }
};

module.exports = invitationController;