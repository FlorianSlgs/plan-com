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
  
  // Vérifier que la date n'est pas dans le futur
  if (birth > today) {
    return { valid: false, message: "La date de naissance ne peut pas être dans le futur." };
  }
  
  // Calculer l'âge
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  // Vérifier que la personne a plus de 12 ans
  if (age <= 12) {
    return { valid: false, message: "Vous devez avoir plus de 12 ans pour vous inscrire." };
  }
  
  return { valid: true };
};

module.exports = (pool, generateToken) => {
  // Register route
  router.post('/register', async (req, res) => {
    const { email, password, lastName, firstName, birthDate } = req.body;

    if (!email || !password || !lastName || !firstName || !birthDate) {
      return res.status(400).json({ message: 'Tous les champs sont requis.' });
    }

    // Validation du mot de passe
    if (!validatePassword(password)) {
      return res.status(400).json({ 
        message: 'Le mot de passe doit contenir au minimum 8 caractères avec au moins une majuscule, une minuscule, un chiffre et un caractère spécial.' 
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
        return res.status(409).json({ message: "L'email est déjà utilisé." });
      }

      // Hash du mot de passe
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

      await pool.query(
        'INSERT INTO users (email, password, last_name, first_name, birth_date) VALUES ($1, $2, $3, $4, $5)',
        [email, hashedPassword, lastName, firstName, birthDate]
      );
      console.log('Utilisateur inscrit:', { email, lastName, firstName, birthDate });

      return res.status(201).json({ message: 'Inscription réussie.' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Erreur serveur.' });
    }
  });

  // Login route
  router.post('/login', async (req, res) => {
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
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    // Ajoute le token dans un cookie HTTP Only
    res.cookie('authToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // true en prod (HTTPS)
      sameSite: 'strict',
      maxAge: 2 * 60 * 60 * 1000 // 2h
    });

    // Ajoute aussi le userId si besoin (optionnel)
    res.cookie('userId', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 2 * 60 * 60 * 1000
    });

    return res.status(200).json({ message: 'Connexion réussie.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
});

  router.post('/logout', (req, res) => {
    res.clearCookie('authToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });
    res.clearCookie('userId', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });
    return res.status(200).json({ message: 'Déconnexion réussie.' });
  });

  router.get('/me', authenticateToken, async (req, res) => {
    // req.user contient les infos du token
    res.status(200).json({ id: req.user.id, email: req.user.email });
  });

  return router;
};