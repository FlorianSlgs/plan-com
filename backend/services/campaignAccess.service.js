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
   * @param {number|null} campaignId - ID de la campagne (peut être null pour les éléments personnels)
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
   * @param {number|null} campaignId - ID de la campagne
   * @returns {Promise<boolean>} - true si l'utilisateur a accès
   */
  async checkCampaignAccess(userId, campaignId) {
    const access = await this.getCampaignAccess(userId, campaignId);
    return access.hasAccess;
  }

  /**
   * Vérifie si l'utilisateur peut écrire dans la campagne
   * @param {number} userId - ID de l'utilisateur
   * @param {number|null} campaignId - ID de la campagne
   * @returns {Promise<boolean>} - true si l'utilisateur peut écrire
   */
  async canWriteToCampaign(userId, campaignId) {
    const access = await this.getCampaignAccess(userId, campaignId);
    return access.hasAccess && !access.isReadOnly;
  }

  /**
   * Vérifie si l'utilisateur est propriétaire de la campagne
   * @param {number} userId - ID de l'utilisateur
   * @param {number|null} campaignId - ID de la campagne
   * @returns {Promise<boolean>} - true si l'utilisateur est propriétaire
   */
  async isCampaignOwner(userId, campaignId) {
    const access = await this.getCampaignAccess(userId, campaignId);
    return access.isOwner;
  }

  /**
   * Valide l'accès et lance une erreur appropriée si nécessaire
   * @param {number} userId - ID de l'utilisateur
   * @param {number|null} campaignId - ID de la campagne
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
   * @param {number|null} campaignId - ID de la campagne
   * @returns {Promise<Object>} - Permissions détaillées
   */
  async getCampaignPermissions(userId, campaignId) {
    return await this.getCampaignAccess(userId, campaignId);
  }
}

module.exports = CampaignAccessService;