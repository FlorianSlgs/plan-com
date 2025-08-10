// Mock du middleware d'authentification
const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const token = req.cookies?.authToken;

  if (!token) {
    return res.status(401).json({ message: 'Token d\'authentification requis' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Token invalide' });
  }
};

module.exports = authenticateToken;