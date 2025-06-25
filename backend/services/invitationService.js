// invitationService.js
const invitationService = {
  async getPendingInvitations(pool, userId) {
    const client = await pool.connect();
    
    try {
      const query = `
        SELECT 
          sc.id,
          sc.campaign_id,
          sc.edit,
          sc.read,
          c.name as campaign_name,
          u.first_name as inviter_first_name,
          u.last_name as inviter_last_name
        FROM share_campaigns sc
        JOIN campaign c ON sc.campaign_id = c.id
        JOIN users u ON c.user_id = u.id
        WHERE sc.user_id = $1 AND sc.wait = true
        ORDER BY sc.created_at DESC
      `;
      
      const result = await client.query(query, [userId]);
      
      return result.rows.map(row => ({
        id: row.id,
        campaignId: row.campaign_id,
        campaignName: row.campaign_name,
        inviterName: `${row.inviter_first_name} ${row.inviter_last_name}`,
        role: row.edit ? 'editor' : 'reader'
      }));
      
    } finally {
      client.release();
    }
  },

  async acceptInvitation(pool, invitationId, userId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Vérifier que l'invitation appartient à l'utilisateur et est en attente
      const checkQuery = `
        SELECT id, campaign_id 
        FROM share_campaigns 
        WHERE id = $1 AND user_id = $2 AND wait = true
      `;
      const checkResult = await client.query(checkQuery, [invitationId, userId]);
      
      if (checkResult.rows.length === 0) {
        const error = new Error('Invitation non trouvée ou déjà traitée.');
        error.status = 404;
        throw error;
      }
      
      // Accepter l'invitation
      const updateQuery = `
        UPDATE share_campaigns 
        SET wait = false, accept = true, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING campaign_id
      `;
      const result = await client.query(updateQuery, [invitationId]);
      
      await client.query('COMMIT');
      
      return {
        message: 'Invitation acceptée avec succès.',
        campaignId: result.rows[0].campaign_id
      };
      
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async rejectInvitation(pool, invitationId, userId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Vérifier que l'invitation appartient à l'utilisateur et est en attente
      const checkQuery = `
        SELECT id 
        FROM share_campaigns 
        WHERE id = $1 AND user_id = $2 AND wait = true
      `;
      const checkResult = await client.query(checkQuery, [invitationId, userId]);
      
      if (checkResult.rows.length === 0) {
        const error = new Error('Invitation non trouvée ou déjà traitée.');
        error.status = 404;
        throw error;
      }
      
      // Supprimer l'invitation
      await client.query('DELETE FROM share_campaigns WHERE id = $1', [invitationId]);
      
      await client.query('COMMIT');
      
      return {
        message: 'Invitation refusée avec succès.'
      };
      
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
};

module.exports = invitationService;