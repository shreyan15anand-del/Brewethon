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
const College = require('./models/College');

// Seed base admin on server start
async function seedBaseAdmin() {
  try {
    const baseEmail = 'admin@brewethon.com';
    const existing = await Admin.findOne({ email: baseEmail });
    if (!existing) {
      const baseAdmin = new Admin({
        email: baseEmail,
        password: 'Brewethon@123'
      });
      await baseAdmin.save();
      console.log('Base admin created: admin@brewethon.com / Brewethon@123');
    }
  } catch (err) {
    console.error('Error seeding base admin:', err);
  }
}

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

// Admin dashboard - fetch and render with all admin/college accounts
app.get('/admin/dashboard', async (req, res) => {
  if (!req.session || !req.session.isAdmin) {
    return res.redirect('/admin');
  }
  try {
    const admins = await Admin.find({}, '-password'); // exclude password from response
    const colleges = await College.find({}, '-password');
    res.render('admin-dashboard', { admins, colleges, successMessage: req.query.success, errorMessage: req.query.error });
  } catch (err) {
    console.error('Error fetching accounts:', err);
    res.status(500).send('Error loading dashboard');
  }
});

// POST: Add new admin account
app.post('/admin/dashboard/add-admin', async (req, res) => {
  if (!req.session || !req.session.isAdmin) {
    return res.redirect('/admin');
  }
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.redirect('/admin/dashboard?error=Email and password required');
  }
  try {
    const existing = await Admin.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.redirect('/admin/dashboard?error=Admin email already exists');
    }
    const newAdmin = new Admin({ email, password });
    await newAdmin.save();
    res.redirect('/admin/dashboard?success=Admin added successfully');
  } catch (err) {
    console.error('Error adding admin:', err);
    res.redirect('/admin/dashboard?error=Error adding admin');
  }
});

// POST: Add new college account
app.post('/admin/dashboard/add-college', async (req, res) => {
  if (!req.session || !req.session.isAdmin) {
    return res.redirect('/admin');
  }
  const { email, password, collegeName } = req.body || {};
  if (!email || !password || !collegeName) {
    return res.redirect('/admin/dashboard?error=All fields required');
  }
  try {
    const existing = await College.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.redirect('/admin/dashboard?error=College email already exists');
    }
    const newCollege = new College({ email, password, collegeName });
    await newCollege.save();
    res.redirect('/admin/dashboard?success=College added successfully');
  } catch (err) {
    console.error('Error adding college:', err);
    res.redirect('/admin/dashboard?error=Error adding college');
  }
});

// POST: Delete admin account
app.post('/admin/dashboard/delete-admin', async (req, res) => {
  if (!req.session || !req.session.isAdmin) {
    return res.redirect('/admin');
  }
  const { adminId } = req.body || {};
  if (!adminId) {
    return res.redirect('/admin/dashboard?error=Invalid admin ID');
  }
  try {
    // Prevent deleting the base admin
    const admin = await Admin.findById(adminId);
    if (admin && admin.email === 'admin@brewethon.com') {
      return res.redirect('/admin/dashboard?error=Cannot delete base admin');
    }
    await Admin.findByIdAndDelete(adminId);
    res.redirect('/admin/dashboard?success=Admin deleted successfully');
  } catch (err) {
    console.error('Error deleting admin:', err);
    res.redirect('/admin/dashboard?error=Error deleting admin');
  }
});

// POST: Delete college account
app.post('/admin/dashboard/delete-college', async (req, res) => {
  if (!req.session || !req.session.isAdmin) {
    return res.redirect('/admin');
  }
  const { collegeId } = req.body || {};
  if (!collegeId) {
    return res.redirect('/admin/dashboard?error=Invalid college ID');
  }
  try {
    await College.findByIdAndDelete(collegeId);
    res.redirect('/admin/dashboard?success=College deleted successfully');
  } catch (err) {
    console.error('Error deleting college:', err);
    res.redirect('/admin/dashboard?error=Error deleting college');
  }
});

// Admin logout
app.post('/admin/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) console.error('Session destroy error:', err);
    res.clearCookie('connect.sid');
    return res.redirect('/');
  });
});

app.listen(PORT, async () => {
  console.log(`Server running at http://localhost:${PORT}`);
  // Seed base admin on startup
  await seedBaseAdmin();
});
