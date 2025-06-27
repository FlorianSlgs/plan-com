const campaignService = require('../services/campaignService');

const campaignController = {
  createCampaign: (pool) => async (req, res) => {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Nom de campagne requis.' });
    }
    
    try {
      const result = await pool.query(
        'INSERT INTO campaign (user_id, name) VALUES ($1, $2) RETURNING id, name',
        [req.user.id, name]
      );
      
      const createdCampaign = result.rows[0];
      
      res.status(201).json({ 
        message: 'Campagne créée.',
        campaign: {
          id: createdCampaign.id,
          name: createdCampaign.name
        }
      });
    } catch (err) {
      console.error('Erreur lors de la création de la campagne:', err);
      res.status(500).json({ message: 'Erreur serveur.' });
    }
  },

  getCampaigns: (pool) => async (req, res) => {
    try {
      // Récupérer les campagnes créées par l'utilisateur
      const ownCampaignsResult = await pool.query(
        `SELECT c.id, c.name, u.first_name, u.last_name, 'owner' as user_role
         FROM campaign c
         JOIN users u ON c.user_id = u.id
         WHERE c.user_id = $1
         ORDER BY c.name`,
        [req.user.id]
      );

      // Récupérer les campagnes partagées avec l'utilisateur
      const sharedCampaignsResult = await pool.query(
        `SELECT c.id, c.name, u.first_name, u.last_name, 
                CASE 
                  WHEN sc.read = false THEN 'editor'
                  ELSE 'reader'
                END as user_role
         FROM share_campaigns sc
         JOIN campaign c ON sc.campaign_id = c.id
         JOIN users u ON c.user_id = u.id
         WHERE sc.user_id = $1
         ORDER BY c.name`,
        [req.user.id]
      );

      // Combiner les résultats
      const allCampaigns = [
        ...ownCampaignsResult.rows,
        ...sharedCampaignsResult.rows
      ];

      res.json(allCampaigns);
    } catch (err) {
      console.error('Erreur lors de la récupération des campagnes:', err);
      res.status(500).json({ message: 'Erreur serveur.' });
    }
  },

  deleteCampaign: (pool) => async (req, res) => {
    const { campaignId } = req.params;
    const { campaignName } = req.body;
    
    try {
      const result = await campaignService.deleteCampaignWithData(
        pool, 
        campaignId, 
        campaignName, 
        req.user.id
      );
      
      res.json(result);
    } catch (err) {
      console.error('Erreur lors de la suppression:', err);
      res.status(err.status || 500).json({ 
        message: err.message || 'Erreur serveur.',
        success: false 
      });
    }
  },

  leaveSharedCampaign: (pool) => async (req, res) => {
    const { campaignId } = req.params;
    
    if (!campaignId) {
      return res.status(400).json({ 
        message: 'ID de campagne requis.',
        success: false 
      });
    }
    
    try {
      // Vérifier que l'utilisateur a bien accès à cette campagne partagée
      const checkResult = await pool.query(
        'SELECT id FROM share_campaigns WHERE campaign_id = $1 AND user_id = $2',
        [campaignId, req.user.id]
      );
      
      if (checkResult.rows.length === 0) {
        return res.status(403).json({ 
          message: 'Campagne partagée non trouvée ou accès non autorisé.',
          success: false 
        });
      }
      
      // Supprimer l'entrée de share_campaigns
      const deleteResult = await pool.query(
        'DELETE FROM share_campaigns WHERE campaign_id = $1 AND user_id = $2 RETURNING campaign_id',
        [campaignId, req.user.id]
      );
      
      if (deleteResult.rows.length === 0) {
        return res.status(404).json({ 
          message: 'Campagne partagée non trouvée.',
          success: false 
        });
      }
      
      res.json({
        message: 'Vous avez quitté la campagne partagée avec succès.',
        success: true
      });
      
    } catch (err) {
      console.error('Erreur lors de la suppression de la campagne partagée:', err);
      res.status(500).json({ 
        message: 'Erreur serveur.',
        success: false 
      });
    }
  }
};

module.exports = campaignController;