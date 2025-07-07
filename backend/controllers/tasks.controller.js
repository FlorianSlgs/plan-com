const TasksService = require('../services/tasks.service');

class TasksController {
  constructor(pool) {
    this.tasksService = new TasksService(pool);
  }

  // Récupérer les tâches pour un user et une campagne par ID
  getTasks = async (req, res) => {
    const { campaignId } = req.query;
    const userId = req.user.id;
    
    if (!campaignId) {
      return res.status(400).json({ error: 'CampaignId parameter is required' });
    }

    try {
      const result = await this.tasksService.getTasksByCampaign(userId, campaignId);
      res.json(result);
    } catch (error) {
      if (error.message.includes('CAMPAIGN_NOT_FOUND')) {
        return res.status(403).json({ error: 'Access denied to this campaign' });
      }
      res.status(500).json({ error: error.message });
    }
  };

  // Ajouter une tâche
  createTask = async (req, res) => {
    const { title, description, status, assignee, priority, campaignId } = req.body;
    const userId = req.user.id;
    
    if (!campaignId) {
      return res.status(400).json({ error: 'CampaignId is required' });
    }

    try {
      const taskData = {
        title,
        description,
        status,
        assignee,
        priority,
        campaignId
      };

      const newTask = await this.tasksService.createTask(userId, taskData);
      res.status(201).json(newTask);
    } catch (error) {
      if (error.message.includes('CAMPAIGN_NOT_FOUND')) {
        return res.status(403).json({ error: 'Access denied to this campaign' });
      }
      if (error.message.includes('READ_ONLY_ACCESS')) {
        return res.status(403).json({ error: 'Read-only access: cannot create tasks' });
      }
      res.status(500).json({ error: error.message });
    }
  };

  // Mettre à jour le statut d'une tâche
  updateTaskStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.id;
    
    try {
      const updatedTask = await this.tasksService.updateTaskStatus(userId, id, status);
      res.json(updatedTask);
    } catch (error) {
      if (error.message.includes('Task not found')) {
        return res.status(404).json({ error: 'Task not found' });
      }
      if (error.message.includes('CAMPAIGN_NOT_FOUND')) {
        return res.status(403).json({ error: 'Access denied to this campaign' });
      }
      if (error.message.includes('READ_ONLY_ACCESS')) {
        return res.status(403).json({ error: 'Read-only access: cannot update tasks' });
      }
      res.status(500).json({ error: error.message });
    }
  };

  // Mettre à jour une tâche complète
  updateTask = async (req, res) => {
    const { id } = req.params;
    const { title, description, status, assignee, priority } = req.body;
    const userId = req.user.id;
    
    try {
      const taskData = {
        title,
        description,
        status,
        assignee,
        priority
      };

      const updatedTask = await this.tasksService.updateTask(userId, id, taskData);
      res.json(updatedTask);
    } catch (error) {
      if (error.message.includes('Task not found')) {
        return res.status(404).json({ error: 'Task not found' });
      }
      if (error.message.includes('CAMPAIGN_NOT_FOUND')) {
        return res.status(403).json({ error: 'Access denied to this campaign' });
      }
      if (error.message.includes('READ_ONLY_ACCESS')) {
        return res.status(403).json({ error: 'Read-only access: cannot update tasks' });
      }
      res.status(500).json({ error: error.message });
    }
  };

  // Supprimer une tâche
  deleteTask = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    
    try {
      const result = await this.tasksService.deleteTask(userId, id);
      res.json(result);
    } catch (error) {
      if (error.message.includes('Task not found')) {
        return res.status(404).json({ error: 'Task not found' });
      }
      if (error.message.includes('CAMPAIGN_NOT_FOUND')) {
        return res.status(403).json({ error: 'Access denied to this campaign' });
      }
      if (error.message.includes('READ_ONLY_ACCESS')) {
        return res.status(403).json({ error: 'Read-only access: cannot delete tasks' });
      }
      res.status(500).json({ error: error.message });
    }
  };
}

module.exports = TasksController;