const express = require('express');
const router = express.Router();
const authenticateToken = require('./middlewares/auth');

// pool doit être passé lors de l'importation de la route dans index.js
module.exports = (pool) => {
  // Récupérer tous les événements (route protégée)
  router.get('/', authenticateToken, async (req, res) => {
    try {
      // userId récupéré depuis le token JWT décodé par le middleware
      const userId = req.user.id;
      const { currentCampaignId } = req.query;
      
      let query = `
        SELECT 
          id, 
          title, 
          event_date AS date, 
          start_time AS "startTime", 
          campaign_id AS "campaignId", 
          user_id AS "userId"
        FROM actions
        WHERE user_id = $1
      `;
      const params = [userId];
      
      if (currentCampaignId) {
        params.push(currentCampaignId);
        query += ` AND campaign_id = $${params.length}`;
      }
      query += ' ORDER BY event_date ASC';

      const result = await pool.query(query, params);
      const events = result.rows.map(e => ({
        ...e,
        date: e.date ? new Date(e.date).toISOString() : null
      }));
      res.json(events);
    } catch (error) {
      console.error('Erreur lors de la récupération des événements :', error);
      res.status(500).json({ error: 'Erreur serveur lors de la récupération des événements' });
    }
  });

  // Ajouter un événement (route protégée)
  router.post('/', authenticateToken, async (req, res) => {
    try {
      // userId récupéré depuis le token JWT décodé par le middleware
      const userId = req.user.id;
      const { id, title, date, startTime, campaignId } = req.body;
      
      const result = await pool.query(
        `INSERT INTO actions (id, title, event_date, start_time, campaign_id, user_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, title, event_date AS date, start_time AS "startTime", campaign_id AS "campaignId", user_id AS "userId"`,
        [
          id,
          title,
          date, // ISO string, PostgreSQL gère le format
          startTime || null,
          campaignId || null,
          userId // Utilise l'userId du token JWT
        ]
      );
      
      // Conversion de la date en ISO pour le frontend
      const savedEvent = result.rows[0];
      if (savedEvent && savedEvent.date) {
        savedEvent.date = new Date(savedEvent.date).toISOString();
      }
      res.status(201).json(savedEvent);
    } catch (error) {
      console.error('Erreur lors de l\'ajout de l\'événement :', error);
      res.status(500).json({ error: 'Erreur serveur lors de l\'ajout de l\'événement' });
    }
  });

  // Modifier un événement (route protégée)
  router.put('/:id', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      // userId récupéré depuis le token JWT décodé par le middleware
      const userId = req.user.id;
      const { title, date, startTime, campaignId } = req.body;

      // Vérifier que l'événement appartient à l'utilisateur connecté
      const ownershipCheck = await pool.query(
        'SELECT user_id FROM actions WHERE id = $1',
        [id]
      );
      
      if (ownershipCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Événement non trouvé' });
      }
      
      if (ownershipCheck.rows[0].user_id !== userId) {
        return res.status(403).json({ error: 'Accès non autorisé à cet événement' });
      }

      const result = await pool.query(
        `UPDATE actions
        SET title = $1,
            event_date = $2,
            start_time = $3,
            campaign_id = $4,
            user_id = $5
        WHERE id = $6
        RETURNING id, title, event_date AS date, start_time AS "startTime", campaign_id AS "campaignId", user_id AS "userId"`,
        [
          title,
          date,
          startTime || null,
          campaignId || null,
          userId, // S'assurer que l'userId reste correct
          id
        ]
      );
      
      const updatedEvent = result.rows[0];
      if (updatedEvent && updatedEvent.date) {
        updatedEvent.date = new Date(updatedEvent.date).toISOString();
      }
      res.json(updatedEvent);
    } catch (error) {
      console.error('Erreur lors de la modification de l\'événement :', error);
      res.status(500).json({ error: 'Erreur serveur lors de la modification de l\'événement' });
    }
  });

  // Supprimer un événement (route protégée)
  router.delete('/:id', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      // userId récupéré depuis le token JWT décodé par le middleware
      const userId = req.user.id;

      // Vérifier que l'événement appartient à l'utilisateur connecté
      const ownershipCheck = await pool.query(
        'SELECT user_id FROM actions WHERE id = $1',
        [id]
      );
      
      if (ownershipCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Événement non trouvé' });
      }
      
      if (ownershipCheck.rows[0].user_id !== userId) {
        return res.status(403).json({ error: 'Accès non autorisé à cet événement' });
      }

      await pool.query('DELETE FROM actions WHERE id = $1', [id]);
      res.json({ message: 'Événement supprimé' });
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'événement :', error);
      res.status(500).json({ error: 'Erreur serveur lors de la suppression de l\'événement' });
    }
  });

  return router;
};