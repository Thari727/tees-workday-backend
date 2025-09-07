const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware - CORS configured for your Netlify URL
app.use(cors({
    origin: [
        'https://keen-lamington-c29374.netlify.app',
        'http://localhost:3000'
    ],
    credentials: true
}));
app.use(bodyParser.json());

// MongoDB connection - USING YOUR CREDENTIALS
const MONGODB_URI = 'mongodb+srv://tharindra727_db_user:Pakaya%406769@cluster0.o0suwqt.mongodb.net/teesworkday?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// User schema for MongoDB
const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    role: String,
    password: String
});

const User = mongoose.model('User', userSchema);

// Project schema
const projectSchema = new mongoose.Schema({
    name: String,
    description: String,
    startDate: Date,
    dueDate: Date,
    manager: String,
    tasks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
    showTasks: { type: Boolean, default: true }
});

const Project = mongoose.model('Project', projectSchema);

// Task schema
const taskSchema = new mongoose.Schema({
    name: String,
    description: String,
    assignee: String,
    support: String,
    startDate: Date,
    dueDate: Date,
    status: { type: String, default: 'not-started' },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' }
});

const Task = mongoose.model('Task', taskSchema);

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'tees-workday-secret-key-2023';

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// Routes
app.get('/', (req, res) => {
    res.send('Tee\'s Workday Backend is running with MongoDB! Visit /api/users to see user data.');
});

// Get all users
app.get('/api/users', authenticateToken, async (req, res) => {
    try {
        const users = await User.find({}, { password: 0 });
        res.json(users);
    } catch (error) {
        console.error('Error in /api/users:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create new user (Admin only)
app.post('/api/users', authenticateToken, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'Admin') {
            return res.status(403).json({ error: 'Only admins can create users' });
        }

        const { name, email, role, password } = req.body;
        
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }
        
        // Create new user
        const newUser = new User({
            name,
            email,
            role: role || 'Team Member',
            password: password || 'password123'
        });
        
        await newUser.save();
        
        // Return user without password
        const userWithoutPassword = { ...newUser.toObject() };
        delete userWithoutPassword.password;
        res.json(userWithoutPassword);
    } catch (error) {
        console.error('Error adding user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update user (Admin only)
app.put('/api/users/:id', authenticateToken, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'Admin') {
            return res.status(403).json({ error: 'Only admins can update users' });
        }

        const { name, email, role } = req.body;
        
        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            { name, email, role },
            { new: true, select: '-password' }
        );
        
        if (!updatedUser) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json(updatedUser);
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete user (Admin only)
app.delete('/api/users/:id', authenticateToken, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'Admin') {
            return res.status(403).json({ error: 'Only admins can delete users' });
        }

        const deletedUser = await User.findByIdAndDelete(req.params.id);
        
        if (!deletedUser) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: 'User not found' });
        }

        // Check password
        if (password !== user.password) {
            return res.status(400).json({ error: 'Invalid password' });
        }

        // Create token
        const token = jwt.sign(
            { id: user._id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user._id,
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

// Get all projects with tasks
app.get('/api/projects', authenticateToken, async (req, res) => {
    try {
        const projects = await Project.find().populate('tasks');
        res.json(projects);
    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create new project
app.post('/api/projects', authenticateToken, async (req, res) => {
    try {
        const { name, description, startDate, dueDate, manager } = req.body;
        
        const newProject = new Project({
            name,
            description,
            startDate,
            dueDate,
            manager,
            tasks: []
        });
        
        await newProject.save();
        res.json(newProject);
    } catch (error) {
        console.error('Error creating project:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update project
app.put('/api/projects/:id', authenticateToken, async (req, res) => {
    try {
        const { name, description, startDate, dueDate, manager } = req.body;
        
        const updatedProject = await Project.findByIdAndUpdate(
            req.params.id,
            { name, description, startDate, dueDate, manager },
            { new: true }
        );
        
        if (!updatedProject) {
            return res.status(404).json({ error: 'Project not found' });
        }
        
        res.json(updatedProject);
    } catch (error) {
        console.error('Error updating project:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete project
app.delete('/api/projects/:id', authenticateToken, async (req, res) => {
    try {
        // Delete all tasks associated with this project
        await Task.deleteMany({ projectId: req.params.id });
        
        // Delete the project
        const deletedProject = await Project.findByIdAndDelete(req.params.id);
        
        if (!deletedProject) {
            return res.status(404).json({ error: 'Project not found' });
        }
        
        res.json({ message: 'Project and associated tasks deleted successfully' });
    } catch (error) {
        console.error('Error deleting project:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get tasks for a project
app.get('/api/projects/:projectId/tasks', authenticateToken, async (req, res) => {
    try {
        const tasks = await Task.find({ projectId: req.params.projectId });
        res.json(tasks);
    } catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create new task
app.post('/api/tasks', authenticateToken, async (req, res) => {
    try {
        const { name, description, assignee, support, startDate, dueDate, status, projectId } = req.body;
        
        const newTask = new Task({
            name,
            description,
            assignee,
            support,
            startDate,
            dueDate,
            status: status || 'not-started',
            projectId
        });
        
        await newTask.save();
        
        // Add task to project
        await Project.findByIdAndUpdate(
            projectId,
            { $push: { tasks: newTask._id } }
        );
        
        res.json(newTask);
    } catch (error) {
        console.error('Error creating task:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update task
app.put('/api/tasks/:id', authenticateToken, async (req, res) => {
    try {
        const { name, description, assignee, support, startDate, dueDate, status } = req.body;
        
        const updatedTask = await Task.findByIdAndUpdate(
            req.params.id,
            { name, description, assignee, support, startDate, dueDate, status },
            { new: true }
        );
        
        if (!updatedTask) {
            return res.status(404).json({ error: 'Task not found' });
        }
        
        res.json(updatedTask);
    } catch (error) {
        console.error('Error updating task:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete task
app.delete('/api/tasks/:id', authenticateToken, async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }
        
        // Remove task from project
        await Project.findByIdAndUpdate(
            task.projectId,
            { $pull: { tasks: task._id } }
        );
        
        // Delete the task
        await Task.findByIdAndDelete(req.params.id);
        
        res.json({ message: 'Task deleted successfully' });
    } catch (error) {
        console.error('Error deleting task:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Add default users if database is empty
async function initializeDatabase() {
    try {
        const userCount = await User.countDocuments();
        if (userCount === 0) {
            console.log('Adding default users to database...');
            const defaultUsers = [
                { name: "TeeN", email: "tee@example.com", role: "Admin", password: "password123" },
                { name: "Alex Chen", email: "alex@example.com", role: "Project Manager", password: "password123" },
                { name: "Maria Garcia", email: "maria@example.com", role: "Team Member", password: "password123" },
                { name: "David Wilson", email: "david@example.com", role: "Team Member", password: "password123" }
            ];
            
            await User.insertMany(defaultUsers);
            console.log('Default users added successfully');
        }
    } catch (error) {
        console.error('Error initializing database:', error);
    }
}

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    initializeDatabase();
});