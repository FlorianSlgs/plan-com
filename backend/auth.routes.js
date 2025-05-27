const express = require('express');
const router = express.Router();

module.exports = (pool, generateToken) => {
  // Register route
  router.post('/register', async (req, res) => {
    
    const { email, password, lastName, firstName, birthDate } = req.body;

    if (!email || !password || !lastName || !firstName || !birthDate) {
        return res.status(400).json({ message: 'Tous les champs sont requis.' });
    }

    try {
        const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
        return res.status(409).json({ message: "L'email est déjà utilisé." });
        }

        await pool.query(
        'INSERT INTO users (email, password, last_name, first_name, birth_date) VALUES ($1, $2, $3, $4, $5)',
        [email, password, lastName, firstName, birthDate]
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
        const user = await pool.query('SELECT * FROM users WHERE email = $1 AND password = $2', [email, password]);
        if (user.rows.length === 0) {
        return res.status(401).json({ message: 'Identifiants invalides.' });
        }

        const token = generateToken(email);
        return res.status(200).json({ token, id: user.rows[0].id  });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Erreur serveur.' });
    }
    
  });

  

  return router;
};