const express = require('express');
const router = express.Router();

// pool doit être passé lors de l'importation de la route dans index.js
module.exports = (pool) => {
  // Récupérer tous les événements
  router.get('/', async (req, res) => {
    try {
      const { userId, currentCampaign } = req.query;
      let query = `
        SELECT 
          id, 
          title, 
          event_date AS date, 
          start_time AS "startTime", 
          currentcampaign AS "currentCampaign", 
          user_id AS "userId"
        FROM actions
        WHERE 1=1
      `;
      const params = [];
      if (userId) {
        params.push(userId);
        query += ` AND user_id = $${params.length}`;
      }
      if (currentCampaign) {
        params.push(currentCampaign);
        query += ` AND currentcampaign = $${params.length}`;
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

  // Ajouter un événement
  router.post('/', async (req, res) => {
    try {
      const { id, title, date, startTime, currentCampaign, userId } = req.body;
      const result = await pool.query(
        `INSERT INTO actions (id, title, event_date, start_time, currentcampaign, user_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, title, event_date AS date, start_time AS "startTime", currentcampaign AS "currentCampaign", user_id AS "userId"`,
        [
          id,
          title,
          date, // ISO string, PostgreSQL gère le format
          startTime || null,
          currentCampaign || null,
          userId || null
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

  // Modifier un événement
  router.put('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { title, date, startTime, currentCampaign, userId } = req.body;

      const result = await pool.query(
        `UPDATE actions
        SET title = $1,
            event_date = $2,
            start_time = $3,
            currentcampaign = $4,
            user_id = $5
        WHERE id = $6
        RETURNING id, title, event_date AS date, start_time AS "startTime", currentcampaign AS "currentCampaign", user_id AS "userId"`,
        [
          title,
          date,
          startTime || null,
          currentCampaign || null,
          userId || null,
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

  // Supprimer un événement
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await pool.query('DELETE FROM actions WHERE id = $1', [id]);
      res.json({ message: 'Événement supprimé' });
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'événement :', error);
      res.status(500).json({ error: 'Erreur serveur lors de la suppression de l\'événement' });
    }
  });

  return router;
};