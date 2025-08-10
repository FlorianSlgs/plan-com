const request = require('supertest');
const createTestApp = require('../helpers/createTestApp');

describe('Auth Integration Tests', () => {
  let app;
  let pool;

  beforeAll(() => {
    pool = global.testPool;
    app = createTestApp(pool);
  });

  describe('Complete user journey', () => {
    test('should complete full auth flow: register -> login -> me -> change password -> logout', async () => {
      const userData = {
        email: 'integration@example.com',
        password: 'TestPassword123!',
        lastName: 'Integration',
        firstName: 'Test',
        birthDate: '1990-01-01'
      };

      // 1. Register
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // 2. Login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        })
        .expect(200);

      const cookies = loginResponse.headers['set-cookie'];
      const authCookie = cookies.find(cookie => cookie.startsWith('authToken='));
      const authToken = authCookie.split('=')[1].split(';')[0];

      // 3. Get user info
      const meResponse = await request(app)
        .get('/api/auth/me')
        .set('Cookie', [`authToken=${authToken}`])
        .expect(200);

      expect(meResponse.body.email).toBe(userData.email);

      // 4. Change password
      const newPassword = 'NewPassword123!';
      await request(app)
        .post('/api/auth/change-password')
        .set('Cookie', [`authToken=${authToken}`])
        .send({
          currentPassword: userData.password,
          newPassword: newPassword,
          confirmPassword: newPassword
        })
        .expect(200);

      // 5. Logout
      await request(app)
        .post('/api/auth/logout')
        .expect(200);

      // 6. Verify old password doesn't work
      await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        })
        .expect(401);

      // 7. Verify new password works
      await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: newPassword
        })
        .expect(200);
    });
  });
});