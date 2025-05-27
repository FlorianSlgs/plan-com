const express = require('express');
const router = express.Router();

module.exports = (pool) => {
  router.get('/user/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const result = await pool.query(
        'SELECT first_name, last_name FROM users WHERE id = $1',
        [id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Utilisateur non trouvé.' });
      }
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ message: 'Erreur serveur.' });
    }
  });

  router.post('/campaign', async (req, res) => {
    const { userId, name } = req.body;
    if (!userId || !name) {
      return res.status(400).json({ message: 'userId et nom de campagne requis.' });
    }
    try {
      await pool.query(
        'INSERT INTO campaign (user_id, name) VALUES ($1, $2)',
        [userId, name]
      );
      res.status(201).json({ message: 'Campagne créée.' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Erreur serveur.' });
    }
  });

  router.get('/campaigns/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
      const result = await pool.query(
        'SELECT id, name FROM campaign WHERE user_id = $1',
        [userId]
      );
      res.json(result.rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Erreur serveur.' });
    }
  });

  return router;
};