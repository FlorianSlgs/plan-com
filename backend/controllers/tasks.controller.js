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
      const { hasAccess, isReadOnly } = await this.tasksService.checkCampaignAccess(userId, campaignId);
      
      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied to this campaign' });
      }

      const tasks = await this.tasksService.getTasksByCampaign(campaignId);
      
      res.json({
        tasks,
        permissions: { isReadOnly }
      });
    } catch (error) {
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
      const { hasAccess, isReadOnly } = await this.tasksService.checkCampaignAccess(userId, campaignId);
      
      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied to this campaign' });
      }

      if (isReadOnly) {
        return res.status(403).json({ error: 'Read-only access: cannot create tasks' });
      }

      const taskData = {
        title,
        description,
        status,
        assignee,
        priority,
        userId,
        campaignId
      };

      const newTask = await this.tasksService.createTask(taskData);
      res.status(201).json(newTask);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  // Mettre à jour le statut d'une tâche
  updateTaskStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.id;
    
    try {
      const task = await this.tasksService.getTaskById(id);
      
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      const { hasAccess, isReadOnly } = await this.tasksService.checkCampaignAccess(userId, task.campaign_id);
      
      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied to this campaign' });
      }

      if (isReadOnly) {
        return res.status(403).json({ error: 'Read-only access: cannot update tasks' });
      }

      const updatedTask = await this.tasksService.updateTaskStatus(id, status);
      res.json(updatedTask);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  // Mettre à jour une tâche complète
  updateTask = async (req, res) => {
    const { id } = req.params;
    const { title, description, status, assignee, priority } = req.body;
    const userId = req.user.id;
    
    try {
      const task = await this.tasksService.getTaskById(id);
      
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      const { hasAccess, isReadOnly } = await this.tasksService.checkCampaignAccess(userId, task.campaign_id);
      
      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied to this campaign' });
      }

      if (isReadOnly) {
        return res.status(403).json({ error: 'Read-only access: cannot update tasks' });
      }

      const taskData = {
        title,
        description,
        status,
        assignee,
        priority
      };

      const updatedTask = await this.tasksService.updateTask(id, taskData);
      res.json(updatedTask);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  // Supprimer une tâche
  deleteTask = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    
    try {
      const task = await this.tasksService.getTaskById(id);
      
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      const { hasAccess, isReadOnly } = await this.tasksService.checkCampaignAccess(userId, task.campaign_id);
      
      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied to this campaign' });
      }

      if (isReadOnly) {
        return res.status(403).json({ error: 'Read-only access: cannot delete tasks' });
      }

      const result = await this.tasksService.deleteTask(id);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
}

module.exports = TasksController;