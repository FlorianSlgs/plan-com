// Mock simple de la base de données PostgreSQL
const mockUsers = [];
let userIdCounter = 1;

// Mock du pool PostgreSQL
const mockPool = {
  query: jest.fn().mockImplementation((sql, params = []) => {
    console.log('Mock query:', sql, params);
    
    // Mock pour INSERT users (register)
    if (sql.includes('INSERT INTO users')) {
      const [email, password, lastName, firstName, birthDate] = params;
      
      // Vérifier si l'email existe déjà
      const existingUser = mockUsers.find(user => user.email === email);
      if (existingUser) {
        throw new Error('Email already exists');
      }
      
      const newUser = {
        id: userIdCounter++,
        email,
        password,
        last_name: lastName,
        first_name: firstName,
        birth_date: birthDate,
        admin: false,
        created_at: new Date(),
        updated_at: new Date()
      };
      
      mockUsers.push(newUser);
      return Promise.resolve({ rows: [newUser] });
    }
    
    // Mock pour SELECT users (login, me, etc.)
    if (sql.includes('SELECT * FROM users WHERE email =')) {
      const [email] = params;
      const user = mockUsers.find(u => u.email === email);
      return Promise.resolve({ 
        rows: user ? [user] : []
      });
    }
    
    // Mock pour SELECT users WHERE id =
    if (sql.includes('SELECT * FROM users WHERE id =') || sql.includes('SELECT id, email, admin FROM users WHERE id =')) {
      const [id] = params;
      const user = mockUsers.find(u => u.id === parseInt(id));
      return Promise.resolve({ 
        rows: user ? [user] : []
      });
    }
    
    // Mock pour UPDATE users (change password)
    if (sql.includes('UPDATE users SET password =')) {
      const [newPassword, userId] = params;
      const userIndex = mockUsers.findIndex(u => u.id === parseInt(userId));
      if (userIndex !== -1) {
        mockUsers[userIndex].password = newPassword;
        mockUsers[userIndex].updated_at = new Date();
        return Promise.resolve({ rows: [mockUsers[userIndex]] });
      }
      return Promise.resolve({ rows: [] });
    }
    
    // Default return
    return Promise.resolve({ rows: [] });
  })
};

beforeEach(() => {
  // Nettoyer les utilisateurs mock avant chaque test
  mockUsers.length = 0;
  userIdCounter = 1;
  
  // Reset les mocks
  mockPool.query.mockClear();
});

// Variables d'environnement pour les tests
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.NODE_ENV = 'test';

// Exporter le pool de test
global.testPool = mockPool;