const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

function requireAdmin(pool) {
  return async (req, res, next) => {
    try {
      // Vérifier d'abord le token JWT
      const token = req.cookies.authToken;
      if (!token) {
        return res.status(401).json({ message: 'Token d\'authentification requis.' });
      }

      // Vérifier et décoder le token
      jwt.verify(token, JWT_SECRET, async (err, user) => {
        if (err) {
          return res.status(403).json({ message: 'Token invalide.' });
        }

        try {
          // Vérifier en base de données que l'utilisateur existe et est admin
          const userResult = await pool.query(
            'SELECT id, email, admin FROM users WHERE id = $1', 
            [user.id]
          );

          if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'Utilisateur non trouvé.' });
          }

          const dbUser = userResult.rows[0];

          // Vérifier que l'utilisateur est admin
          if (!dbUser.admin) {
            return res.status(403).json({ message: 'Accès administrateur requis.' });
          }

          // Ajouter les informations utilisateur à la requête
          req.user = {
            id: dbUser.id,
            email: dbUser.email,
            isAdmin: dbUser.admin
          };

          console.log('Admin authentifié:', req.user.email);
          next();
        } catch (dbError) {
          console.error('Erreur de vérification admin:', dbError);
          return res.status(500).json({ message: 'Erreur serveur lors de la vérification.' });
        }
      });
    } catch (error) {
      console.error('Erreur middleware admin:', error);
      return res.status(500).json({ message: 'Erreur serveur.' });
    }
  };
}

module.exports = requireAdmin;