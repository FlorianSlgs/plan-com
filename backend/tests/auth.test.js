const request = require('supertest');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const createTestApp = require('./helpers/createTestApp');

describe('Auth Routes', () => {
  let app;
  let pool;

  beforeAll(() => {
    pool = global.testPool;
    app = createTestApp(pool);
  });

  describe('POST /api/auth/register', () => {
    const validUserData = {
      email: 'test@example.com',
      password: 'TestPassword123!',
      lastName: 'Doe',
      firstName: 'John',
      birthDate: '1990-01-01'
    };

    test('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(201);

      expect(response.body.message).toBe('Inscription réussie.');
    });

    test('should reject registration with missing fields', async () => {
      const incompleteData = {
        email: 'test@example.com',
        password: 'TestPassword123!'
        // Missing other required fields
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(incompleteData)
        .expect(400);

      expect(response.body.message).toBe('Tous les champs sont requis.');
    });

    test('should reject weak password', async () => {
      const weakPasswordData = {
        ...validUserData,
        password: 'weak'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(weakPasswordData)
        .expect(400);

      expect(response.body.message).toContain('Le mot de passe doit contenir au minimum 8 caractères');
    });

    test('should reject user under 12 years old', async () => {
      const today = new Date();
      const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
      
      const youngUserData = {
        ...validUserData,
        birthDate: oneYearAgo.toISOString().split('T')[0]
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(youngUserData)
        .expect(400);

      expect(response.body.message).toContain('Vous devez avoir plus de 12 ans');
    });

    test('should reject duplicate email', async () => {
      // First registration
      await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(201);

      // Second registration with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(409);

      expect(response.body.message).toBe("L'email est déjà utilisé.");
    });
  });

  describe('POST /api/auth/login', () => {
    const userData = {
      email: 'test@example.com',
      password: 'TestPassword123!',
      lastName: 'Doe',
      firstName: 'John',
      birthDate: '1990-01-01'
    };

    beforeEach(async () => {
      // Créer un utilisateur pour les tests de login
      await request(app)
        .post('/api/auth/register')
        .send(userData);
    });

    test('should login successfully with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        })
        .expect(200);

      expect(response.body.message).toBe('Connexion réussie.');
      expect(response.body).toHaveProperty('isAdmin');
      
      // Vérifier que le cookie est défini
      expect(response.headers['set-cookie']).toBeDefined();
      const cookies = response.headers['set-cookie'];
      const authCookie = cookies.find(cookie => cookie.includes('authToken='));
      expect(authCookie).toBeDefined();
    });

    test('should reject login with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'wrong@example.com',
          password: userData.password
        })
        .expect(401);

      expect(response.body.message).toBe('Identifiants invalides.');
    });

    test('should reject login with invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body.message).toBe('Identifiants invalides.');
    });

    test('should reject login with missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email
          // Missing password
        })
        .expect(400);

      expect(response.body.message).toBe('Email et mot de passe requis.');
    });
  });

  describe('POST /api/auth/logout', () => {
    test('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(200);

      expect(response.body.message).toBe('Déconnexion réussie.');
      
      // Vérifier que le cookie est supprimé
      expect(response.headers['set-cookie']).toBeDefined();
      const cookies = response.headers['set-cookie'];
      const authCookie = cookies.find(cookie => cookie.includes('authToken='));
      expect(authCookie).toContain('authToken=;');
    });
  });

  describe('GET /api/auth/me', () => {
    let authToken;
    let userId;

    beforeEach(async () => {
      // Créer et connecter un utilisateur
      const userData = {
        email: 'test@example.com',
        password: 'TestPassword123!',
        lastName: 'Doe',
        firstName: 'John',
        birthDate: '1990-01-01'
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData);

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        });

      // Extraire le token du cookie de manière plus robuste
      const cookies = loginResponse.headers['set-cookie'];
      if (cookies) {
        const authCookie = cookies.find(cookie => cookie.includes('authToken='));
        if (authCookie) {
          // Extraire le token entre authToken= et le premier ;
          const match = authCookie.match(/authToken=([^;]+)/);
          if (match) {
            authToken = match[1];
            
            // Décoder le token pour obtenir l'ID utilisateur
            try {
              const decoded = jwt.decode(authToken);
              userId = decoded.id;
            } catch (error) {
              console.error('Error decoding token:', error);
            }
          }
        }
      }
    });

    test('should return user info with valid token', async () => {
      if (!authToken) {
        throw new Error('Auth token not available for test');
      }

      const response = await request(app)
        .get('/api/auth/me')
        .set('Cookie', [`authToken=${authToken}`])
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('email', 'test@example.com');
      expect(response.body).toHaveProperty('isAdmin', false);
    });
  });

  describe('POST /api/auth/change-password', () => {
    let authToken;
    const userData = {
      email: 'test@example.com',
      password: 'TestPassword123!',
      lastName: 'Doe',
      firstName: 'John',
      birthDate: '1990-01-01'
    };

    beforeEach(async () => {
      await request(app)
        .post('/api/auth/register')
        .send(userData);

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        });

      const cookies = loginResponse.headers['set-cookie'];
      if (cookies) {
        const authCookie = cookies.find(cookie => cookie.includes('authToken='));
        if (authCookie) {
          const match = authCookie.match(/authToken=([^;]+)/);
          if (match) {
            authToken = match[1];
          }
        }
      }
    });

    test('should change password successfully', async () => {
      const newPassword = 'NewPassword123!';
      
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Cookie', [`authToken=${authToken}`])
        .send({
          currentPassword: userData.password,
          newPassword: newPassword,
          confirmPassword: newPassword
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Mot de passe modifié avec succès');

      // Vérifier que l'ancien mot de passe ne fonctionne plus
      await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        })
        .expect(401);

      // Vérifier que le nouveau mot de passe fonctionne
      await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: newPassword
        })
        .expect(200);
    });

    test('should reject change with wrong current password', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Cookie', [`authToken=${authToken}`])
        .send({
          currentPassword: 'WrongPassword123!',
          newPassword: 'NewPassword123!',
          confirmPassword: 'NewPassword123!'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Le mot de passe actuel est incorrect');
    });

    test('should reject change when passwords do not match', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Cookie', [`authToken=${authToken}`])
        .send({
          currentPassword: userData.password,
          newPassword: 'NewPassword123!',
          confirmPassword: 'DifferentPassword123!'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Les mots de passe ne correspondent pas');
    });

    test('should reject weak new password', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Cookie', [`authToken=${authToken}`])
        .send({
          currentPassword: userData.password,
          newPassword: 'weak',
          confirmPassword: 'weak'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('8 caractères avec au moins');
    });

    test('should reject same password', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Cookie', [`authToken=${authToken}`])
        .send({
          currentPassword: userData.password,
          newPassword: userData.password,
          confirmPassword: userData.password
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Le nouveau mot de passe doit être différent du mot de passe actuel');
    });
  });
});