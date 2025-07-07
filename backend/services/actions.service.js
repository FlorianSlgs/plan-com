/**
 * Service pour la gestion des actions/événements
 * Utilise le CampaignAccessService pour la gestion des permissions
 */

const CampaignAccessService = require('./campaignAccess.service');

class ActionsService {
  constructor(pool) {
    this.pool = pool;
    this.accessService = new CampaignAccessService(pool);
  }

  /**
   * Récupérer les événements avec les permissions
   * @param {number} userId - ID de l'utilisateur
   * @param {number|null} currentCampaignId - ID de la campagne actuelle
   * @returns {Object} - Événements et permissions
   */
  async getEventsWithAccess(userId, currentCampaignId) {
    try {
      // Récupérer les permissions d'accès
      const access = await this.accessService.getCampaignAccess(userId, currentCampaignId);
      
      if (!access.hasAccess) {
        return { 
          events: [], 
          access: { hasAccess: false, isReadOnly: true, isOwner: false }
        };
      }
      
      let query, params;
      
      if (currentCampaignId) {
        // Récupérer les événements de la campagne (peu importe qui les a créés)
        query = `
          SELECT 
            id, 
            title, 
            event_date AS date, 
            start_time AS "startTime", 
            campaign_id AS "campaignId", 
            user_id AS "userId"
          FROM actions
          WHERE campaign_id = $1
          ORDER BY event_date ASC
        `;
        params = [currentCampaignId];
      } else {
        // Récupérer seulement les événements de l'utilisateur sans campagne
        query = `
          SELECT 
            id, 
            title, 
            event_date AS date, 
            start_time AS "startTime", 
            campaign_id AS "campaignId", 
            user_id AS "userId"
          FROM actions
          WHERE user_id = $1 AND campaign_id IS NULL
          ORDER BY event_date ASC
        `;
        params = [userId];
      }

      const result = await this.pool.query(query, params);
      const events = result.rows.map(e => ({
        ...e,
        date: e.date ? new Date(e.date).toISOString() : null
      }));
      
      return { events, access };
    } catch (error) {
      console.error('Erreur lors de la récupération des événements avec accès :', error);
      throw error;
    }
  }

  /**
   * Récupérer tous les événements (pour compatibilité)
   * @param {number} userId - ID de l'utilisateur
   * @param {number|null} currentCampaignId - ID de la campagne actuelle
   * @returns {Array} - Liste des événements
   */
  async getEvents(userId, currentCampaignId) {
    try {
      let query, params;
      
      if (currentCampaignId) {
        // Vérifier l'accès à la campagne
        const hasAccess = await this.accessService.checkCampaignAccess(userId, currentCampaignId);
        if (!hasAccess) {
          throw new Error('CAMPAIGN_NOT_FOUND');
        }
        
        // Récupérer les événements de la campagne (peu importe qui les a créés)
        query = `
          SELECT 
            id, 
            title, 
            event_date AS date, 
            start_time AS "startTime", 
            campaign_id AS "campaignId", 
            user_id AS "userId"
          FROM actions
          WHERE campaign_id = $1
          ORDER BY event_date ASC
        `;
        params = [currentCampaignId];
      } else {
        // Récupérer seulement les événements de l'utilisateur sans campagne
        query = `
          SELECT 
            id, 
            title, 
            event_date AS date, 
            start_time AS "startTime", 
            campaign_id AS "campaignId", 
            user_id AS "userId"
          FROM actions
          WHERE user_id = $1 AND campaign_id IS NULL
          ORDER BY event_date ASC
        `;
        params = [userId];
      }

      const result = await this.pool.query(query, params);
      const events = result.rows.map(e => ({
        ...e,
        date: e.date ? new Date(e.date).toISOString() : null
      }));
      
      return events;
    } catch (error) {
      console.error('Erreur lors de la récupération des événements :', error);
      throw error;
    }
  }

  /**
   * Ajouter un événement
   * @param {number} userId - ID de l'utilisateur
   * @param {Object} eventData - Données de l'événement
   * @returns {Object} - Événement créé
   */
  async createEvent(userId, eventData) {
    try {
      const { id, title, date, startTime, campaignId } = eventData;
      
      // Utilise le service centralisé pour valider l'accès en écriture
      await this.accessService.validateCampaignAccess(userId, campaignId, true);
      
      const result = await this.pool.query(
        `INSERT INTO actions (id, title, event_date, start_time, campaign_id, user_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, title, event_date AS date, start_time AS "startTime", campaign_id AS "campaignId", user_id AS "userId"`,
        [
          id,
          title,
          date,
          startTime || null,
          campaignId || null,
          userId
        ]
      );
      
      const savedEvent = result.rows[0];
      if (savedEvent && savedEvent.date) {
        savedEvent.date = new Date(savedEvent.date).toISOString();
      }
      
      return savedEvent;
    } catch (error) {
      console.error('Erreur lors de l\'ajout de l\'événement :', error);
      throw error;
    }
  }

  /**
   * Modifier un événement
   * @param {number} userId - ID de l'utilisateur
   * @param {string} eventId - ID de l'événement
   * @param {Object} eventData - Nouvelles données
   * @returns {Object} - Événement modifié
   */
  async updateEvent(userId, eventId, eventData) {
    try {
      const { title, date, startTime, campaignId } = eventData;

      // Récupérer l'événement existant
      const eventCheck = await this.pool.query(
        'SELECT user_id, campaign_id FROM actions WHERE id = $1',
        [eventId]
      );
      
      if (eventCheck.rows.length === 0) {
        throw new Error('EVENT_NOT_FOUND');
      }
      
      const existingEvent = eventCheck.rows[0];
      
      // Vérifier les autorisations
      let canModify = false;
      
      // Si l'utilisateur est le créateur de l'événement
      if (existingEvent.user_id === userId) {
        // Vérifier les permissions de la campagne actuelle
        if (existingEvent.campaign_id) {
          const canWrite = await this.accessService.canWriteToCampaign(userId, existingEvent.campaign_id);
          canModify = canWrite;
        } else {
          canModify = true; // Événement personnel, l'utilisateur peut le modifier
        }
      }
      // Si l'événement appartient à une campagne partagée
      else if (existingEvent.campaign_id) {
        const canWrite = await this.accessService.canWriteToCampaign(userId, existingEvent.campaign_id);
        canModify = canWrite;
      }
      
      if (!canModify) {
        throw new Error('UNAUTHORIZED');
      }
      
      // Vérifier l'accès à la nouvelle campagne si elle change
      if (campaignId && campaignId !== existingEvent.campaign_id) {
        const canWrite = await this.accessService.canWriteToCampaign(userId, campaignId);
        if (!canWrite) {
          throw new Error('UNAUTHORIZED');
        }
      }

      const result = await this.pool.query(
        `UPDATE actions
        SET title = $1,
            event_date = $2,
            start_time = $3,
            campaign_id = $4
        WHERE id = $5
        RETURNING id, title, event_date AS date, start_time AS "startTime", campaign_id AS "campaignId", user_id AS "userId"`,
        [
          title,
          date,
          startTime || null,
          campaignId || null,
          eventId
        ]
      );
      
      const updatedEvent = result.rows[0];
      if (updatedEvent && updatedEvent.date) {
        updatedEvent.date = new Date(updatedEvent.date).toISOString();
      }
      
      return updatedEvent;
    } catch (error) {
      console.error('Erreur lors de la modification de l\'événement :', error);
      throw error;
    }
  }

  /**
   * Supprimer un événement
   * @param {number} userId - ID de l'utilisateur
   * @param {string} eventId - ID de l'événement
   * @returns {Object} - Message de confirmation
   */
  async deleteEvent(userId, eventId) {
    try {
      // Récupérer l'événement existant
      const eventCheck = await this.pool.query(
        'SELECT user_id, campaign_id FROM actions WHERE id = $1',
        [eventId]
      );
      
      if (eventCheck.rows.length === 0) {
        throw new Error('EVENT_NOT_FOUND');
      }
      
      const existingEvent = eventCheck.rows[0];
      
      // Vérifier les autorisations
      let canDelete = false;
      
      // Si l'utilisateur est le créateur de l'événement
      if (existingEvent.user_id === userId) {
        // Vérifier les permissions de la campagne actuelle
        if (existingEvent.campaign_id) {
          const canWrite = await this.accessService.canWriteToCampaign(userId, existingEvent.campaign_id);
          canDelete = canWrite;
        } else {
          canDelete = true; // Événement personnel, l'utilisateur peut le supprimer
        }
      }
      // Si l'événement appartient à une campagne partagée
      else if (existingEvent.campaign_id) {
        const canWrite = await this.accessService.canWriteToCampaign(userId, existingEvent.campaign_id);
        canDelete = canWrite;
      }
      
      if (!canDelete) {
        throw new Error('UNAUTHORIZED');
      }

      await this.pool.query('DELETE FROM actions WHERE id = $1', [eventId]);
      return { message: 'Événement supprimé' };
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'événement :', error);
      throw error;
    }
  }

  /**
   * Récupère les permissions d'un utilisateur sur une campagne
   * @param {number} userId - ID de l'utilisateur
   * @param {number} campaignId - ID de la campagne
   * @returns {Object} - Permissions de l'utilisateur
   */
  async getCampaignPermissions(userId, campaignId) {
    try {
      return await this.accessService.getCampaignPermissions(userId, campaignId);
    } catch (error) {
      console.error('Erreur lors de la récupération des permissions:', error);
      throw error;
    }
  }
}

module.exports = ActionsService;