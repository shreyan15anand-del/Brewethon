const express = require('express');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Connect to MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/something';
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

const Admin = require('./models/Admin');

// Routes
app.get('/', (req, res) => {
  res.render('home');
});

app.get('/signup', (req, res) => {
  res.render('role-selection');
});

app.get('/teacher', (req, res) => {
  res.render('teacherlogin', { userRole: 'Teacher' });
});

app.get('/student', (req, res) => {
  res.render('studentlogin', { userRole: 'Student' });
});

app.get('/college', (req, res) => {
  res.render('collegelogin', { userRole: 'College' });
});

app.get('/club-rep', (req, res) => {
  res.render('clubreplogin', { userRole: 'Club Representative' });
});

app.get('/admin', (req, res) => {
  res.render('adminlogin');
});

// Create a quick setup route to create a default admin (development only)
app.get('/admin/setup', async (req, res) => {
  try {
    const existing = await Admin.findOne({ email: 'admin@example.com' });
    if (existing) return res.send('Admin already exists');
    const admin = new Admin({ email: 'admin@example.com', password: 'password123' });
    await admin.save();
    res.send('Default admin created: admin@example.com / password123');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error creating admin');
  }
});

// Admin login handler
app.post('/admin/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).send('Email and password required');
  try {
    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin) {
      return res.status(401).send('Invalid credentials');
    }
    const match = await admin.comparePassword(password);
    if (!match) return res.status(401).send('Invalid credentials');
    // On success redirect to admin dashboard
    return res.redirect('/admin/dashboard');
  } catch (err) {
    console.error(err);
    return res.status(500).send('Server error');
  }
});

// Admin dashboard placeholder
app.get('/admin/dashboard', (req, res) => {
  res.render('admin-dashboard');
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
