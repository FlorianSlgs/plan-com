const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const authenticateToken = require('./middlewares/auth');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '/uploads/goals_images');
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
  /**
   * Fonction utilitaire pour vérifier l'accès à une campagne
   * Vérifie si l'utilisateur est propriétaire OU a accès via share_campaigns
   */
  async function checkCampaignAccess(campaignId, userId) {
    try {
      // Vérifie d'abord si l'utilisateur est propriétaire de la campagne
      const ownerCheck = await pool.query(
        'SELECT id FROM campaign WHERE id = $1 AND user_id = $2',
        [campaignId, userId]
      );

      if (ownerCheck.rows.length > 0) {
        return { hasAccess: true, isOwner: true };
      }

      // Si pas propriétaire, vérifie dans share_campaigns
      const shareCheck = await pool.query(
        'SELECT id FROM share_campaigns WHERE campaign_id = $1 AND user_id = $2',
        [campaignId, userId]
      );

      return { 
        hasAccess: shareCheck.rows.length > 0, 
        isOwner: false 
      };
    } catch (error) {
      console.error('Erreur lors de la vérification d\'accès:', error);
      return { hasAccess: false, isOwner: false };
    }
  }

  // Route protégée pour créer un goal
  router.post('/upload-image', authenticateToken, upload.single('image'), async (req, res) => {
    try {
      const filePath = req.file ? req.file.filename : null;
      const { campaignId, title, description, subgoals } = req.body;
      const userId = req.user.id;
      
      if (!filePath || !campaignId || !title) {
        return res.status(400).json({ message: 'Champs requis manquants.' });
      }

      // Vérifie l'accès à la campagne (propriétaire ou partagée)
      const accessCheck = await checkCampaignAccess(campaignId, userId);
      
      if (!accessCheck.hasAccess) {
        return res.status(404).json({ message: 'Campagne non trouvée ou accès non autorisé.' });
      }

      // Insère le goal avec l'userId de l'utilisateur connecté
      await pool.query(
        `INSERT INTO goals (user_id, campaign_id, goals_name, goals_description, subgoals, goals_imageurl)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, campaignId, title, description, subgoals, filePath]
      );

      res.status(201).json({ message: 'Objectif enregistré.', filePath });
    } catch (err) {
      console.error('Erreur lors de la création du goal:', err);
      res.status(500).json({ message: 'Erreur serveur.' });
    }
  });

  // Route protégée pour récupérer les goals d'une campagne par ID
  router.get('/campaign-id/:campaignId', authenticateToken, async (req, res) => {
    const { campaignId } = req.params;
    const userId = req.user.id;
    
    try {
      // Vérifie l'accès à la campagne (propriétaire ou partagée)
      const accessCheck = await checkCampaignAccess(campaignId, userId);
      
      if (!accessCheck.hasAccess) {
        return res.json([]); // Pas d'accès, retourne un tableau vide
      }

      // Récupère TOUS les goals de cette campagne (pas seulement ceux de l'utilisateur)
      const result = await pool.query(
        `SELECT id, goals_name, goals_description, subgoals, goals_imageurl, campaign_id
         FROM goals WHERE campaign_id = $1
         ORDER BY goals_name`,
        [campaignId]
      );
      
      res.json(result.rows);
    } catch (err) {
      console.error('Erreur lors de la récupération des goals:', err);
      res.status(500).json({ message: 'Erreur serveur.' });
    }
  });

  // Garde l'ancienne route pour compatibilité descendante
  router.get('/campaign/:campaignName', authenticateToken, async (req, res) => {
    const { campaignName } = req.params;
    const userId = req.user.id;
    
    try {
      // Récupère l'ID de la campagne à partir du nom
      const campaignResult = await pool.query(
        'SELECT id FROM campaign WHERE name = $1',
        [campaignName]
      );
      
      if (campaignResult.rows.length === 0) {
        return res.json([]);
      }

      const campaignId = campaignResult.rows[0].id;

      // Vérifie l'accès à la campagne
      const accessCheck = await checkCampaignAccess(campaignId, userId);
      
      if (!accessCheck.hasAccess) {
        return res.json([]);
      }

      // Récupère tous les goals de cette campagne
      const result = await pool.query(
        `SELECT id, goals_name, goals_description, subgoals, goals_imageurl, campaign_id
         FROM goals WHERE campaign_id = $1
         ORDER BY goals_name`,
        [campaignId]
      );
      
      res.json(result.rows);
    } catch (err) {
      console.error('Erreur lors de la récupération des goals:', err);
      res.status(500).json({ message: 'Erreur serveur.' });
    }
  });

  // Route protégée pour mettre à jour un goal
  router.put('/update/:goalId', authenticateToken, upload.single('image'), async (req, res) => {
    try {
      const { goalId } = req.params;
      const { title, description, subgoals } = req.body;
      const userId = req.user.id;
      let imageUrl = null;

      if (req.file) {
        imageUrl = req.file.filename;
      }

      // Vérifie que le goal existe et récupère les infos de la campagne
      const goalCheck = await pool.query(
        'SELECT campaign_id FROM goals WHERE id = $1',
        [goalId]
      );
      
      if (goalCheck.rows.length === 0) {
        return res.status(404).json({ message: 'Objectif non trouvé.' });
      }

      const goal = goalCheck.rows[0];

      // Vérifie l'accès à la campagne
      const accessCheck = await checkCampaignAccess(goal.campaign_id, userId);

      if (!accessCheck.hasAccess) {
        return res.status(403).json({ message: 'Non autorisé à modifier cet objectif.' });
      }

      // Mets à jour les champs
      const updateFields = [];
      const values = [];
      let idx = 1;

      if (title) { updateFields.push(`goals_name = $${idx++}`); values.push(title); }
      if (description) { updateFields.push(`goals_description = $${idx++}`); values.push(description); }
      if (subgoals) { updateFields.push(`subgoals = $${idx++}`); values.push(subgoals); }
      if (imageUrl) { updateFields.push(`goals_imageurl = $${idx++}`); values.push(imageUrl); }

      if (updateFields.length === 0) {
        return res.status(400).json({ message: 'Aucun champ à mettre à jour.' });
      }

      values.push(goalId);

      await pool.query(
        `UPDATE goals SET ${updateFields.join(', ')} WHERE id = $${values.length}`,
        values
      );

      res.json({ message: 'Objectif mis à jour.' });
    } catch (err) {
      console.error('Erreur lors de la mise à jour du goal:', err);
      res.status(500).json({ message: 'Erreur serveur.' });
    }
  });

  // Route protégée pour supprimer un goal
  router.delete('/delete/:goalId', authenticateToken, async (req, res) => {
    try {
      const { goalId } = req.params;
      const userId = req.user.id;

      // Vérifie que le goal existe et récupère les infos de la campagne
      const goalCheck = await pool.query(
        'SELECT campaign_id FROM goals WHERE id = $1',
        [goalId]
      );
      
      if (goalCheck.rows.length === 0) {
        return res.status(404).json({ message: 'Objectif non trouvé.' });
      }

      const goal = goalCheck.rows[0];

      // Vérifie l'accès à la campagne
      const accessCheck = await checkCampaignAccess(goal.campaign_id, userId);

      if (!accessCheck.hasAccess) {
        return res.status(403).json({ message: 'Non autorisé à supprimer cet objectif.' });
      }

      // Supprime le goal
      await pool.query('DELETE FROM goals WHERE id = $1', [goalId]);

      res.json({ message: 'Objectif supprimé.' });
    } catch (err) {
      console.error('Erreur lors de la suppression du goal:', err);
      res.status(500).json({ message: 'Erreur serveur.' });
    }
  });

  return router;
};