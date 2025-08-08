const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Middleware pour vérifier l'accès aux images de goals
 * Intercepte les requêtes vers /uploads/goals_images/ et vérifie les permissions
 */
function authenticateGoalImage(pool) {
  return async (req, res, next) => {
    try {
      // Récupère le token depuis les cookies
      const token = req.cookies.authToken;
      if (!token) {
        return res.status(401).json({ message: 'Non authentifié' });
      }

      // Vérifie le token JWT
      let user;
      try {
        user = jwt.verify(token, JWT_SECRET);
      } catch (err) {
        return res.status(403).json({ message: 'Token invalide' });
      }

      // Extrait le nom du fichier image de l'URL
      // req.path sera quelque chose comme "/image1234.jpg" 
      const imageFileName = req.path.substring(1); // Enlève le "/" du début
      
      if (!imageFileName) {
        return res.status(404).json({ message: 'Image non trouvée' });
      }

      // Vérifie si l'utilisateur peut accéder à cette image
      const goalResult = await pool.query(
        'SELECT id, campaign_id, user_id FROM goals WHERE goals_imageurl = $1',
        [imageFileName]
      );

      if (goalResult.rows.length === 0) {
        return res.status(404).json({ message: 'Image non trouvée' });
      }

      const goal = goalResult.rows[0];

      // Si l'utilisateur est propriétaire du goal, accès direct
      if (goal.user_id === user.id) {
        return next();
      }

      // Sinon, vérifie l'accès via la campagne (propriétaire)
      const ownerCheck = await pool.query(
        'SELECT id FROM campaign WHERE id = $1 AND user_id = $2',
        [goal.campaign_id, user.id]
      );

      if (ownerCheck.rows.length > 0) {
        return next();
      }

      // Vérifie l'accès via share_campaigns
      const shareCheck = await pool.query(
        'SELECT id FROM share_campaigns WHERE campaign_id = $1 AND user_id = $2',
        [goal.campaign_id, user.id]
      );

      if (shareCheck.rows.length > 0) {
        return next();
      }

      // Aucun accès trouvé
      return res.status(403).json({ message: 'Accès non autorisé à cette image' });

    } catch (error) {
      console.error('Erreur dans le middleware d\'authentification d\'image:', error);
      return res.status(500).json({ message: 'Erreur serveur' });
    }
  };
}

module.exports = authenticateGoalImage;