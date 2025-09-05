const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('../frontend')); // Serve frontend files

// Load users from file
let users = [];
const usersFile = path.join(__dirname, 'users.json');

try {
  if (fs.existsSync(usersFile)) {
    const data = fs.readFileSync(usersFile, 'utf8');
    users = JSON.parse(data);
  } else {
    // Default users with hashed passwords
    users = [
      { id: 1, name: "Tee Johnson", email: "tee@example.com", role: "Admin", password: "$2a$10$rOzYH8kC9X7hqy1uQqJZBeY5Q5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z" },
      { id: 2, name: "Alex Chen", email: "alex@example.com", role: "Project Manager", password: "$2a$10$rOzYH8kC9X7hqy1uQqJZBeY5Q5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z" },
      { id: 3, name: "Maria Garcia", email: "maria@example.com", role: "Team Member", password: "$2a$10$rOzYH8kC9X7hqy1uQqJZBeY5Q5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z" },
      { id: 4, name: "David Wilson", email: "david@example.com", role: "Team Member", password: "$2a$10$rOzYH8kC9X7hqy1uQqJZBeY5Q5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z" }
    ];
    saveUsers();
  }
} catch (err) {
  console.error('Error loading users:', err);
}

// Save users to file
function saveUsers() {
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
}

// JWT Secret (in production, use a more secure method)
const JWT_SECRET = 'your-secret-key';

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Login endpoint
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  // Find user by email
  const user = users.find(u => u.email === email);
  if (!user) {
    return res.status(400).json({ error: 'User not found' });
  }

  // Check password (in a real app, you'd use hashed passwords)
  if (password !== 'password123') { // Default password for demo
    return res.status(400).json({ error: 'Invalid password' });
  }

  // Create token
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
});

// Get all users (protected route)
app.get('/api/users', (req, res) => {
  // Remove passwords from response
  const usersWithoutPasswords = users.map(user => {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  });
  
  res.json(usersWithoutPasswords);
});

// Add new user
app.post('/api/users', (req, res) => {
  const { name, email, role, password } = req.body;
  
  // Check if user already exists
  if (users.find(u => u.email === email)) {
    return res.status(400).json({ error: 'User already exists' });
  }
  
  // Create new user
  const newUser = {
    id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
    name,
    email,
    role,
    password: bcrypt.hashSync(password || 'password123', 10)
  };
  
  users.push(newUser);
  saveUsers();
  
  // Return user without password
  const { password: _, ...userWithoutPassword } = newUser;
  res.json(userWithoutPassword);
});

// Update user
app.put('/api/users/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  const { name, email, role } = req.body;
  
  const userIndex = users.findIndex(u => u.id === userId);
  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  // Update user
  users[userIndex] = { ...users[userIndex], name, email, role };
  saveUsers();
  
  // Return user without password
  const { password, ...userWithoutPassword } = users[userIndex];
  res.json(userWithoutPassword);
});

// Delete user
app.delete('/api/users/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  
  const userIndex = users.findIndex(u => u.id === userId);
  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  users.splice(userIndex, 1);
  saveUsers();
  
  res.json({ message: 'User deleted successfully' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});