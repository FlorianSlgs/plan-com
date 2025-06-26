const express = require('express');
const authenticateToken = require('./middlewares/auth');

module.exports = function(pool) {
  const router = express.Router();

  // Appliquer le middleware d'authentification à toutes les routes
  router.use(authenticateToken);

  // Récupérer les tâches pour un user et une campagne par ID
  router.get('/', async (req, res) => {
    const { campaignId } = req.query;
    const userId = req.user.id; // Récupéré depuis le token JWT décodé
    
    if (!campaignId) {
      return res.status(400).json({ error: 'CampaignId parameter is required' });
    }

    try {
      const result = await pool.query(
        'SELECT * FROM tasks WHERE "user_id" = $1 AND campaign_id = $2',
        [userId, campaignId]
      );
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Ajouter une tâche
  router.post('/', async (req, res) => {
    const { title, description, status, assignee, priority, campaignId } = req.body;
    const userId = req.user.id; // Récupéré depuis le token JWT décodé
    
    if (!campaignId) {
      return res.status(400).json({ error: 'CampaignId is required' });
    }

    try {
        const result = await pool.query(
        `INSERT INTO tasks (id, title, description, status, assignee, priority, "user_id", campaign_id)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [title, description, status, assignee, priority, userId, campaignId]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
  });

  // Mettre à jour le statut d'une tâche
  router.patch('/:id', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.id; // Récupéré depuis le token JWT décodé
    
    try {
      // Vérifier que la tâche appartient bien à l'utilisateur authentifié
      const taskCheck = await pool.query(
        'SELECT * FROM tasks WHERE id = $1 AND "user_id" = $2',
        [id, userId]
      );
      
      if (taskCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Task not found or access denied' });
      }

      const result = await pool.query(
        `UPDATE tasks SET status = $1 WHERE id = $2 AND "user_id" = $3 RETURNING *`,
        [status, id, userId]
      );
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Mettre à jour une tâche complète
  router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { title, description, status, assignee, priority } = req.body;
    const userId = req.user.id; // Récupéré depuis le token JWT décodé
    
    try {
      // Vérifier que la tâche appartient bien à l'utilisateur authentifié
      const taskCheck = await pool.query(
        'SELECT * FROM tasks WHERE id = $1 AND "user_id" = $2',
        [id, userId]
      );
      
      if (taskCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Task not found or access denied' });
      }

      const result = await pool.query(
        `UPDATE tasks SET title=$1, description=$2, status=$3, assignee=$4, priority=$5 
         WHERE id=$6 AND "user_id"=$7 RETURNING *`,
        [title, description, status, assignee, priority, id, userId]
      );
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Supprimer une tâche
  router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id; // Récupéré depuis le token JWT décodé
    
    try {
      // Vérifier que la tâche appartient bien à l'utilisateur authentifié
      const taskCheck = await pool.query(
        'SELECT * FROM tasks WHERE id = $1 AND "user_id" = $2',
        [id, userId]
      );
      
      if (taskCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Task not found or access denied' });
      }

      await pool.query('DELETE FROM tasks WHERE id = $1 AND "user_id" = $2', [id, userId]);
      res.json({ message: 'Tâche supprimée' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};