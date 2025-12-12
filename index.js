const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const session = require('express-session');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Session middleware (simple memory store - OK for development only)
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-this',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 2 } // 2 hours
}));

// Connect to MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/something';
mongoose.connect(MONGO_URI)
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
    // Set session and redirect to admin dashboard
    req.session.isAdmin = true;
    req.session.adminId = admin._id.toString();
    return res.redirect('/admin/dashboard');
  } catch (err) {
    console.error(err);
    return res.status(500).send('Server error');
  }
});

// Admin dashboard placeholder
app.get('/admin/dashboard', (req, res) => {
  if (!req.session || !req.session.isAdmin) {
    return res.redirect('/admin');
  }
  res.render('admin-dashboard');
});

// Admin logout
app.post('/admin/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) console.error('Session destroy error:', err);
    res.clearCookie('connect.sid');
    return res.redirect('/');
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
