const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
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

// Routes
app.get('/', (req, res) => {
  res.send('Tee\'s Workday Backend is running! Visit /api/users to see user data.');
});

app.get('/api/users', (req, res) => {
  try {
    // Remove passwords from response
    const usersWithoutPasswords = users.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
    res.json(usersWithoutPasswords);
  } catch (error) {
    console.error('Error in /api/users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Login endpoint (for future use)
app.post('/api/login', (req, res) => {
  // Simplified login for now
  res.json({ message: 'Login endpoint is working' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});