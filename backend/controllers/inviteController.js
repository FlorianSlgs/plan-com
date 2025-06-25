const inviteService = require('../services/inviteService');

const inviteController = {
  inviteUser: (pool) => async (req, res) => {
    const { email, campaignId, role } = req.body;
    
    try {
      const result = await inviteService.createInvitation(
        pool,
        email,
        campaignId,
        role,
        req.user.id
      );
      
      res.status(result.isUpdate ? 200 : 201).json({
        message: result.message,
        success: true
      });
    } catch (err) {
      console.error('Erreur lors de l\'invitation:', err);
      res.status(err.status || 500).json({
        message: err.message || 'Erreur serveur.',
        success: false
      });
    }
  }
};

module.exports = inviteController;