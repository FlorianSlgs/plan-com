const express = require('express');
const router = express.Router();
const authenticateToken = require('./middlewares/auth'); // Utilise votre middleware existant

module.exports = (pool) => {
  // Route protégée pour récupérer les infos de l'utilisateur connecté
  router.get('/user', authenticateToken, async (req, res) => {
    try {
      const result = await pool.query(
        'SELECT first_name, last_name FROM users WHERE id = $1',
        [req.user.id] // Utilise l'ID depuis le token décodé
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Utilisateur non trouvé.' });
      }
      
      res.json(result.rows[0]);
    } catch (err) {
      console.error('Erreur lors de la récupération de l\'utilisateur:', err);
      res.status(500).json({ message: 'Erreur serveur.' });
    }
  });

  // Route protégée pour créer une campagne
  router.post('/campaign', authenticateToken, async (req, res) => {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Nom de campagne requis.' });
    }
    
    try {
      await pool.query(
        'INSERT INTO campaign (user_id, name) VALUES ($1, $2)',
        [req.user.id, name] // Utilise l'ID depuis le token décodé
      );
      res.status(201).json({ message: 'Campagne créée.' });
    } catch (err) {
      console.error('Erreur lors de la création de la campagne:', err);
      res.status(500).json({ message: 'Erreur serveur.' });
    }
  });

  // Route protégée pour récupérer les campagnes de l'utilisateur connecté
  router.get('/campaigns', authenticateToken, async (req, res) => {
    try {
      const result = await pool.query(
        'SELECT id, name FROM campaign WHERE user_id = $1 ORDER BY name',
        [req.user.id] // Utilise l'ID depuis le token décodé
      );
      res.json(result.rows);
    } catch (err) {
      console.error('Erreur lors de la récupération des campagnes:', err);
      res.status(500).json({ message: 'Erreur serveur.' });
    }
  });

  return router;
};