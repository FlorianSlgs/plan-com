/**
 * Service pour la gestion des objectifs (targets)
 * Contient toute la logique métier et les interactions avec la base de données
 */

class TargetsService {
  constructor(pool) {
    this.pool = pool;
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
   * @param {Object} targetData - Données de l'objectif
   * @returns {Object} - Résultat de la création
   */
  async createTarget(targetData) {
    const { userId, campaignId, title, description, subtargets, filePath } = targetData;
    
    try {
      // Vérifie l'accès à la campagne
      const accessCheck = await this.checkCampaignAccess(campaignId, userId);
      
      if (!accessCheck.hasAccess) {
        throw new Error('CAMPAIGN_NOT_FOUND');
      }

      if (accessCheck.isReadOnly) {
        throw new Error('READ_ONLY_ACCESS');
      }

      // Insère le target
      await this.pool.query(
        `INSERT INTO targets (user_id, campaign_id, targets_name, targets_description, subtargets, targets_imageurl)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, campaignId, title, description, subtargets, filePath]
      );

      return { success: true, filePath };
    } catch (error) {
      console.error('Erreur lors de la création du target:', error);
      throw error;
    }
  }

  /**
   * Récupère les objectifs d'une campagne par ID
   * @param {number} campaignId - ID de la campagne
   * @param {number} userId - ID de l'utilisateur
   * @returns {Array} - Liste des objectifs
   */
  async getTargetsByCampaignId(campaignId, userId) {
    try {
      // Vérifie l'accès à la campagne
      const accessCheck = await this.checkCampaignAccess(campaignId, userId);
      
      if (!accessCheck.hasAccess) {
        return [];
      }

      // Récupère tous les targets de cette campagne
      const result = await this.pool.query(
        `SELECT id, targets_name, targets_description, subtargets, targets_imageurl, campaign_id
         FROM targets WHERE campaign_id = $1
         ORDER BY targets_name`,
        [campaignId]
      );
      
      return result.rows;
    } catch (error) {
      console.error('Erreur lors de la récupération des targets:', error);
      throw error;
    }
  }

  /**
   * Récupère les objectifs d'une campagne par nom
   * @param {string} campaignName - Nom de la campagne
   * @param {number} userId - ID de l'utilisateur
   * @returns {Array} - Liste des objectifs
   */
  async getTargetsByCampaignName(campaignName, userId) {
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
      return await this.getTargetsByCampaignId(campaignId, userId);
    } catch (error) {
      console.error('Erreur lors de la récupération des targets par nom:', error);
      throw error;
    }
  }

  /**
   * Met à jour un objectif
   * @param {number} targetId - ID de l'objectif
   * @param {Object} updateData - Données à mettre à jour
   * @param {number} userId - ID de l'utilisateur
   * @returns {Object} - Résultat de la mise à jour
   */
  async updateTarget(targetId, updateData, userId) {
    const { title, description, subtargets, imageUrl } = updateData;
    
    try {
      // Vérifie que le target existe
      const targetCheck = await this.pool.query(
        'SELECT campaign_id FROM targets WHERE id = $1',
        [targetId]
      );
      
      if (targetCheck.rows.length === 0) {
        throw new Error('GOAL_NOT_FOUND');
      }

      const target = targetCheck.rows[0];

      // Vérifie l'accès à la campagne
      const accessCheck = await this.checkCampaignAccess(target.campaign_id, userId);

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

      if (title) { updateFields.push(`targets_name = $${idx++}`); values.push(title); }
      if (description) { updateFields.push(`targets_description = $${idx++}`); values.push(description); }
      if (subtargets) { updateFields.push(`subtargets = $${idx++}`); values.push(subtargets); }
      if (imageUrl) { updateFields.push(`targets_imageurl = $${idx++}`); values.push(imageUrl); }

      if (updateFields.length === 0) {
        throw new Error('NO_FIELDS_TO_UPDATE');
      }

      values.push(targetId);

      await this.pool.query(
        `UPDATE targets SET ${updateFields.join(', ')} WHERE id = $${values.length}`,
        values
      );

      return { success: true };
    } catch (error) {
      console.error('Erreur lors de la mise à jour du target:', error);
      throw error;
    }
  }

  /**
   * Supprime un objectif
   * @param {number} targetId - ID de l'objectif
   * @param {number} userId - ID de l'utilisateur
   * @returns {Object} - Résultat de la suppression
   */
  async deleteTarget(targetId, userId) {
    try {
      // Vérifie que le target existe
      const targetCheck = await this.pool.query(
        'SELECT campaign_id FROM targets WHERE id = $1',
        [targetId]
      );
      
      if (targetCheck.rows.length === 0) {
        throw new Error('GOAL_NOT_FOUND');
      }

      const target = targetCheck.rows[0];

      // Vérifie l'accès à la campagne
      const accessCheck = await this.checkCampaignAccess(target.campaign_id, userId);

      if (!accessCheck.hasAccess) {
        throw new Error('UNAUTHORIZED');
      }

      if (accessCheck.isReadOnly) {
        throw new Error('READ_ONLY_ACCESS');
      }

      // Supprime le target
      await this.pool.query('DELETE FROM targets WHERE id = $1', [targetId]);

      return { success: true };
    } catch (error) {
      console.error('Erreur lors de la suppression du target:', error);
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

module.exports = TargetsService;