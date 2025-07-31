const campaignService = require('../services/campaignService');
const CampaignAccessService = require('../services/campaignAccess.service');

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
  },

  getCampaignUsers: (pool) => async (req, res) => {
    const { campaignId } = req.params;
    
    if (!campaignId) {
      return res.status(400).json({ 
        message: 'ID de campagne requis.',
        success: false 
      });
    }
    
    try {
      const campaignAccessService = new CampaignAccessService(pool);
      
      // Ne pas convertir en nombre, garder l'ID tel quel (UUID ou nombre)
      // Vérifier que l'utilisateur est propriétaire de la campagne
      const isOwner = await campaignAccessService.isCampaignOwner(req.user.id, campaignId);
      
      if (!isOwner) {
        return res.status(403).json({ 
          message: 'Seul le propriétaire de la campagne peut voir la liste des utilisateurs.',
          success: false 
        });
      }
      
      // Récupérer les utilisateurs ayant accès à la campagne
      const users = await campaignAccessService.getCampaignUsers(req.user.id, campaignId);
      
      res.json({
        users: users.map(user => ({
          userId: user.userId,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        })),
        success: true
      });
      
    } catch (err) {
      console.error('Erreur lors de la récupération des utilisateurs de la campagne:', err);
      
      if (err.message === 'OWNER_ACCESS_REQUIRED') {
        return res.status(403).json({ 
          message: 'Seul le propriétaire de la campagne peut voir la liste des utilisateurs.',
          success: false 
        });
      }
      
      res.status(500).json({ 
        message: 'Erreur serveur.',
        success: false 
      });
    }
  },

  removeUserFromCampaign: (pool) => async (req, res) => {
    const { campaignId, userId } = req.params;
    
    if (!campaignId || !userId) {
      return res.status(400).json({ 
        message: 'ID de campagne et ID utilisateur requis.',
        success: false 
      });
    }
    
    try {
      const campaignAccessService = new CampaignAccessService(pool);
      
      // Supprimer l'accès de l'utilisateur
      const removed = await campaignAccessService.removeUserAccess(
        req.user.id, 
        campaignId, 
        userId
      );
      
      if (removed) {
        res.json({
          message: 'Utilisateur supprimé de la campagne avec succès.',
          success: true
        });
      } else {
        res.status(404).json({
          message: 'Utilisateur non trouvé dans cette campagne.',
          success: false
        });
      }
      
    } catch (err) {
      console.error('Erreur lors de la suppression de l\'utilisateur:', err);
      
      if (err.message === 'OWNER_ACCESS_REQUIRED') {
        return res.status(403).json({ 
          message: 'Seul le propriétaire de la campagne peut supprimer des utilisateurs.',
          success: false 
        });
      }
      
      res.status(500).json({ 
        message: 'Erreur serveur.',
        success: false 
      });
    }
  },

  updateUserRole: (pool) => async (req, res) => {
    const { campaignId, userId } = req.params;
    const { role } = req.body;
    
    if (!campaignId || !userId || !role) {
      return res.status(400).json({ 
        message: 'ID de campagne, ID utilisateur et rôle requis.',
        success: false 
      });
    }
    
    if (!['reader', 'editor'].includes(role)) {
      return res.status(400).json({ 
        message: 'Rôle invalide. Utilisez "reader" ou "editor".',
        success: false 
      });
    }
    
    try {
      const campaignAccessService = new CampaignAccessService(pool);
      
      // Vérifier que l'utilisateur est propriétaire de la campagne
      const isOwner = await campaignAccessService.isCampaignOwner(req.user.id, campaignId);
      
      if (!isOwner) {
        return res.status(403).json({ 
          message: 'Seul le propriétaire de la campagne peut modifier les rôles.',
          success: false 
        });
      }
      
      // Mettre à jour le rôle (read = true pour reader, read = false pour editor)
      const readValue = role === 'reader';
      
      const result = await pool.query(
        'UPDATE share_campaigns SET read = $1 WHERE campaign_id = $2 AND user_id = $3 RETURNING id',
        [readValue, campaignId, UserId]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          message: 'Utilisateur non trouvé dans cette campagne.',
          success: false
        });
      }
      
      res.json({
        message: `Rôle mis à jour vers ${role === 'reader' ? 'Lecteur' : 'Éditeur'} avec succès.`,
        success: true
      });
      
    } catch (err) {
      console.error('Erreur lors de la mise à jour du rôle:', err);
      res.status(500).json({ 
        message: 'Erreur serveur.',
        success: false 
      });
    }
  }
};

module.exports = campaignController;