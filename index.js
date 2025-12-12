const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

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
  res.render('adminlogin', { userRole: 'Admin' });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
