const express = require('express');
const router = express.Router();
const authenticateToken = require('./middlewares/auth');

// pool doit être passé lors de l'importation de la route dans index.js
module.exports = (pool) => {
  
  // Fonction utilitaire pour vérifier l'accès et les permissions d'une campagne
  const getCampaignAccess = async (userId, campaignId) => {
    if (!campaignId) {
      return { hasAccess: true, isReadOnly: false, isOwner: true };
    }

    // Vérifier si l'utilisateur est propriétaire de la campagne
    const ownerCheck = await pool.query(
      'SELECT user_id FROM campaign WHERE id = $1 AND user_id = $2',
      [campaignId, userId]
    );
    
    if (ownerCheck.rows.length > 0) {
      return { hasAccess: true, isReadOnly: false, isOwner: true };
    }
    
    // Vérifier si la campagne est partagée avec l'utilisateur
    const shareCheck = await pool.query(
      'SELECT read FROM share_campaigns WHERE campaign_id = $1 AND user_id = $2',
      [campaignId, userId]
    );
    
    if (shareCheck.rows.length > 0) {
      const isReadOnly = shareCheck.rows[0].read === true;
      return { hasAccess: true, isReadOnly, isOwner: false };
    }
    
    return { hasAccess: false, isReadOnly: true, isOwner: false };
  };

  // Fonction utilitaire de compatibilité pour les anciennes vérifications
  const checkCampaignAccess = async (userId, campaignId) => {
    const access = await getCampaignAccess(userId, campaignId);
    return access.hasAccess;
  };

  // Nouvelle route pour récupérer les événements avec les permissions
  router.get('/with-access', authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const { currentCampaignId } = req.query;
      
      // Récupérer les permissions d'accès
      const access = await getCampaignAccess(userId, currentCampaignId);
      
      if (!access.hasAccess) {
        return res.status(403).json({ 
          error: 'Accès non autorisé à cette campagne',
          events: [],
          access: { hasAccess: false, isReadOnly: true, isOwner: false }
        });
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

      const result = await pool.query(query, params);
      const events = result.rows.map(e => ({
        ...e,
        date: e.date ? new Date(e.date).toISOString() : null
      }));
      
      res.json({ events, access });
    } catch (error) {
      console.error('Erreur lors de la récupération des événements avec accès :', error);
      res.status(500).json({ 
        error: 'Erreur serveur lors de la récupération des événements',
        events: [],
        access: { hasAccess: false, isReadOnly: true, isOwner: false }
      });
    }
  });

  // Récupérer tous les événements (route protégée) - conservée pour compatibilité
  router.get('/', authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const { currentCampaignId } = req.query;
      
      let query, params;
      
      if (currentCampaignId) {
        // Vérifier l'accès à la campagne
        const hasAccess = await checkCampaignAccess(userId, currentCampaignId);
        if (!hasAccess) {
          return res.status(403).json({ error: 'Accès non autorisé à cette campagne' });
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

      const result = await pool.query(query, params);
      const events = result.rows.map(e => ({
        ...e,
        date: e.date ? new Date(e.date).toISOString() : null
      }));
      res.json(events);
    } catch (error) {
      console.error('Erreur lors de la récupération des événements :', error);
      res.status(500).json({ error: 'Erreur serveur lors de la récupération des événements' });
    }
  });

  // Ajouter un événement (route protégée)
  router.post('/', authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const { id, title, date, startTime, campaignId } = req.body;
      
      // Vérifier l'accès et les permissions à la campagne si elle est spécifiée
      if (campaignId) {
        const access = await getCampaignAccess(userId, campaignId);
        if (!access.hasAccess) {
          return res.status(403).json({ error: 'Accès non autorisé à cette campagne' });
        }
        if (access.isReadOnly) {
          return res.status(403).json({ error: 'Vous n\'avez pas les permissions pour ajouter des événements dans cette campagne (accès en lecture seule)' });
        }
      }
      
      const result = await pool.query(
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
      res.status(201).json(savedEvent);
    } catch (error) {
      console.error('Erreur lors de l\'ajout de l\'événement :', error);
      res.status(500).json({ error: 'Erreur serveur lors de l\'ajout de l\'événement' });
    }
  });

  // Modifier un événement (route protégée)
  router.put('/:id', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { title, date, startTime, campaignId } = req.body;

      // Récupérer l'événement existant
      const eventCheck = await pool.query(
        'SELECT user_id, campaign_id FROM actions WHERE id = $1',
        [id]
      );
      
      if (eventCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Événement non trouvé' });
      }
      
      const existingEvent = eventCheck.rows[0];
      
      // Vérifier les autorisations
      let canModify = false;
      
      // Si l'utilisateur est le créateur de l'événement
      if (existingEvent.user_id === userId) {
        // Vérifier les permissions de la campagne actuelle
        if (existingEvent.campaign_id) {
          const access = await getCampaignAccess(userId, existingEvent.campaign_id);
          canModify = access.hasAccess && !access.isReadOnly;
        } else {
          canModify = true; // Événement personnel, l'utilisateur peut le modifier
        }
      }
      // Si l'événement appartient à une campagne partagée
      else if (existingEvent.campaign_id) {
        const access = await getCampaignAccess(userId, existingEvent.campaign_id);
        canModify = access.hasAccess && !access.isReadOnly;
      }
      
      if (!canModify) {
        return res.status(403).json({ error: 'Accès non autorisé à cet événement ou permissions insuffisantes' });
      }
      
      // Vérifier l'accès à la nouvelle campagne si elle change
      if (campaignId && campaignId !== existingEvent.campaign_id) {
        const access = await getCampaignAccess(userId, campaignId);
        if (!access.hasAccess || access.isReadOnly) {
          return res.status(403).json({ error: 'Accès non autorisé à la nouvelle campagne ou permissions insuffisantes' });
        }
      }

      const result = await pool.query(
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
          id
        ]
      );
      
      const updatedEvent = result.rows[0];
      if (updatedEvent && updatedEvent.date) {
        updatedEvent.date = new Date(updatedEvent.date).toISOString();
      }
      res.json(updatedEvent);
    } catch (error) {
      console.error('Erreur lors de la modification de l\'événement :', error);
      res.status(500).json({ error: 'Erreur serveur lors de la modification de l\'événement' });
    }
  });

  // Supprimer un événement (route protégée)
  router.delete('/:id', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Récupérer l'événement existant
      const eventCheck = await pool.query(
        'SELECT user_id, campaign_id FROM actions WHERE id = $1',
        [id]
      );
      
      if (eventCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Événement non trouvé' });
      }
      
      const existingEvent = eventCheck.rows[0];
      
      // Vérifier les autorisations
      let canDelete = false;
      
      // Si l'utilisateur est le créateur de l'événement
      if (existingEvent.user_id === userId) {
        // Vérifier les permissions de la campagne actuelle
        if (existingEvent.campaign_id) {
          const access = await getCampaignAccess(userId, existingEvent.campaign_id);
          canDelete = access.hasAccess && !access.isReadOnly;
        } else {
          canDelete = true; // Événement personnel, l'utilisateur peut le supprimer
        }
      }
      // Si l'événement appartient à une campagne partagée
      else if (existingEvent.campaign_id) {
        const access = await getCampaignAccess(userId, existingEvent.campaign_id);
        canDelete = access.hasAccess && !access.isReadOnly;
      }
      
      if (!canDelete) {
        return res.status(403).json({ error: 'Accès non autorisé à cet événement ou permissions insuffisantes' });
      }

      await pool.query('DELETE FROM actions WHERE id = $1', [id]);
      res.json({ message: 'Événement supprimé' });
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'événement :', error);
      res.status(500).json({ error: 'Erreur serveur lors de la suppression de l\'événement' });
    }
  });

  return router;
};