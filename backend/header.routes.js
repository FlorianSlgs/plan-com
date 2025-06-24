const express = require('express');
const router = express.Router();
const authenticateToken = require('./middlewares/auth'); // Utilise votre middleware existant

module.exports = (pool) => {
  // Route protégée pour récupérer les infos de l'utilisateur connecté
  router.get('/user', authenticateToken, async (req, res) => {
    try {
      const result = await pool.query(
        'SELECT first_name, last_name FROM users WHERE id = $1',
        [req.user.id] // Utilise l'ID depuis le token décodé
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Utilisateur non trouvé.' });
      }
      
      res.json(result.rows[0]);
    } catch (err) {
      console.error('Erreur lors de la récupération de l\'utilisateur:', err);
      res.status(500).json({ message: 'Erreur serveur.' });
    }
  });

  // Route protégée pour créer une campagne
  router.post('/campaign', authenticateToken, async (req, res) => {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Nom de campagne requis.' });
    }
    
    try {
      // Insérer la campagne et récupérer l'ID généré
      const result = await pool.query(
        'INSERT INTO campaign (user_id, name) VALUES ($1, $2) RETURNING id, name',
        [req.user.id, name]
      );
      
      const createdCampaign = result.rows[0];
      
      res.status(201).json({ 
        message: 'Campagne créée.',
        campaign: {
          id: createdCampaign.id,
          name: createdCampaign.name
        }
      });
    } catch (err) {
      console.error('Erreur lors de la création de la campagne:', err);
      res.status(500).json({ message: 'Erreur serveur.' });
    }
  });

  // Route protégée pour récupérer les campagnes de l'utilisateur connecté
  router.get('/campaigns', authenticateToken, async (req, res) => {
    try {
      const result = await pool.query(
        'SELECT id, name FROM campaign WHERE user_id = $1 ORDER BY name',
        [req.user.id] // Utilise l'ID depuis le token décodé
      );
      res.json(result.rows);
    } catch (err) {
      console.error('Erreur lors de la récupération des campagnes:', err);
      res.status(500).json({ message: 'Erreur serveur.' });
    }
  });

  // Route protégée pour supprimer une campagne spécifique
  router.delete('/campaign/:campaignId', authenticateToken, async (req, res) => {
    const { campaignId } = req.params;
    const { campaignName } = req.body;
    
    if (!campaignId || !campaignName) {
      return res.status(400).json({ 
        message: 'ID de campagne et nom de campagne requis.',
        success: false 
      });
    }
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Vérifier que la campagne appartient à l'utilisateur connecté et correspond au nom fourni
      const campaignCheck = await client.query(
        'SELECT id, name FROM campaign WHERE id = $1 AND user_id = $2 AND name = $3',
        [campaignId, req.user.id, campaignName]
      );
      
      if (campaignCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(403).json({ 
          message: 'Campagne non trouvée ou accès non autorisé.',
          success: false 
        });
      }
      
      // Supprimer toutes les données liées dans l'ordre des dépendances
      
      // 1. Supprimer les tâches (tasks) liées à cette campagne
      const deleteTasksResult = await client.query(
        'DELETE FROM tasks WHERE user_id = $1 AND currentcampaign = $2',
        [req.user.id, campaignName]
      );
      
      // 2. Supprimer les actions liées à cette campagne
      const deleteActionsResult = await client.query(
        'DELETE FROM actions WHERE user_id = $1 AND currentcampaign = $2',
        [req.user.id, campaignName]
      );
      
      // 3. Supprimer les objectifs (goals) liés à cette campagne
      const deleteGoalsResult = await client.query(
        'DELETE FROM goals WHERE user_id = $1 AND currentcampaign = $2',
        [req.user.id, campaignName]
      );
      
      // 4. Enfin, supprimer la campagne elle-même (les partages seront supprimés automatiquement par ON DELETE CASCADE)
      const deleteCampaignResult = await client.query(
        'DELETE FROM campaign WHERE id = $1 AND user_id = $2 RETURNING id, name',
        [campaignId, req.user.id]
      );
      
      if (deleteCampaignResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ 
          message: 'Campagne non trouvée.',
          success: false 
        });
      }
      
      await client.query('COMMIT');
      
      // Log des suppressions pour information
      console.log(`Campagne supprimée: ${campaignName} (ID: ${campaignId})`);
      console.log(`- ${deleteTasksResult.rowCount} tâches supprimées`);
      console.log(`- ${deleteActionsResult.rowCount} actions supprimées`);
      console.log(`- ${deleteGoalsResult.rowCount} objectifs supprimés`);
      console.log(`- Partages supprimés automatiquement par CASCADE`);
      
      res.json({ 
        message: `Campagne "${campaignName}" et toutes ses données associées ont été supprimées avec succès.`,
        success: true,
        deletedData: {
          tasks: deleteTasksResult.rowCount,
          actions: deleteActionsResult.rowCount,
          goals: deleteGoalsResult.rowCount,
          shares: 'auto-deleted by CASCADE'
        }
      });
      
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Erreur lors de la suppression de la campagne:', err);
      res.status(500).json({ 
        message: 'Erreur serveur lors de la suppression de la campagne.',
        success: false 
      });
    } finally {
      client.release();
    }
  });

  // Route protégée pour supprimer le compte de l'utilisateur connecté
  router.delete('/account', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Supprimer d'abord les campagnes associées à l'utilisateur
      await client.query(
        'DELETE FROM campaign WHERE user_id = $1',
        [req.user.id]
      );
      
      // Puis supprimer l'utilisateur
      const result = await client.query(
        'DELETE FROM users WHERE id = $1 RETURNING id',
        [req.user.id]
      );
      
      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Utilisateur non trouvé.' });
      }
      
      await client.query('COMMIT');
      
      // Supprimer le cookie d'authentification
      res.clearCookie('authToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      });
      
      res.json({ message: 'Compte supprimé avec succès.' });
      
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Erreur lors de la suppression du compte:', err);
      res.status(500).json({ message: 'Erreur serveur lors de la suppression du compte.' });
    } finally {
      client.release();
    }
  });

  // Route protégée pour inviter un utilisateur à une campagne
  router.post('/invite', authenticateToken, async (req, res) => {
    const { email, campaignId, role } = req.body;
    
    // Validation des données d'entrée
    if (!email || !campaignId || !role) {
      return res.status(400).json({ 
        message: 'Email, ID de campagne et rôle sont requis.',
        success: false 
      });
    }

    if (!['reader', 'editor'].includes(role)) {
      return res.status(400).json({ 
        message: 'Le rôle doit être "reader" ou "editor".',
        success: false 
      });
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Vérifier que la campagne appartient à l'utilisateur connecté
      const campaignCheck = await client.query(
        'SELECT id FROM campaign WHERE id = $1 AND user_id = $2',
        [campaignId, req.user.id]
      );
      
      if (campaignCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(403).json({ 
          message: 'Vous n\'avez pas accès à cette campagne.',
          success: false 
        });
      }
      
      // Vérifier si l'email existe dans la table users
      const userResult = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [email.toLowerCase().trim()]
      );
      
      if (userResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(422).json({ 
          message: 'Cet email n\'est pas enregistré dans notre système.',
          success: false 
        });
      }
      
      const invitedUserId = userResult.rows[0].id;
      
      // Vérifier si l'utilisateur ne s'invite pas lui-même
      if (invitedUserId === req.user.id) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          message: 'Vous ne pouvez pas vous inviter vous-même.',
          success: false 
        });
      }
      
      // Vérifier si une invitation/partage existe déjà pour cet utilisateur et cette campagne
      const existingShare = await client.query(
        'SELECT id FROM share_campaigns WHERE user_id = $1 AND campaign_id = $2',
        [invitedUserId, campaignId]
      );
      
      let shareResult;
      
      if (existingShare.rows.length > 0) {
        // Mettre à jour l'invitation existante (écrasement)
        shareResult = await client.query(
          `UPDATE share_campaigns 
          SET wait = $3, accept = $4, refuse = $5, edit = $6, read = $7, updated_at = CURRENT_TIMESTAMP
          WHERE user_id = $1 AND campaign_id = $2 
          RETURNING id`,
          [
            invitedUserId,
            campaignId,
            true,  // wait
            false, // accept
            false, // refuse
            role === 'editor', // edit
            role === 'reader'  // read
          ]
        );
      } else {
        // Créer une nouvelle invitation dans la table share_campaigns
        shareResult = await client.query(
          `INSERT INTO share_campaigns 
          (user_id, campaign_id, wait, accept, refuse, edit, read) 
          VALUES ($1, $2, $3, $4, $5, $6, $7) 
          RETURNING id`,
          [
            invitedUserId,
            campaignId,
            true,  // wait
            false, // accept
            false, // refuse
            role === 'editor', // edit
            role === 'reader'  // read
          ]
        );
      }
      
      if (shareResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(500).json({ 
          message: 'Erreur lors de la création/mise à jour de l\'invitation.',
          success: false 
        });
      }
      
      await client.query('COMMIT');
      
      const actionMessage = existingShare.rows.length > 0 
        ? `Invitation mise à jour avec succès pour ${email} en tant que ${role === 'editor' ? 'éditeur' : 'lecteur'}.`
        : `Invitation envoyée avec succès à ${email} en tant que ${role === 'editor' ? 'éditeur' : 'lecteur'}.`;
      
      res.status(existingShare.rows.length > 0 ? 200 : 201).json({ 
        message: actionMessage,
        success: true 
      });
      
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Erreur lors de l\'invitation d\'utilisateur:', err);
      res.status(500).json({ 
        message: 'Erreur serveur lors de l\'envoi de l\'invitation.',
        success: false 
      });
    } finally {
      client.release();
    }
  });

  return router;
};