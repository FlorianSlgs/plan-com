const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const authenticateToken = require('./middlewares/auth'); // Utilise votre middleware d'auth

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
  // Route protégée pour créer un goal
  router.post('/upload-image', authenticateToken, upload.single('image'), async (req, res) => {
    try {
      const filePath = req.file ? req.file.filename : null;
      const { campaignName, title, description, subgoals } = req.body;
      const userId = req.user.id; // Récupéré depuis le token JWT
      
      if (!filePath || !campaignName || !title) {
        return res.status(400).json({ message: 'Champs requis manquants.' });
      }

      // Récupère l'id de la campagne à partir de son nom et de l'utilisateur connecté
      const campaignResult = await pool.query(
        'SELECT id FROM campaign WHERE name = $1 AND user_id = $2 LIMIT 1',
        [campaignName, userId]
      );
      
      if (campaignResult.rows.length === 0) {
        return res.status(404).json({ message: 'Campagne non trouvée.' });
      }
      
      const campaignId = campaignResult.rows[0].id;

      await pool.query(
        `INSERT INTO goals (user_id, currentCampaign, goals_name, goals_description, subgoals, goals_imageurl)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, campaignId, title, description, subgoals, filePath]
      );

      res.status(201).json({ message: 'Objectif enregistré.', filePath });
    } catch (err) {
      console.error('Erreur lors de la création du goal:', err);
      res.status(500).json({ message: 'Erreur serveur.' });
    }
  });

  // Route protégée pour récupérer les goals d'une campagne
  router.get('/campaign/:campaignName', authenticateToken, async (req, res) => {
    const { campaignName } = req.params;
    const userId = req.user.id; // Récupéré depuis le token JWT
    
    try {
      // Récupère l'id de la campagne à partir de son nom et de l'utilisateur connecté
      const campaignResult = await pool.query(
        'SELECT id FROM campaign WHERE name = $1 AND user_id = $2 LIMIT 1',
        [campaignName, userId]
      );
      
      if (campaignResult.rows.length === 0) {
        return res.json([]); // Pas de campagne trouvée, retourne un tableau vide
      }
      
      const campaignId = campaignResult.rows[0].id;

      // Récupère les goals pour cet utilisateur ET cette campagne
      const result = await pool.query(
        `SELECT id, goals_name, goals_description, subgoals, goals_imageurl
         FROM goals WHERE user_id = $1 AND currentCampaign = $2
         ORDER BY goals_name`,
        [userId, campaignId]
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
      const userId = req.user.id; // Récupéré depuis le token JWT
      let imageUrl = null;

      if (req.file) {
        imageUrl = req.file.filename;
      }

      // Vérifie que le goal appartient bien à l'utilisateur connecté
      const goalCheck = await pool.query(
        'SELECT id FROM goals WHERE id = $1 AND user_id = $2',
        [goalId, userId]
      );
      
      if (goalCheck.rows.length === 0) {
        return res.status(404).json({ message: 'Objectif non trouvé ou non autorisé.' });
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
      values.push(userId);

      await pool.query(
        `UPDATE goals SET ${updateFields.join(', ')} 
         WHERE id = $${values.length - 1} AND user_id = $${values.length}`,
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
      const userId = req.user.id; // Récupéré depuis le token JWT

      // Vérifie que le goal appartient bien à l'utilisateur connecté et le supprime
      const result = await pool.query(
        'DELETE FROM goals WHERE id = $1 AND user_id = $2',
        [goalId, userId]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ message: 'Objectif non trouvé ou non autorisé.' });
      }

      res.json({ message: 'Objectif supprimé.' });
    } catch (err) {
      console.error('Erreur lors de la suppression du goal:', err);
      res.status(500).json({ message: 'Erreur serveur.' });
    }
  });

  return router;
};