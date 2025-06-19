const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

function authenticateToken(req, res, next) {
  const token = req.cookies.authToken;
  if (!token) return res.sendStatus(401);
  console.log('Authenticating token:', token);
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
  console.log('Token authenticated:', req.user);
}

module.exports = authenticateToken;