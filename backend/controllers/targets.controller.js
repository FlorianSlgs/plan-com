/**
 * Contrôleur pour la gestion des cibles (targets)
 * Gère les requêtes HTTP et les réponses, fait appel au service pour la logique métier
 */

const TargetsService = require('../services/targets.service');

class TargetsController {
  constructor(pool) {
    this.targetsService = new TargetsService(pool);
  }

  /**
   * Récupère les permissions d'un utilisateur sur une campagne
   */
  getCampaignPermissions = async (req, res) => {
    try {
      const { campaignId } = req.params;
      const userId = req.user.id;

      const permissions = await this.targetsService.getCampaignPermissions(campaignId, userId);
      res.json(permissions);
    } catch (error) {
      console.error('Erreur dans getCampaignPermissions:', error);
      res.status(500).json({ message: 'Erreur serveur.' });
    }
  };

  /**
   * Crée un nouvel cible avec upload d'image
   */
  createTargetWithImage = async (req, res) => {
    try {
      const filePath = req.file ? req.file.filename : null;
      const { campaignId, title, description, subtargets } = req.body;
      const userId = req.user.id;
      
      if (!filePath || !campaignId || !title) {
        return res.status(400).json({ message: 'Champs requis manquants.' });
      }

      const targetData = {
        userId,
        campaignId,
        title,
        description,
        subtargets,
        filePath
      };

      const result = await this.targetsService.createTarget(targetData);
      res.status(201).json({ 
        message: 'Cible enregistré.', 
        filePath: result.filePath 
      });
    } catch (error) {
      console.error('Erreur dans createTargetWithImage:', error);
      
      if (error.message === 'CAMPAIGN_NOT_FOUND') {
        return res.status(404).json({ message: 'Campagne non trouvée ou accès non autorisé.' });
      }
      
      if (error.message === 'READ_ONLY_ACCESS') {
        return res.status(403).json({ message: 'Accès en lecture seule. Modification non autorisée.' });
      }
      
      res.status(500).json({ message: 'Erreur serveur.' });
    }
  };

  /**
   * Récupère les cibles d'une campagne par ID
   */
  getTargetsByCampaignId = async (req, res) => {
    try {
      const { campaignId } = req.params;
      const userId = req.user.id;

      const targets = await this.targetsService.getTargetsByCampaignId(campaignId, userId);
      res.json(targets);
    } catch (error) {
      console.error('Erreur dans getTargetsByCampaignId:', error);
      res.status(500).json({ message: 'Erreur serveur.' });
    }
  };

  /**
   * Récupère les cibles d'une campagne par nom
   */
  getTargetsByCampaignName = async (req, res) => {
    try {
      const { campaignName } = req.params;
      const userId = req.user.id;

      const targets = await this.targetsService.getTargetsByCampaignName(campaignName, userId);
      res.json(targets);
    } catch (error) {
      console.error('Erreur dans getTargetsByCampaignName:', error);
      res.status(500).json({ message: 'Erreur serveur.' });
    }
  };

  /**
   * Met à jour un cible
   */
  updateTarget = async (req, res) => {
    try {
      const { targetId } = req.params;
      const { title, description, subtargets } = req.body;
      const userId = req.user.id;
      let imageUrl = null;

      if (req.file) {
        imageUrl = req.file.filename;
      }

      const updateData = {
        title,
        description,
        subtargets,
        imageUrl
      };

      await this.targetsService.updateTarget(targetId, updateData, userId);
      res.json({ message: 'Cible mis à jour.' });
    } catch (error) {
      console.error('Erreur dans updateTarget:', error);
      
      if (error.message === 'GOAL_NOT_FOUND') {
        return res.status(404).json({ message: 'Cible non trouvé.' });
      }
      
      if (error.message === 'UNAUTHORIZED') {
        return res.status(403).json({ message: 'Non autorisé à modifier cet cible.' });
      }
      
      if (error.message === 'READ_ONLY_ACCESS') {
        return res.status(403).json({ message: 'Accès en lecture seule. Modification non autorisée.' });
      }
      
      if (error.message === 'NO_FIELDS_TO_UPDATE') {
        return res.status(400).json({ message: 'Aucun champ à mettre à jour.' });
      }
      
      res.status(500).json({ message: 'Erreur serveur.' });
    }
  };

  /**
   * Supprime un cible
   */
  deleteTarget = async (req, res) => {
    try {
      const { targetId } = req.params;
      const userId = req.user.id;

      await this.targetsService.deleteTarget(targetId, userId);
      res.json({ message: 'Cible supprimé.' });
    } catch (error) {
      console.error('Erreur dans deleteTarget:', error);
      
      if (error.message === 'GOAL_NOT_FOUND') {
        return res.status(404).json({ message: 'Cible non trouvé.' });
      }
      
      if (error.message === 'UNAUTHORIZED') {
        return res.status(403).json({ message: 'Non autorisé à supprimer cet cible.' });
      }
      
      if (error.message === 'READ_ONLY_ACCESS') {
        return res.status(403).json({ message: 'Accès en lecture seule. Suppression non autorisée.' });
      }
      
      res.status(500).json({ message: 'Erreur serveur.' });
    }
  };
}

module.exports = TargetsController;