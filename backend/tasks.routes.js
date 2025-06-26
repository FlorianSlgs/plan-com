const express = require('express');
const authenticateToken = require('./middlewares/auth');

module.exports = function(pool) {
  const router = express.Router();

  // Appliquer le middleware d'authentification à toutes les routes
  router.use(authenticateToken);

  // Fonction pour vérifier l'accès à une campagne
  async function checkCampaignAccess(userId, campaignId) {
    // Vérifier si l'utilisateur est propriétaire de la campagne
    const ownerCheck = await pool.query(
      'SELECT * FROM campaign WHERE id = $1 AND user_id = $2',
      [campaignId, userId]
    );
    
    if (ownerCheck.rows.length > 0) {
      return true;
    }

    // Vérifier si la campagne est partagée avec l'utilisateur
    const shareCheck = await pool.query(
      'SELECT * FROM share_campaigns WHERE campaign_id = $1 AND user_id = $2',
      [campaignId, userId]
    );
    
    return shareCheck.rows.length > 0;
  }

  // Récupérer les tâches pour un user et une campagne par ID
  router.get('/', async (req, res) => {
    const { campaignId } = req.query;
    const userId = req.user.id; // Récupéré depuis le token JWT décodé
    
    if (!campaignId) {
      return res.status(400).json({ error: 'CampaignId parameter is required' });
    }

    try {
      const hasAccess = await checkCampaignAccess(userId, campaignId);
      
      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied to this campaign' });
      }

      const result = await pool.query(
        'SELECT * FROM tasks WHERE campaign_id = $1',
        [campaignId]
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
      const hasAccess = await checkCampaignAccess(userId, campaignId);
      
      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied to this campaign' });
      }

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
    const { status, campaignId } = req.body;
    const userId = req.user.id; // Récupéré depuis le token JWT décodé
    
    try {
      // Récupérer la tâche pour obtenir son campaign_id
      const taskResult = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
      
      if (taskResult.rows.length === 0) {
        return res.status(404).json({ error: 'Task not found' });
      }

      const task = taskResult.rows[0];
      const hasAccess = await checkCampaignAccess(userId, task.campaign_id);
      
      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied to this campaign' });
      }

      const result = await pool.query(
        `UPDATE tasks SET status = $1 WHERE id = $2 RETURNING *`,
        [status, id]
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
      // Récupérer la tâche pour obtenir son campaign_id
      const taskResult = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
      
      if (taskResult.rows.length === 0) {
        return res.status(404).json({ error: 'Task not found' });
      }

      const task = taskResult.rows[0];
      const hasAccess = await checkCampaignAccess(userId, task.campaign_id);
      
      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied to this campaign' });
      }

      const result = await pool.query(
        `UPDATE tasks SET title=$1, description=$2, status=$3, assignee=$4, priority=$5 
         WHERE id=$6 RETURNING *`,
        [title, description, status, assignee, priority, id]
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
      // Récupérer la tâche pour obtenir son campaign_id
      const taskResult = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
      
      if (taskResult.rows.length === 0) {
        return res.status(404).json({ error: 'Task not found' });
      }

      const task = taskResult.rows[0];
      const hasAccess = await checkCampaignAccess(userId, task.campaign_id);
      
      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied to this campaign' });
      }

      await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
      res.json({ message: 'Tâche supprimée' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};