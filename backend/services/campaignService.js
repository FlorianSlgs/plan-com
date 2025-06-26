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
      
      // Vérification d'accès et suppression en une seule requête
      const deleteCampaignResult = await client.query(
        'DELETE FROM campaign WHERE id = $1 AND user_id = $2 AND name = $3 RETURNING id, name',
        [campaignId, userId, campaignName]
      );
      
      if (deleteCampaignResult.rows.length === 0) {
        await client.query('ROLLBACK');
        const error = new Error('Campagne non trouvée ou accès non autorisé.');
        error.status = 403;
        throw error;
      }
      
      await client.query('COMMIT');
      
      return {
        message: `Campagne "${campaignName}" et toutes ses données associées ont été supprimées avec succès.`,
        success: true,
        note: 'Les données associées (tasks, actions, goals, shares) ont été supprimées automatiquement par CASCADE.'
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