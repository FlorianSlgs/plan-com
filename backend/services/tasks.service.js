class TasksService {
  constructor(pool) {
    this.pool = pool;
  }

  // Vérifier l'accès à une campagne et retourner les permissions
  async checkCampaignAccess(userId, campaignId) {
    try {
      // Vérifier si l'utilisateur est propriétaire de la campagne
      const ownerCheck = await this.pool.query(
        'SELECT * FROM campaign WHERE id = $1 AND user_id = $2',
        [campaignId, userId]
      );
      
      if (ownerCheck.rows.length > 0) {
        return { hasAccess: true, isReadOnly: false };
      }

      // Vérifier si la campagne est partagée avec l'utilisateur
      const shareCheck = await this.pool.query(
        'SELECT read FROM share_campaigns WHERE campaign_id = $1 AND user_id = $2',
        [campaignId, userId]
      );
      
      if (shareCheck.rows.length > 0) {
        return { 
          hasAccess: true, 
          isReadOnly: shareCheck.rows[0].read === true 
        };
      }

      return { hasAccess: false, isReadOnly: false };
    } catch (error) {
      throw new Error(`Error checking campaign access: ${error.message}`);
    }
  }

  // Récupérer les tâches pour une campagne
  async getTasksByCampaign(campaignId) {
    try {
      const result = await this.pool.query(
        'SELECT * FROM tasks WHERE campaign_id = $1',
        [campaignId]
      );
      return result.rows;
    } catch (error) {
      throw new Error(`Error fetching tasks: ${error.message}`);
    }
  }

  // Récupérer une tâche par ID
  async getTaskById(taskId) {
    try {
      const result = await this.pool.query(
        'SELECT * FROM tasks WHERE id = $1',
        [taskId]
      );
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Error fetching task: ${error.message}`);
    }
  }

  // Créer une nouvelle tâche
  async createTask(taskData) {
    const { title, description, status, assignee, priority, userId, campaignId } = taskData;
    
    try {
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
  async updateTaskStatus(taskId, status) {
    try {
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
  async updateTask(taskId, taskData) {
    const { title, description, status, assignee, priority } = taskData;
    
    try {
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
  async deleteTask(taskId) {
    try {
      await this.pool.query('DELETE FROM tasks WHERE id = $1', [taskId]);
      return { message: 'Tâche supprimée' };
    } catch (error) {
      throw new Error(`Error deleting task: ${error.message}`);
    }
  }
}

module.exports = TasksService;