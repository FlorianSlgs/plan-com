const validation = {
  validateCampaignCreation: (req, res, next) => {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Nom de campagne requis.' });
    }
    
    if (name.trim().length < 2) {
      return res.status(400).json({ message: 'Le nom de campagne doit contenir au moins 2 caractères.' });
    }
    
    next();
  },

  validateInvitation: (req, res, next) => {
    const { email, campaignId, role } = req.body;
    
    if (!email || !campaignId || !role) {
      return res.status(400).json({ 
        message: 'Email, ID de campagne et rôle sont requis.',
        success: false 
      });
    }

    if (!['reader', 'editor'].includes(role)) {
      return res.status(400).json({ 
        message: 'Le rôle doit être "reader" ou "editor".',
        success: false 
      });
    }

    // Validation basique de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        message: 'Format d\'email invalide.',
        success: false 
      });
    }

    next();
  }
};

module.exports = validation;