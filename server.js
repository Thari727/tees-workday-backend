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

// Load users from file
let users = [];
const usersFile = path.join(__dirname, 'users.json');

try {
  if (fs.existsSync(usersFile)) {
    const data = fs.readFileSync(usersFile, 'utf8');
    users = JSON.parse(data);
  } else {
    // Default users
    users = [
      { id: 1, name: "Tee Johnson", email: "tee@example.com", role: "Admin", password: "password123" },
      { id: 2, name: "Alex Chen", email: "alex@example.com", role: "Project Manager", password: "password123" },
      { id: 3, name: "Maria Garcia", email: "maria@example.com", role: "Team Member", password: "password123" },
      { id: 4, name: "David Wilson", email: "david@example.com", role: "Team Member", password: "password123" }
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

// JWT Secret
const JWT_SECRET = 'your-secret-key';

// Routes
app.get('/', (req, res) => {
  res.send('Tee\'s Workday Backend is running! Visit /api/users to see user data.');
});

// Get all users
app.get('/api/users', (req, res) => {
  try {
    // Remove passwords from response
    const usersWithoutPasswords = users.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
    
    console.log('Sending users:', usersWithoutPasswords);
    res.json(usersWithoutPasswords);
  } catch (error) {
    console.error('Error in /api/users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }

    // Check password
    if (password !== user.password) {
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
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add new user
app.post('/api/users', (req, res) => {
  try {
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
      password: password || 'password123'
    };
    
    users.push(newUser);
    saveUsers();
    
    // Return user without password
    const { password: _, ...userWithoutPassword } = newUser;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Error adding user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});