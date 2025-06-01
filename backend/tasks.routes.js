const express = require('express');

module.exports = function(pool) {
  const router = express.Router();

  // Récupérer les tâches pour un user et une campagne
  router.get('/', async (req, res) => {
    const { userId, campaign } = req.query;
    try {
      const result = await pool.query(
        'SELECT * FROM tasks WHERE "userId" = $1 AND currentcampaign = $2',
        [userId, campaign]
      );
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Ajouter une tâche
  router.post('/', async (req, res) => {
    const { title, description, status, assignee, priority, userId, campaign } = req.body;
    try {
        const result = await pool.query(
        `INSERT INTO tasks (id, title, description, status, assignee, priority, "userId", currentcampaign)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [title, description, status, assignee, priority, userId, campaign]
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
    try {
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
    try {
      const result = await pool.query(
        `UPDATE tasks SET title=$1, description=$2, status=$3, assignee=$4, priority=$5 WHERE id=$6 RETURNING *`,
        [title, description, status, assignee, priority, id]
      );
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};