const express = require('express');
const router = express.Router();

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const authenticateToken = require('./middlewares/auth');

const JWT_SECRET = process.env.JWT_SECRET
const SALT_ROUNDS = 10;

// Fonction pour valider le mot de passe
const validatePassword = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  return password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar;
};

// Fonction pour valider la date de naissance
const validateBirthDate = (birthDate) => {
  const today = new Date();
  const birth = new Date(birthDate);
  
  // VÃ©rifier que la date n'est pas dans le futur
  if (birth > today) {
    return { valid: false, message: "La date de naissance ne peut pas Ãªtre dans le futur." };
  }
  
  // Calculer l'Ã¢ge
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  // VÃ©rifier que la personne a plus de 12 ans
  if (age <= 12) {
    return { valid: false, message: "Vous devez avoir plus de 12 ans pour vous inscrire." };
  }
  
  return { valid: true };
};

module.exports = (pool) => {
  // Register route
  router.post('/register', async (req, res) => {
    const { email, password, lastName, firstName, birthDate } = req.body;

    if (!email || !password || !lastName || !firstName || !birthDate) {
      return res.status(400).json({ message: 'Tous les champs sont requis.' });
    }

    // Validation du mot de passe
    if (!validatePassword(password)) {
      return res.status(400).json({ 
        message: 'Le mot de passe doit contenir au minimum 8 caractÃ¨res avec au moins une majuscule, une minuscule, un chiffre et un caractÃ¨re spÃ©cial.' 
      });
    }

    // Validation de la date de naissance
    const birthDateValidation = validateBirthDate(birthDate);
    if (!birthDateValidation.valid) {
      return res.status(400).json({ message: birthDateValidation.message });
    }

    try {
      const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      if (existingUser.rows.length > 0) {
        return res.status(409).json({ message: "L'email est dÃ©jÃ  utilisÃ©." });
      }

      // Hash du mot de passe
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

      await pool.query(
        'INSERT INTO users (email, password, last_name, first_name, birth_date) VALUES ($1, $2, $3, $4, $5)',
        [email, hashedPassword, lastName, firstName, birthDate]
      );
      console.log('Utilisateur inscrit:', { email, lastName, firstName, birthDate });

      return res.status(201).json({ message: 'Inscription rÃ©ussie.' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Erreur serveur.' });
    }
  });

  // Login route
  router.post('/login', async (req, res) => {
    // Console.log pour debug HTTP/HTTPS
    console.log('🔍 DEBUG LOGIN - Protocole détecté:', req.secure ? 'HTTPS' : 'HTTP');
    console.log('🔍 Headers reçus:', {
      'x-forwarded-proto': req.headers['x-forwarded-proto'],
      'x-forwarded-for': req.headers['x-forwarded-for'],
      'host': req.headers.host,
      'user-agent': req.headers['user-agent'],
      'origin': req.headers.origin,
      'referer': req.headers.referer
    });
    
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email et mot de passe requis.' });
    }

    try {
      const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      if (userResult.rows.length === 0) {
        return res.status(401).json({ message: 'Identifiants invalides.' });
      }

      const user = userResult.rows[0];
      const passwordMatch = await bcrypt.compare(password, user.password);

      if (!passwordMatch) {
        return res.status(401).json({ message: 'Identifiants invalides.' });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, isAdmin: user.admin || false },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Console.log pour debug cookie
      console.log('🍪 Configuration cookie:', {
        httpOnly: true,
        secure: process.env.SECURE,
        sameSite: process.env.SAMESITE,
        domain: process.env.DOMAIN,
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      // Ajoute le token dans un cookie HTTP Only
      res.cookie('authToken', token, {
        httpOnly: true,
        secure: true,
        sameSite: "None",
        domain: ".duckdns.org",
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      return res.status(200).json({ 
        message: 'Connexion rÃ©ussie.',
        isAdmin: user.admin || false
      });
    } catch (err) {
      return res.status(500).json({ message: 'Erreur serveur.' });
    }
  });

  // Logout route
  router.post('/logout', (req, res) => {
    res.clearCookie('authToken', {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      domain: ".duckdns.org",
    });
    return res.status(200).json({ message: 'DÃ©connexion rÃ©ussie.' });
  });

  // Me route
  router.get('/me', authenticateToken, async (req, res) => {
    try {
      // RÃ©cupÃ©rer les informations complÃ¨tes de l'utilisateur depuis la base de donnÃ©es
      const userResult = await pool.query('SELECT id, email, admin FROM users WHERE id = $1', [req.user.id]);
      
      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: 'Utilisateur non trouvÃ©.' });
      }

      const user = userResult.rows[0];
      
      // req.user contient les infos du token, mais on rÃ©cupÃ¨re les infos fraÃ®ches de la DB
      res.status(200).json({ 
        id: user.id, 
        email: user.email,
        isAdmin: user.admin || false
      });
    } catch (err) {
      console.error('Erreur lors de la rÃ©cupÃ©ration des informations utilisateur:', err);
      return res.status(500).json({ message: 'Erreur serveur.' });
    }
  });

  // Change password route
  router.post('/change-password', authenticateToken, async (req, res) => {
    try {
      const { currentPassword, newPassword, confirmPassword } = req.body;
      const userId = req.user.id; // RÃ©cupÃ©rÃ© du token d'authentification

      // Validation des donnÃ©es d'entrÃ©e
      if (!currentPassword || !newPassword || !confirmPassword) {
        return res.status(400).json({
          success: false,
          message: 'Tous les champs sont requis'
        });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({
          success: false,
          message: 'Les mots de passe ne correspondent pas'
        });
      }

      // Validation de la complexitÃ© du nouveau mot de passe
      if (!validatePassword(newPassword)) {
        return res.status(400).json({
          success: false,
          message: 'Le nouveau mot de passe doit contenir au minimum 8 caractÃ¨res avec au moins une majuscule, une minuscule, un chiffre et un caractÃ¨re spÃ©cial'
        });
      }

      // RÃ©cupÃ©rer l'utilisateur depuis la base de donnÃ©es
      const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Utilisateur non trouvÃ©'
        });
      }

      const user = userResult.rows[0];

      // VÃ©rifier le mot de passe actuel
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Le mot de passe actuel est incorrect'
        });
      }

      // VÃ©rifier que le nouveau mot de passe est diffÃ©rent de l'ancien
      const isSamePassword = await bcrypt.compare(newPassword, user.password);
      if (isSamePassword) {
        return res.status(400).json({
          success: false,
          message: 'Le nouveau mot de passe doit Ãªtre diffÃ©rent du mot de passe actuel'
        });
      }

      // Hasher le nouveau mot de passe
      const hashedNewPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

      // Mettre Ã  jour le mot de passe dans la base de donnÃ©es
      await pool.query(
        'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [hashedNewPassword, userId]
      );

      console.log('Mot de passe modifiÃ© pour l\'utilisateur:', userId);

      // RÃ©ponse de succÃ¨s
      res.status(200).json({
        success: true,
        message: 'Mot de passe modifiÃ© avec succÃ¨s'
      });

    } catch (error) {
      console.error('Erreur lors du changement de mot de passe:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur'
      });
    }
  });

  return router;
};