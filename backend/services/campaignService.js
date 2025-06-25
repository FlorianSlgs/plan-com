const campaignService = {
  async deleteCampaignWithData(pool, campaignId, campaignName, userId) {
    if (!campaignId || !campaignName) {
      const error = new Error('ID de campagne et nom de campagne requis.');
      error.status = 400;
      throw error;
    }
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Vérification d'accès
      const campaignCheck = await client.query(
        'SELECT id, name FROM campaign WHERE id = $1 AND user_id = $2 AND name = $3',
        [campaignId, userId, campaignName]
      );
      
      if (campaignCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        const error = new Error('Campagne non trouvée ou accès non autorisé.');
        error.status = 403;
        throw error;
      }
      
      // Suppression en cascade
      const deleteTasksResult = await client.query(
        'DELETE FROM tasks WHERE user_id = $1 AND currentcampaign = $2',
        [userId, campaignName]
      );
      
      const deleteActionsResult = await client.query(
        'DELETE FROM actions WHERE user_id = $1 AND currentcampaign = $2',
        [userId, campaignName]
      );
      
      const deleteGoalsResult = await client.query(
        'DELETE FROM goals WHERE user_id = $1 AND currentcampaign = $2',
        [userId, campaignName]
      );
      
      const deleteCampaignResult = await client.query(
        'DELETE FROM campaign WHERE id = $1 AND user_id = $2 RETURNING id, name',
        [campaignId, userId]
      );
      
      if (deleteCampaignResult.rows.length === 0) {
        await client.query('ROLLBACK');
        const error = new Error('Campagne non trouvée.');
        error.status = 404;
        throw error;
      }
      
      await client.query('COMMIT');
      
      return {
        message: `Campagne "${campaignName}" et toutes ses données associées ont été supprimées avec succès.`,
        success: true,
        deletedData: {
          tasks: deleteTasksResult.rowCount,
          actions: deleteActionsResult.rowCount,
          goals: deleteGoalsResult.rowCount,
          shares: 'auto-deleted by CASCADE'
        }
      };
      
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
};

module.exports = campaignService;