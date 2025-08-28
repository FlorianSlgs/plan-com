/**
 * Contrôleur pour la gestion des objectifs (goals)
 * Gère les requêtes HTTP et les réponses, fait appel au service pour la logique métier
 */

const GoalsService = require('../services/goals.service');

class GoalsController {
  constructor(pool) {
    this.goalsService = new GoalsService(pool);
  }

  /**
   * Récupère les permissions d'un utilisateur sur une campagne
   */
  getCampaignPermissions = async (req, res) => {
    try {
      const { campaignId } = req.params;
      const userId = req.user.id;

      const permissions = await this.goalsService.getCampaignPermissions(campaignId, userId);
      res.json(permissions);
    } catch (error) {
      console.error('Erreur dans getCampaignPermissions:', error);
      res.status(500).json({ message: 'Erreur serveur.' });
    }
  };

  /**
   * Crée un nouvel objectif avec upload d'image
   */
  createGoalWithImage = async (req, res) => {
    try {
      const filePath = req.file ? req.file.filename : null;
      const { campaignId, title, description, subgoals } = req.body;
      const userId = req.user.id;
      
      if (!filePath || !campaignId || !title) {
        return res.status(400).json({ message: 'Champs requis manquants.' });
      }

      const goalData = {
        userId,
        campaignId,
        title,
        description,
        subgoals,
        filePath
      };

      const result = await this.goalsService.createGoal(goalData);
      res.status(201).json({ 
        message: 'Objectif enregistré.', 
        filePath: result.filePath 
      });
    } catch (error) {
      console.error('Erreur dans createGoalWithImage:', error);
      
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
   * Récupère les objectifs d'une campagne par ID
   */
  getGoalsByCampaignId = async (req, res) => {
    try {
      const { campaignId } = req.params;
      const userId = req.user.id;

      const goals = await this.goalsService.getGoalsByCampaignId(campaignId, userId);
      res.json(goals);
    } catch (error) {
      console.error('Erreur dans getGoalsByCampaignId:', error);
      res.status(500).json({ message: 'Erreur serveur.' });
    }
  };

  /**
   * Récupère les objectifs d'une campagne par nom
   */
  getGoalsByCampaignName = async (req, res) => {
    try {
      const { campaignName } = req.params;
      const userId = req.user.id;

      const goals = await this.goalsService.getGoalsByCampaignName(campaignName, userId);
      res.json(goals);
    } catch (error) {
      console.error('Erreur dans getGoalsByCampaignName:', error);
      res.status(500).json({ message: 'Erreur serveur.' });
    }
  };

  /**
   * Met à jour un objectif
   */
  updateGoal = async (req, res) => {
    try {
      const { goalId } = req.params;
      const { title, description, subgoals } = req.body;
      const userId = req.user.id;
      let imageUrl = null;

      if (req.file) {
        imageUrl = req.file.filename;
      }

      const updateData = {
        title,
        description,
        subgoals,
        imageUrl
      };

      await this.goalsService.updateGoal(goalId, updateData, userId);
      res.json({ message: 'Objectif mis à jour.' });
    } catch (error) {
      console.error('Erreur dans updateGoal:', error);
      
      if (error.message === 'GOAL_NOT_FOUND') {
        return res.status(404).json({ message: 'Objectif non trouvé.' });
      }
      
      if (error.message === 'UNAUTHORIZED') {
        return res.status(403).json({ message: 'Non autorisé à modifier cet objectif.' });
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
   * Supprime un objectif
   */
  deleteGoal = async (req, res) => {
    try {
      const { goalId } = req.params;
      const userId = req.user.id;

      await this.goalsService.deleteGoal(goalId, userId);
      res.json({ message: 'Objectif supprimé.' });
    } catch (error) {
      console.error('Erreur dans deleteGoal:', error);
      
      if (error.message === 'GOAL_NOT_FOUND') {
        return res.status(404).json({ message: 'Objectif non trouvé.' });
      }
      
      if (error.message === 'UNAUTHORIZED') {
        return res.status(403).json({ message: 'Non autorisé à supprimer cet objectif.' });
      }
      
      if (error.message === 'READ_ONLY_ACCESS') {
        return res.status(403).json({ message: 'Accès en lecture seule. Suppression non autorisée.' });
      }
      
      res.status(500).json({ message: 'Erreur serveur.' });
    }
  };
}

module.exports = GoalsController;