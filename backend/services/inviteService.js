const inviteService = {
  async createInvitation(pool, email, campaignId, role, inviterId) {
    // Validation
    if (!email || !campaignId || !role) {
      const error = new Error('Email, ID de campagne et rôle sont requis.');
      error.status = 400;
      throw error;
    }

    if (!['reader', 'editor'].includes(role)) {
      const error = new Error('Le rôle doit être "reader" ou "editor".');
      error.status = 400;
      throw error;
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Vérifications
      await this._validateCampaignAccess(client, campaignId, inviterId);
      const invitedUserId = await this._validateInvitedUser(client, email, inviterId);
      
      // Création ou mise à jour de l'invitation
      const isUpdate = await this._checkExistingInvitation(client, invitedUserId, campaignId);
      await this._createOrUpdateInvitation(client, invitedUserId, campaignId, role, isUpdate);
      
      await client.query('COMMIT');
      
      const actionMessage = isUpdate
        ? `Invitation mise à jour avec succès pour ${email} en tant que ${role === 'editor' ? 'éditeur' : 'lecteur'}.`
        : `Invitation envoyée avec succès à ${email} en tant que ${role === 'editor' ? 'éditeur' : 'lecteur'}.`;
      
      return { message: actionMessage, isUpdate };
      
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async _validateCampaignAccess(client, campaignId, userId) {
    const campaignCheck = await client.query(
      'SELECT id FROM campaign WHERE id = $1 AND user_id = $2',
      [campaignId, userId]
    );
    
    if (campaignCheck.rows.length === 0) {
      const error = new Error('Vous n\'avez pas accès à cette campagne.');
      error.status = 403;
      throw error;
    }
  },

  async _validateInvitedUser(client, email, inviterId) {
    const userResult = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );
    
    if (userResult.rows.length === 0) {
      const error = new Error('Cet email n\'est pas enregistré dans notre système.');
      error.status = 422;
      throw error;
    }
    
    const invitedUserId = userResult.rows[0].id;
    
    if (invitedUserId === inviterId) {
      const error = new Error('Vous ne pouvez pas vous inviter vous-même.');
      error.status = 400;
      throw error;
    }
    
    return invitedUserId;
  },

  async _checkExistingInvitation(client, userId, campaignId) {
    const existingShare = await client.query(
      'SELECT id FROM share_campaigns WHERE user_id = $1 AND campaign_id = $2',
      [userId, campaignId]
    );
    
    return existingShare.rows.length > 0;
  },

  async _createOrUpdateInvitation(client, userId, campaignId, role, isUpdate) {
    const params = [
      userId,
      campaignId,
      true,  // wait
      false, // accept
      false, // refuse
      role === 'reader' // read: true pour lecteur, false pour éditeur
    ];

    let query;
    if (isUpdate) {
      query = `UPDATE share_campaigns 
        SET wait = $3, accept = $4, refuse = $5, read = $6, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $1 AND campaign_id = $2 
        RETURNING id`;
    } else {
      query = `INSERT INTO share_campaigns 
        (user_id, campaign_id, wait, accept, refuse, read) 
        VALUES ($1, $2, $3, $4, $5, $6) 
        RETURNING id`;
    }

    const result = await client.query(query, params);
    
    if (result.rows.length === 0) {
      const error = new Error('Erreur lors de la création/mise à jour de l\'invitation.');
      error.status = 500;
      throw error;
    }
  }
};

module.exports = inviteService;