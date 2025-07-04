const ActionsService = require('../services/actions.service');

class ActionsController {
  constructor(pool) {
    this.actionsService = new ActionsService(pool);
  }

  // Récupérer les événements avec les permissions
  async getEventsWithAccess(req, res) {
    try {
      const userId = req.user.id;
      const { currentCampaignId } = req.query;
      
      const result = await this.actionsService.getEventsWithAccess(userId, currentCampaignId);
      
      if (!result.access.hasAccess) {
        return res.status(403).json({ 
          error: 'Accès non autorisé à cette campagne',
          events: [],
          access: { hasAccess: false, isReadOnly: true, isOwner: false }
        });
      }
      
      res.json(result);
    } catch (error) {
      console.error('Erreur dans getEventsWithAccess:', error);
      res.status(500).json({ 
        error: 'Erreur serveur lors de la récupération des événements',
        events: [],
        access: { hasAccess: false, isReadOnly: true, isOwner: false }
      });
    }
  }

  // Récupérer tous les événements (pour compatibilité)
  async getEvents(req, res) {
    try {
      const userId = req.user.id;
      const { currentCampaignId } = req.query;
      
      const events = await this.actionsService.getEvents(userId, currentCampaignId);
      
      res.json(events);
    } catch (error) {
      console.error('Erreur dans getEvents:', error);
      
      if (error.message === 'Accès non autorisé à cette campagne') {
        return res.status(403).json({ error: error.message });
      }
      
      res.status(500).json({ error: 'Erreur serveur lors de la récupération des événements' });
    }
  }

  // Ajouter un événement
  async createEvent(req, res) {
    try {
      const userId = req.user.id;
      const eventData = req.body;
      
      const savedEvent = await this.actionsService.createEvent(userId, eventData);
      
      res.status(201).json(savedEvent);
    } catch (error) {
      console.error('Erreur dans createEvent:', error);
      
      if (error.message.includes('Accès non autorisé') || 
          error.message.includes('permissions')) {
        return res.status(403).json({ error: error.message });
      }
      
      res.status(500).json({ error: 'Erreur serveur lors de l\'ajout de l\'événement' });
    }
  }

  // Modifier un événement
  async updateEvent(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const eventData = req.body;
      
      const updatedEvent = await this.actionsService.updateEvent(userId, id, eventData);
      
      res.json(updatedEvent);
    } catch (error) {
      console.error('Erreur dans updateEvent:', error);
      
      if (error.message === 'Événement non trouvé') {
        return res.status(404).json({ error: error.message });
      }
      
      if (error.message.includes('Accès non autorisé') || 
          error.message.includes('permissions')) {
        return res.status(403).json({ error: error.message });
      }
      
      res.status(500).json({ error: 'Erreur serveur lors de la modification de l\'événement' });
    }
  }

  // Supprimer un événement
  async deleteEvent(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      const result = await this.actionsService.deleteEvent(userId, id);
      
      res.json(result);
    } catch (error) {
      console.error('Erreur dans deleteEvent:', error);
      
      if (error.message === 'Événement non trouvé') {
        return res.status(404).json({ error: error.message });
      }
      
      if (error.message.includes('Accès non autorisé') || 
          error.message.includes('permissions')) {
        return res.status(403).json({ error: error.message });
      }
      
      res.status(500).json({ error: 'Erreur serveur lors de la suppression de l\'événement' });
    }
  }
}

module.exports = ActionsController;