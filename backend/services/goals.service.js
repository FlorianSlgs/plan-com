/**
 * Service pour la gestion des objectifs (goals)
 * Contient toute la logique métier et les interactions avec la base de données
 */

class GoalsService {
  constructor(pool) {
    this.pool = pool;
    // Déterminer l'URL de base selon l'environnement
    this.baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://plancom.duckdns.org'
      : 'http://localhost:3000';
  }

  /**
   * Construit l'URL complète pour une image
   * @param {string} filename - Nom du fichier image
   * @returns {string|null} - URL complète ou null
   */
  buildImageUrl(filename) {
    return filename ? `${this.baseUrl}/uploads/goals_images/${filename}` : null;
  }

  /**
   * Vérifie l'accès à une campagne pour un utilisateur
   * @param {number} campaignId - ID de la campagne
   * @param {number} userId - ID de l'utilisateur
   * @returns {Object} - Objet avec hasAccess, isOwner, isReadOnly
   */
  async checkCampaignAccess(campaignId, userId) {
    try {
      // Vérifie d'abord si l'utilisateur est propriétaire de la campagne
      const ownerCheck = await this.pool.query(
        'SELECT id FROM campaign WHERE id = $1 AND user_id = $2',
        [campaignId, userId]
      );

      if (ownerCheck.rows.length > 0) {
        return { hasAccess: true, isOwner: true, isReadOnly: false };
      }

      // Si pas propriétaire, vérifie dans share_campaigns
      const shareCheck = await this.pool.query(
        'SELECT id, read FROM share_campaigns WHERE campaign_id = $1 AND user_id = $2',
        [campaignId, userId]
      );

      if (shareCheck.rows.length > 0) {
        const shareData = shareCheck.rows[0];
        return { 
          hasAccess: true, 
          isOwner: false,
          isReadOnly: shareData.read === true
        };
      }

      return { hasAccess: false, isOwner: false, isReadOnly: true };
    } catch (error) {
      console.error('Erreur lors de la vérification d\'accès:', error);
      throw error;
    }
  }

  /**
   * Crée un nouvel objectif
   * @param {Object} goalData - Données de l'objectif
   * @returns {Object} - Résultat de la création
   */
  async createGoal(goalData) {
    const { userId, campaignId, title, description, subgoals, filePath } = goalData;
    
    try {
      // Vérifie l'accès à la campagne
      const accessCheck = await this.checkCampaignAccess(campaignId, userId);
      
      if (!accessCheck.hasAccess) {
        throw new Error('CAMPAIGN_NOT_FOUND');
      }

      if (accessCheck.isReadOnly) {
        throw new Error('READ_ONLY_ACCESS');
      }

      // Insère le goal
      await this.pool.query(
        `INSERT INTO goals (user_id, campaign_id, goals_name, goals_description, subgoals, goals_imageurl)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, campaignId, title, description, subgoals, filePath]
      );

      return { 
        success: true, 
        filePath: this.buildImageUrl(filePath)
      };
    } catch (error) {
      console.error('Erreur lors de la création du goal:', error);
      throw error;
    }
  }

  /**
   * Récupère les objectifs d'une campagne par ID
   * @param {number} campaignId - ID de la campagne
   * @param {number} userId - ID de l'utilisateur
   * @returns {Array} - Liste des objectifs
   */
  async getGoalsByCampaignId(campaignId, userId) {
    try {
      // Vérifie l'accès à la campagne
      const accessCheck = await this.checkCampaignAccess(campaignId, userId);
      
      if (!accessCheck.hasAccess) {
        return [];
      }

      // Récupère tous les goals de cette campagne
      const result = await this.pool.query(
        `SELECT id, goals_name, goals_description, subgoals, goals_imageurl, campaign_id
         FROM goals WHERE campaign_id = $1
         ORDER BY goals_name`,
        [campaignId]
      );
      
      // Transforme les résultats pour inclure les URLs complètes
      return result.rows.map(goal => ({
        ...goal,
        goals_imageurl: this.buildImageUrl(goal.goals_imageurl)
      }));
    } catch (error) {
      console.error('Erreur lors de la récupération des goals:', error);
      throw error;
    }
  }

  /**
   * Récupère les objectifs d'une campagne par nom
   * @param {string} campaignName - Nom de la campagne
   * @param {number} userId - ID de l'utilisateur
   * @returns {Array} - Liste des objectifs
   */
  async getGoalsByCampaignName(campaignName, userId) {
    try {
      // Récupère l'ID de la campagne à partir du nom
      const campaignResult = await this.pool.query(
        'SELECT id FROM campaign WHERE name = $1',
        [campaignName]
      );
      
      if (campaignResult.rows.length === 0) {
        return [];
      }

      const campaignId = campaignResult.rows[0].id;
      return await this.getGoalsByCampaignId(campaignId, userId);
    } catch (error) {
      console.error('Erreur lors de la récupération des goals par nom:', error);
      throw error;
    }
  }

  /**
   * Met à jour un objectif
   * @param {number} goalId - ID de l'objectif
   * @param {Object} updateData - Données à mettre à jour
   * @param {number} userId - ID de l'utilisateur
   * @returns {Object} - Résultat de la mise à jour
   */
  async updateGoal(goalId, updateData, userId) {
    const { title, description, subgoals, imageUrl } = updateData;
    
    try {
      // Vérifie que le goal existe
      const goalCheck = await this.pool.query(
        'SELECT campaign_id FROM goals WHERE id = $1',
        [goalId]
      );
      
      if (goalCheck.rows.length === 0) {
        throw new Error('GOAL_NOT_FOUND');
      }

      const goal = goalCheck.rows[0];

      // Vérifie l'accès à la campagne
      const accessCheck = await this.checkCampaignAccess(goal.campaign_id, userId);

      if (!accessCheck.hasAccess) {
        throw new Error('UNAUTHORIZED');
      }

      if (accessCheck.isReadOnly) {
        throw new Error('READ_ONLY_ACCESS');
      }

      // Prépare les champs à mettre à jour
      const updateFields = [];
      const values = [];
      let idx = 1;

      if (title) { updateFields.push(`goals_name = $${idx++}`); values.push(title); }
      if (description) { updateFields.push(`goals_description = $${idx++}`); values.push(description); }
      if (subgoals) { updateFields.push(`subgoals = $${idx++}`); values.push(subgoals); }
      if (imageUrl) { updateFields.push(`goals_imageurl = $${idx++}`); values.push(imageUrl); }

      if (updateFields.length === 0) {
        throw new Error('NO_FIELDS_TO_UPDATE');
      }

      values.push(goalId);

      await this.pool.query(
        `UPDATE goals SET ${updateFields.join(', ')} WHERE id = $${values.length}`,
        values
      );

      return { 
        success: true,
        imageUrl: imageUrl ? this.buildImageUrl(imageUrl) : null
      };
    } catch (error) {
      console.error('Erreur lors de la mise à jour du goal:', error);
      throw error;
    }
  }

  /**
   * Supprime un objectif
   * @param {number} goalId - ID de l'objectif
   * @param {number} userId - ID de l'utilisateur
   * @returns {Object} - Résultat de la suppression
   */
  async deleteGoal(goalId, userId) {
    try {
      // Vérifie que le goal existe
      const goalCheck = await this.pool.query(
        'SELECT campaign_id FROM goals WHERE id = $1',
        [goalId]
      );
      
      if (goalCheck.rows.length === 0) {
        throw new Error('GOAL_NOT_FOUND');
      }

      const goal = goalCheck.rows[0];

      // Vérifie l'accès à la campagne
      const accessCheck = await this.checkCampaignAccess(goal.campaign_id, userId);

      if (!accessCheck.hasAccess) {
        throw new Error('UNAUTHORIZED');
      }

      if (accessCheck.isReadOnly) {
        throw new Error('READ_ONLY_ACCESS');
      }

      // Supprime le goal
      await this.pool.query('DELETE FROM goals WHERE id = $1', [goalId]);

      return { success: true };
    } catch (error) {
      console.error('Erreur lors de la suppression du goal:', error);
      throw error;
    }
  }

  /**
   * Récupère les permissions d'un utilisateur sur une campagne
   * @param {number} campaignId - ID de la campagne
   * @param {number} userId - ID de l'utilisateur
   * @returns {Object} - Permissions de l'utilisateur
   */
  async getCampaignPermissions(campaignId, userId) {
    try {
      return await this.checkCampaignAccess(campaignId, userId);
    } catch (error) {
      console.error('Erreur lors de la récupération des permissions:', error);
      throw error;
    }
  }
}

module.exports = GoalsService;