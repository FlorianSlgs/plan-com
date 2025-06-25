const userController = {
  getUser: (pool) => async (req, res) => {
    try {
      const result = await pool.query(
        'SELECT first_name, last_name FROM users WHERE id = $1',
        [req.user.id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Utilisateur non trouvé.' });
      }
      
      res.json(result.rows[0]);
    } catch (err) {
      console.error('Erreur lors de la récupération de l\'utilisateur:', err);
      res.status(500).json({ message: 'Erreur serveur.' });
    }
  },

  deleteAccount: (pool) => async (req, res) => {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      await client.query('DELETE FROM campaign WHERE user_id = $1', [req.user.id]);
      
      const result = await client.query(
        'DELETE FROM users WHERE id = $1 RETURNING id',
        [req.user.id]
      );
      
      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Utilisateur non trouvé.' });
      }
      
      await client.query('COMMIT');
      
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
  }
};

module.exports = userController;