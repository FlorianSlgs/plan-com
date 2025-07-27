const express = require('express');
const router = express.Router();
const authenticateToken = require('../middlewares/auth');
const requireAdmin = require('../middlewares/admin');

module.exports = (pool) => {
  // Route pour récupérer toutes les campagnes (admin seulement)
  router.get('/campaigns', authenticateToken, requireAdmin(pool), async (req, res) => {
    try {
      console.log('Récupération des campagnes par admin:', req.user.email);
      
      // Récupérer toutes les campagnes avec leurs noms
      const campaignsResult = await pool.query(
        'SELECT id, name, created_at, updated_at FROM campaign ORDER BY created_at DESC'
      );

      const campaigns = campaignsResult.rows;
      
      console.log(`${campaigns.length} campagnes récupérées`);
      
      res.status(200).json({
        success: true,
        data: campaigns,
        count: campaigns.length
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des campagnes:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur serveur lors de la récupération des campagnes.'
      });
    }
  });

  // Route pour récupérer les statistiques générales (admin seulement)
  router.get('/stats', authenticateToken, requireAdmin(pool), async (req, res) => {
    try {
      console.log('Récupération des statistiques par admin:', req.user.email);
      
      // Compter le nombre total de campagnes
      const campaignsCount = await pool.query('SELECT COUNT(*) as count FROM campaign');
      
      // Compter le nombre total d'utilisateurs
      const usersCount = await pool.query('SELECT COUNT(*) as count FROM users');
      
      // Compter le nombre d'admins
      const adminsCount = await pool.query('SELECT COUNT(*) as count FROM users WHERE admin = true');

      res.status(200).json({
        success: true,
        data: {
          totalCampaigns: parseInt(campaignsCount.rows[0].count),
          totalUsers: parseInt(usersCount.rows[0].count),
          totalAdmins: parseInt(adminsCount.rows[0].count)
        }
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur serveur lors de la récupération des statistiques.'
      });
    }
  });

  return router;
};