const express = require('express');
const authenticateToken = require('../middlewares/auth');
const TasksController = require('../controllers/tasks.controller');

module.exports = function(pool) {
  const router = express.Router();
  const tasksController = new TasksController(pool);

  // Appliquer le middleware d'authentification à toutes les routes
  router.use(authenticateToken);

  // Routes
  router.get('/', tasksController.getTasks);
  router.post('/', tasksController.createTask);
  router.patch('/:id', tasksController.updateTaskStatus);
  router.put('/:id', tasksController.updateTask);
  router.delete('/:id', tasksController.deleteTask);

  return router;
};