const jwt = require('jsonwebtoken');

const createAuthToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, isAdmin: user.admin || false },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '7d' }
  );
};

const createAuthenticatedUser = async (pool, userData = {}) => {
  const defaultData = {
    email: 'test@example.com',
    password: 'TestPassword123!',
    lastName: 'Doe',
    firstName: 'John',
    birthDate: '1990-01-01',
    admin: false
  };

  const user = { ...defaultData, ...userData };
  const hashedPassword = await require('bcrypt').hash(user.password, 10);

  const result = await pool.query(
    'INSERT INTO users (email, password, last_name, first_name, birth_date, admin) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
    [user.email, hashedPassword, user.lastName, user.firstName, user.birthDate, user.admin]
  );

  const createdUser = result.rows[0];
  const token = createAuthToken(createdUser);

  return { user: createdUser, token };
};

module.exports = {
  createAuthToken,
  createAuthenticatedUser
};