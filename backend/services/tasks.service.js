const CampaignAccessService = require('./campaignAccess.service');

class TasksService {
  constructor(pool) {
    this.pool = pool;
    this.campaignAccessService = new CampaignAccessService(pool);
  }

  // Récupérer les tâches pour une campagne avec vérification d'accès
  async getTasksByCampaign(userId, campaignId) {
    try {
      // Vérifier l'accès à la campagne
      const access = await this.campaignAccessService.getCampaignAccess(userId, campaignId);
      
      if (!access.hasAccess) {
        throw new Error('CAMPAIGN_NOT_FOUND');
      }

      const result = await this.pool.query(
        'SELECT * FROM tasks WHERE campaign_id = $1',
        [campaignId]
      );

      return {
        tasks: result.rows,
        permissions: {
          isReadOnly: access.isReadOnly,
          isOwner: access.isOwner
        }
      };
    } catch (error) {
      throw new Error(`Error fetching tasks: ${error.message}`);
    }
  }

  // Récupérer une tâche par ID avec vérification d'accès
  async getTaskById(userId, taskId) {
    try {
      const result = await this.pool.query(
        'SELECT * FROM tasks WHERE id = $1',
        [taskId]
      );

      const task = result.rows[0];
      if (!task) {
        return null;
      }

      // Vérifier l'accès à la campagne de la tâche
      const access = await this.campaignAccessService.getCampaignAccess(userId, task.campaign_id);
      
      if (!access.hasAccess) {
        throw new Error('CAMPAIGN_NOT_FOUND');
      }

      return {
        task,
        permissions: {
          isReadOnly: access.isReadOnly,
          isOwner: access.isOwner
        }
      };
    } catch (error) {
      throw new Error(`Error fetching task: ${error.message}`);
    }
  }

  // Créer une nouvelle tâche
  async createTask(userId, taskData) {
    const { title, description, status, assignee, priority, campaignId } = taskData;
    
    try {
      // Vérifier l'accès en écriture à la campagne
      await this.campaignAccessService.validateCampaignAccess(userId, campaignId, true);

      const result = await this.pool.query(
        `INSERT INTO tasks (id, title, description, status, assignee, priority, "user_id", campaign_id)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [title, description, status, assignee, priority, userId, campaignId]
      );
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error creating task: ${error.message}`);
    }
  }

  // Mettre à jour le statut d'une tâche
  async updateTaskStatus(userId, taskId, status) {
    try {
      // Récupérer la tâche pour obtenir son campaign_id
      const taskResult = await this.pool.query(
        'SELECT campaign_id FROM tasks WHERE id = $1',
        [taskId]
      );

      if (taskResult.rows.length === 0) {
        throw new Error('Task not found');
      }

      const task = taskResult.rows[0];
      
      // Vérifier l'accès en écriture à la campagne
      await this.campaignAccessService.validateCampaignAccess(userId, task.campaign_id, true);

      const result = await this.pool.query(
        'UPDATE tasks SET status = $1 WHERE id = $2 RETURNING *',
        [status, taskId]
      );
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error updating task status: ${error.message}`);
    }
  }

  // Mettre à jour une tâche complète
  async updateTask(userId, taskId, taskData) {
    const { title, description, status, assignee, priority } = taskData;
    
    try {
      // Récupérer la tâche pour obtenir son campaign_id
      const taskResult = await this.pool.query(
        'SELECT campaign_id FROM tasks WHERE id = $1',
        [taskId]
      );

      if (taskResult.rows.length === 0) {
        throw new Error('Task not found');
      }

      const task = taskResult.rows[0];
      
      // Vérifier l'accès en écriture à la campagne
      await this.campaignAccessService.validateCampaignAccess(userId, task.campaign_id, true);

      const result = await this.pool.query(
        `UPDATE tasks SET title=$1, description=$2, status=$3, assignee=$4, priority=$5 
         WHERE id=$6 RETURNING *`,
        [title, description, status, assignee, priority, taskId]
      );
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error updating task: ${error.message}`);
    }
  }

  // Supprimer une tâche
  async deleteTask(userId, taskId) {
    try {
      // Récupérer la tâche pour obtenir son campaign_id
      const taskResult = await this.pool.query(
        'SELECT campaign_id FROM tasks WHERE id = $1',
        [taskId]
      );

      if (taskResult.rows.length === 0) {
        throw new Error('Task not found');
      }

      const task = taskResult.rows[0];
      
      // Vérifier l'accès en écriture à la campagne
      await this.campaignAccessService.validateCampaignAccess(userId, task.campaign_id, true);

      await this.pool.query('DELETE FROM tasks WHERE id = $1', [taskId]);
      return { message: 'Tâche supprimée' };
    } catch (error) {
      throw new Error(`Error deleting task: ${error.message}`);
    }
  }

  // Méthodes utilitaires pour maintenir la compatibilité (optionnel)
  
  // Ancienne méthode pour vérification d'accès (deprecated)
  async checkCampaignAccess(userId, campaignId) {
    const access = await this.campaignAccessService.getCampaignAccess(userId, campaignId);
    return {
      hasAccess: access.hasAccess,
      isReadOnly: access.isReadOnly
    };
  }
}

module.exports = TasksService;