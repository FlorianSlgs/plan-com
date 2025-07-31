/**
 * Service centralisé pour la gestion des accès et permissions aux campagnes
 * Utilisé par tous les autres services pour vérifier les droits d'accès
 */

class CampaignAccessService {
  constructor(pool) {
    this.pool = pool;
  }

  /**
   * Vérifie l'accès à une campagne pour un utilisateur
   * @param {number} userId - ID de l'utilisateur
   * @param {number|string|null} campaignId - ID de la campagne (peut être null pour les éléments personnels)
   * @returns {Promise<Object>} - Objet avec hasAccess, isOwner, isReadOnly
   */
  async getCampaignAccess(userId, campaignId) {
    // Si pas de campagne spécifiée, accès total (éléments personnels)
    if (!campaignId) {
      return { 
        hasAccess: true, 
        isOwner: true, 
        isReadOnly: false 
      };
    }

    try {
      // Vérifier si l'utilisateur est propriétaire de la campagne
      const ownerCheck = await this.pool.query(
        'SELECT id FROM campaign WHERE id = $1 AND user_id = $2',
        [campaignId, userId]
      );

      if (ownerCheck.rows.length > 0) {
        return { 
          hasAccess: true, 
          isOwner: true, 
          isReadOnly: false 
        };
      }

      // Si pas propriétaire, vérifier dans share_campaigns
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

      // Aucun accès trouvé
      return { 
        hasAccess: false, 
        isOwner: false, 
        isReadOnly: true 
      };
    } catch (error) {
      console.error('Erreur lors de la vérification d\'accès à la campagne:', error);
      throw error;
    }
  }

  /**
   * Vérifie simplement si l'utilisateur a accès à la campagne
   * @param {number} userId - ID de l'utilisateur
   * @param {number|string|null} campaignId - ID de la campagne
   * @returns {Promise<boolean>} - true si l'utilisateur a accès
   */
  async checkCampaignAccess(userId, campaignId) {
    const access = await this.getCampaignAccess(userId, campaignId);
    return access.hasAccess;
  }

  /**
   * Vérifie si l'utilisateur peut écrire dans la campagne
   * @param {number} userId - ID de l'utilisateur
   * @param {number|string|null} campaignId - ID de la campagne
   * @returns {Promise<boolean>} - true si l'utilisateur peut écrire
   */
  async canWriteToCampaign(userId, campaignId) {
    const access = await this.getCampaignAccess(userId, campaignId);
    return access.hasAccess && !access.isReadOnly;
  }

  /**
   * Vérifie si l'utilisateur est propriétaire de la campagne
   * @param {number} userId - ID de l'utilisateur
   * @param {number|string|null} campaignId - ID de la campagne
   * @returns {Promise<boolean>} - true si l'utilisateur est propriétaire
   */
  async isCampaignOwner(userId, campaignId) {
    const access = await this.getCampaignAccess(userId, campaignId);
    return access.isOwner;
  }

  /**
   * Valide l'accès et lance une erreur appropriée si nécessaire
   * @param {number} userId - ID de l'utilisateur
   * @param {number|string|null} campaignId - ID de la campagne
   * @param {boolean} requireWrite - true si l'écriture est requise
   * @throws {Error} - Erreur avec message approprié
   */
  async validateCampaignAccess(userId, campaignId, requireWrite = false) {
    const access = await this.getCampaignAccess(userId, campaignId);
    
    if (!access.hasAccess) {
      throw new Error('CAMPAIGN_NOT_FOUND');
    }
    
    if (requireWrite && access.isReadOnly) {
      throw new Error('READ_ONLY_ACCESS');
    }
    
    return access;
  }

  /**
   * Récupère les permissions détaillées pour une campagne
   * Alias pour getCampaignAccess pour plus de clarté
   * @param {number} userId - ID de l'utilisateur
   * @param {number|string|null} campaignId - ID de la campagne
   * @returns {Promise<Object>} - Permissions détaillées
   */
  async getCampaignPermissions(userId, campaignId) {
    return await this.getCampaignAccess(userId, campaignId);
  }

  /**
   * Récupère la liste des utilisateurs ayant accès à une campagne
   * Accessible seulement aux propriétaires de la campagne
   * @param {number} userId - ID de l'utilisateur demandeur
   * @param {number|string} campaignId - ID de la campagne
   * @returns {Promise<Array>} - Liste des utilisateurs avec leurs rôles
   */
  async getCampaignUsers(userId, campaignId) {
    // Vérifier que l'utilisateur est propriétaire de la campagne
    const isOwner = await this.isCampaignOwner(userId, campaignId);
    
    if (!isOwner) {
      throw new Error('OWNER_ACCESS_REQUIRED');
    }

    try {
      // Récupérer les utilisateurs ayant accès à la campagne
      const result = await this.pool.query(
        `SELECT sc.user_id, u.first_name, u.last_name, u.email,
                CASE 
                  WHEN sc.read = true THEN 'reader'
                  ELSE 'editor'
                END as role,
                sc.created_at as shared_date
         FROM share_campaigns sc
         JOIN users u ON sc.user_id = u.id
         WHERE sc.campaign_id = $1
         ORDER BY u.first_name, u.last_name`,
        [campaignId]
      );

      return result.rows.map(row => ({
        userId: row.user_id,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        role: row.role,
        sharedDate: row.shared_date
      }));
    } catch (error) {
      console.error('Erreur lors de la récupération des utilisateurs de la campagne:', error);
      throw error;
    }
  }

  /**
   * Vérifie si un utilisateur peut être invité à une campagne
   * @param {number} ownerId - ID du propriétaire de la campagne
   * @param {number} campaignId - ID de la campagne
   * @param {string} email - Email de l'utilisateur à inviter
   * @returns {Promise<Object>} - Résultat de la vérification
   */
  async canInviteUser(ownerId, campaignId, email) {
    // Vérifier que l'utilisateur demandeur est propriétaire
    const isOwner = await this.isCampaignOwner(ownerId, campaignId);
    
    if (!isOwner) {
      return {
        canInvite: false,
        reason: 'OWNER_ACCESS_REQUIRED'
      };
    }

    try {
      // Vérifier si l'utilisateur existe
      const userCheck = await this.pool.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );

      if (userCheck.rows.length === 0) {
        return {
          canInvite: false,
          reason: 'USER_NOT_FOUND'
        };
      }

      const targetUserId = userCheck.rows[0].id;

      // Vérifier si l'utilisateur est le propriétaire lui-même
      if (targetUserId === ownerId) {
        return {
          canInvite: false,
          reason: 'CANNOT_INVITE_SELF'
        };
      }

      // Vérifier si l'utilisateur a déjà accès à la campagne
      const existingAccess = await this.pool.query(
        'SELECT id FROM share_campaigns WHERE campaign_id = $1 AND user_id = $2',
        [campaignId, targetUserId]
      );

      if (existingAccess.rows.length > 0) {
        return {
          canInvite: false,
          reason: 'USER_ALREADY_HAS_ACCESS'
        };
      }

      return {
        canInvite: true,
        targetUserId
      };
    } catch (error) {
      console.error('Erreur lors de la vérification d\'invitation:', error);
      throw error;
    }
  }

   /**
   * Supprime l'accès d'un utilisateur à une campagne
   * Accessible seulement aux propriétaires de la campagne
   * @param {number} ownerId - ID du propriétaire de la campagne
   * @param {number|string} campaignId - ID de la campagne
   * @param {number} targetUserId - ID de l'utilisateur à supprimer
   * @returns {Promise<boolean>} - true si la suppression a réussi
   */
  async removeUserAccess(ownerId, campaignId, targetUserId) {
    // Vérifier que l'utilisateur demandeur est propriétaire
    const isOwner = await this.isCampaignOwner(ownerId, campaignId);
    
    if (!isOwner) {
      throw new Error('OWNER_ACCESS_REQUIRED');
    }

    try {
      const result = await this.pool.query(
        'DELETE FROM share_campaigns WHERE campaign_id = $1 AND user_id = $2 RETURNING id',
        [campaignId, targetUserId]
      );

      return result.rows.length > 0;
    } catch (error) {
      console.error('Erreur lors de la suppression d\'accès utilisateur:', error);
      throw error;
    }
  }
}

module.exports = CampaignAccessService;