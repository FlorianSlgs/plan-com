const express = require('express');
const router = express.Router();
const authenticateToken = require('../middlewares/auth');
const ActionsController = require('../controllers/actions.controller');

// pool doit être passé lors de l'importation de la route dans index.js
module.exports = (pool) => {
  const actionsController = new ActionsController(pool);

  // Nouvelle route pour récupérer les événements avec les permissions
  router.get('/with-access', authenticateToken, (req, res) => {
    actionsController.getEventsWithAccess(req, res);
  });

  // Récupérer tous les événements (route protégée) - conservée pour compatibilité
  router.get('/', authenticateToken, (req, res) => {
    actionsController.getEvents(req, res);
  });

  // Ajouter un événement (route protégée)
  router.post('/', authenticateToken, (req, res) => {
    actionsController.createEvent(req, res);
  });

  // Modifier un événement (route protégée)
  router.put('/:id', authenticateToken, (req, res) => {
    actionsController.updateEvent(req, res);
  });

  // Supprimer un événement (route protégée)
  router.delete('/:id', authenticateToken, (req, res) => {
    actionsController.deleteEvent(req, res);
  });

  return router;
};