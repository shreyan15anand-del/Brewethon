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
const Student = require('./models/Student');
const Teacher = require('./models/Teacher');
const ClubRep = require('./models/ClubRep');
const Assignment = require('./models/Assignment');
const Circular = require('./models/Circular');
const ExamSchedule = require('./models/ExamSchedule');

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
  res.render('teacherlogin', { userRole: 'Teacher', errorMessage: null });
});

app.get('/student', (req, res) => {
  res.render('studentlogin', { userRole: 'Student' });
});

app.get('/college', (req, res) => {
  res.render('collegelogin', { userRole: 'College', errorMessage: null });
});

app.get('/club-rep', (req, res) => {
  res.render('clubreplogin', { userRole: 'Club Representative' });
});

app.get('/admin', (req, res) => {
  res.render('adminlogin');
});

// College login handler
app.post('/college/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.render('collegelogin', { errorMessage: 'Email and password required' });
  }
  try {
    const college = await College.findOne({ email: email.toLowerCase() });
    if (!college) {
      return res.render('collegelogin', { errorMessage: 'Invalid email or password' });
    }
    const match = await college.comparePassword(password);
    if (!match) {
      return res.render('collegelogin', { errorMessage: 'Invalid email or password' });
    }
    // Set session and redirect to college dashboard
    req.session.isCollege = true;
    req.session.collegeId = college._id.toString();
    req.session.collegeName = college.collegeName;
    return res.redirect('/college/dashboard');
  } catch (err) {
    console.error(err);
    return res.render('collegelogin', { errorMessage: 'Server error' });
  }
});

// College dashboard - fetch and render with all student/teacher/clubrep accounts
app.get('/college/dashboard', async (req, res) => {
  if (!req.session || !req.session.isCollege) {
    return res.redirect('/college');
  }
  try {
    const collegeId = req.session.collegeId;
    const collegeName = req.session.collegeName;
    const students = await Student.find({ collegeId }, '-password');
    const teachers = await Teacher.find({ collegeId }, '-password');
    const clubReps = await ClubRep.find({ collegeId }, '-password');
    
    res.render('college-dashboard', {
      collegeName,
      students,
      teachers,
      clubReps,
      totalStudents: students.length,
      totalTeachers: teachers.length,
      totalClubReps: clubReps.length,
      successMessage: req.query.success,
      errorMessage: req.query.error
    });
  } catch (err) {
    console.error('Error fetching college dashboard:', err);
    res.status(500).send('Error loading dashboard');
  }
});

// POST: Add new student
app.post('/college/dashboard/add-student', async (req, res) => {
  if (!req.session || !req.session.isCollege) {
    return res.redirect('/college');
  }
  const { name, email, password, usn, phoneNumber, branch } = req.body || {};
  if (!name || !email || !password || !usn) {
    return res.redirect('/college/dashboard?error=Name, email, password, and USN are required');
  }
  try {
    const collegeId = req.session.collegeId;
    const existing = await Student.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.redirect('/college/dashboard?error=Student email already exists');
    }
    const existingUsn = await Student.findOne({ usn });
    if (existingUsn) {
      return res.redirect('/college/dashboard?error=USN already exists');
    }
    const newStudent = new Student({ collegeId, name, email, password, usn, phoneNumber, branch });
    await newStudent.save();
    res.redirect('/college/dashboard?success=Student added successfully');
  } catch (err) {
    console.error('Error adding student:', err);
    res.redirect('/college/dashboard?error=Error adding student');
  }
});

// POST: Add new teacher
app.post('/college/dashboard/add-teacher', async (req, res) => {
  if (!req.session || !req.session.isCollege) {
    return res.redirect('/college');
  }
  const { name, email, password, department, subject, phoneNumber } = req.body || {};
  if (!name || !email || !password || !department || !subject) {
    return res.redirect('/college/dashboard?error=Name, email, password, department, and subject are required');
  }
  try {
    const collegeId = req.session.collegeId;
    const existing = await Teacher.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.redirect('/college/dashboard?error=Teacher email already exists');
    }
    const newTeacher = new Teacher({ collegeId, name, email, password, department, subject, phoneNumber });
    await newTeacher.save();
    res.redirect('/college/dashboard?success=Teacher added successfully');
  } catch (err) {
    console.error('Error adding teacher:', err);
    res.redirect('/college/dashboard?error=Error adding teacher');
  }
});

// POST: Add new club rep
app.post('/college/dashboard/add-club-rep', async (req, res) => {
  if (!req.session || !req.session.isCollege) {
    return res.redirect('/college');
  }
  const { name, email, password, clubName, phoneNumber } = req.body || {};
  if (!name || !email || !password || !clubName) {
    return res.redirect('/college/dashboard?error=Name, email, password, and club name are required');
  }
  try {
    const collegeId = req.session.collegeId;
    const existing = await ClubRep.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.redirect('/college/dashboard?error=Club rep email already exists');
    }
    const newClubRep = new ClubRep({ collegeId, name, email, password, clubName, phoneNumber });
    await newClubRep.save();
    res.redirect('/college/dashboard?success=Club rep added successfully');
  } catch (err) {
    console.error('Error adding club rep:', err);
    res.redirect('/college/dashboard?error=Error adding club rep');
  }
});

// POST: Delete student
app.post('/college/dashboard/delete-student', async (req, res) => {
  if (!req.session || !req.session.isCollege) {
    return res.redirect('/college');
  }
  const { studentId } = req.body || {};
  if (!studentId) {
    return res.redirect('/college/dashboard?error=Invalid student ID');
  }
  try {
    const student = await Student.findById(studentId);
    if (student && student.collegeId.toString() !== req.session.collegeId) {
      return res.redirect('/college/dashboard?error=Unauthorized action');
    }
    await Student.findByIdAndDelete(studentId);
    res.redirect('/college/dashboard?success=Student deleted successfully');
  } catch (err) {
    console.error('Error deleting student:', err);
    res.redirect('/college/dashboard?error=Error deleting student');
  }
});

// POST: Delete teacher
app.post('/college/dashboard/delete-teacher', async (req, res) => {
  if (!req.session || !req.session.isCollege) {
    return res.redirect('/college');
  }
  const { teacherId } = req.body || {};
  if (!teacherId) {
    return res.redirect('/college/dashboard?error=Invalid teacher ID');
  }
  try {
    const teacher = await Teacher.findById(teacherId);
    if (teacher && teacher.collegeId.toString() !== req.session.collegeId) {
      return res.redirect('/college/dashboard?error=Unauthorized action');
    }
    await Teacher.findByIdAndDelete(teacherId);
    res.redirect('/college/dashboard?success=Teacher deleted successfully');
  } catch (err) {
    console.error('Error deleting teacher:', err);
    res.redirect('/college/dashboard?error=Error deleting teacher');
  }
});

// POST: Delete club rep
app.post('/college/dashboard/delete-club-rep', async (req, res) => {
  if (!req.session || !req.session.isCollege) {
    return res.redirect('/college');
  }
  const { clubRepId } = req.body || {};
  if (!clubRepId) {
    return res.redirect('/college/dashboard?error=Invalid club rep ID');
  }
  try {
    const clubRep = await ClubRep.findById(clubRepId);
    if (clubRep && clubRep.collegeId.toString() !== req.session.collegeId) {
      return res.redirect('/college/dashboard?error=Unauthorized action');
    }
    await ClubRep.findByIdAndDelete(clubRepId);
    res.redirect('/college/dashboard?success=Club rep deleted successfully');
  } catch (err) {
    console.error('Error deleting club rep:', err);
    res.redirect('/college/dashboard?error=Error deleting club rep');
  }
});

// College logout
app.post('/college/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) console.error('Session destroy error:', err);
    res.clearCookie('connect.sid');
    return res.redirect('/');
  });
});

// Teacher login handler
app.post('/teacher/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.render('teacherlogin', { errorMessage: 'Email and password required' });
  }
  try {
    const teacher = await Teacher.findOne({ email: email.toLowerCase() });
    if (!teacher) {
      return res.render('teacherlogin', { errorMessage: 'Invalid email or password' });
    }
    const match = await teacher.comparePassword(password);
    if (!match) {
      return res.render('teacherlogin', { errorMessage: 'Invalid email or password' });
    }
    // Set session and redirect to teacher dashboard
    req.session.isTeacher = true;
    req.session.teacherId = teacher._id.toString();
    req.session.teacherName = teacher.name;
    req.session.collegeId = teacher.collegeId.toString();
    return res.redirect('/teacher/dashboard');
  } catch (err) {
    console.error(err);
    return res.render('teacherlogin', { errorMessage: 'Server error' });
  }
});

// Teacher dashboard - fetch and render assignments, circulars, exams
app.get('/teacher/dashboard', async (req, res) => {
  if (!req.session || !req.session.isTeacher) {
    return res.redirect('/teacher');
  }
  try {
    const teacherId = req.session.teacherId;
    const teacherName = req.session.teacherName;
    const assignments = await Assignment.find({ teacherId }).sort({ createdAt: -1 });
    const circulars = await Circular.find({ teacherId }).sort({ createdAt: -1 });
    const exams = await ExamSchedule.find({ teacherId }).sort({ examDate: 1 });
    
    res.render('teacher-dashboard', {
      teacherName,
      assignments,
      circulars,
      exams,
      totalAssignments: assignments.length,
      totalCirculars: circulars.length,
      totalExams: exams.length,
      successMessage: req.query.success,
      errorMessage: req.query.error
    });
  } catch (err) {
    console.error('Error fetching teacher dashboard:', err);
    res.status(500).send('Error loading dashboard');
  }
});

// POST: Add new assignment
app.post('/teacher/dashboard/add-assignment', async (req, res) => {
  if (!req.session || !req.session.isTeacher) {
    return res.redirect('/teacher');
  }
  const { title, description, dueDate, subject } = req.body || {};
  if (!title || !description || !dueDate || !subject) {
    return res.redirect('/teacher/dashboard?error=All fields are required');
  }
  try {
    const teacherId = req.session.teacherId;
    const collegeId = req.session.collegeId;
    const newAssignment = new Assignment({
      teacherId,
      collegeId,
      title,
      description,
      dueDate,
      subject
    });
    await newAssignment.save();
    res.redirect('/teacher/dashboard?success=Assignment added successfully');
  } catch (err) {
    console.error('Error adding assignment:', err);
    res.redirect('/teacher/dashboard?error=Error adding assignment');
  }
});

// POST: Add new circular
app.post('/teacher/dashboard/add-circular', async (req, res) => {
  if (!req.session || !req.session.isTeacher) {
    return res.redirect('/teacher');
  }
  const { title, content, priority } = req.body || {};
  if (!title || !content) {
    return res.redirect('/teacher/dashboard?error=Title and content are required');
  }
  try {
    const teacherId = req.session.teacherId;
    const collegeId = req.session.collegeId;
    const newCircular = new Circular({
      teacherId,
      collegeId,
      title,
      content,
      priority: priority || 'medium'
    });
    await newCircular.save();
    res.redirect('/teacher/dashboard?success=Circular posted successfully');
  } catch (err) {
    console.error('Error adding circular:', err);
    res.redirect('/teacher/dashboard?error=Error posting circular');
  }
});

// POST: Add new exam schedule
app.post('/teacher/dashboard/add-exam', async (req, res) => {
  if (!req.session || !req.session.isTeacher) {
    return res.redirect('/teacher');
  }
  const { subject, examDate, examTime, location, examType, totalMarks, duration, description } = req.body || {};
  if (!subject || !examDate || !examTime || !location || !totalMarks || !duration) {
    return res.redirect('/teacher/dashboard?error=All required fields must be filled');
  }
  try {
    const teacherId = req.session.teacherId;
    const collegeId = req.session.collegeId;
    const newExam = new ExamSchedule({
      teacherId,
      collegeId,
      subject,
      examDate,
      examTime,
      location,
      examType: examType || 'midterm',
      totalMarks,
      duration,
      description
    });
    await newExam.save();
    res.redirect('/teacher/dashboard?success=Exam scheduled successfully');
  } catch (err) {
    console.error('Error adding exam:', err);
    res.redirect('/teacher/dashboard?error=Error scheduling exam');
  }
});

// POST: Delete assignment
app.post('/teacher/dashboard/delete-assignment', async (req, res) => {
  if (!req.session || !req.session.isTeacher) {
    return res.redirect('/teacher');
  }
  const { assignmentId } = req.body || {};
  if (!assignmentId) {
    return res.redirect('/teacher/dashboard?error=Invalid assignment ID');
  }
  try {
    const assignment = await Assignment.findById(assignmentId);
    if (assignment && assignment.teacherId.toString() !== req.session.teacherId) {
      return res.redirect('/teacher/dashboard?error=Unauthorized action');
    }
    await Assignment.findByIdAndDelete(assignmentId);
    res.redirect('/teacher/dashboard?success=Assignment deleted successfully');
  } catch (err) {
    console.error('Error deleting assignment:', err);
    res.redirect('/teacher/dashboard?error=Error deleting assignment');
  }
});

// POST: Delete circular
app.post('/teacher/dashboard/delete-circular', async (req, res) => {
  if (!req.session || !req.session.isTeacher) {
    return res.redirect('/teacher');
  }
  const { circularId } = req.body || {};
  if (!circularId) {
    return res.redirect('/teacher/dashboard?error=Invalid circular ID');
  }
  try {
    const circular = await Circular.findById(circularId);
    if (circular && circular.teacherId.toString() !== req.session.teacherId) {
      return res.redirect('/teacher/dashboard?error=Unauthorized action');
    }
    await Circular.findByIdAndDelete(circularId);
    res.redirect('/teacher/dashboard?success=Circular deleted successfully');
  } catch (err) {
    console.error('Error deleting circular:', err);
    res.redirect('/teacher/dashboard?error=Error deleting circular');
  }
});

// POST: Delete exam schedule
app.post('/teacher/dashboard/delete-exam', async (req, res) => {
  if (!req.session || !req.session.isTeacher) {
    return res.redirect('/teacher');
  }
  const { examId } = req.body || {};
  if (!examId) {
    return res.redirect('/teacher/dashboard?error=Invalid exam ID');
  }
  try {
    const exam = await ExamSchedule.findById(examId);
    if (exam && exam.teacherId.toString() !== req.session.teacherId) {
      return res.redirect('/teacher/dashboard?error=Unauthorized action');
    }
    await ExamSchedule.findByIdAndDelete(examId);
    res.redirect('/teacher/dashboard?success=Exam deleted successfully');
  } catch (err) {
    console.error('Error deleting exam:', err);
    res.redirect('/teacher/dashboard?error=Error deleting exam');
  }
});

// Teacher logout
app.post('/teacher/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) console.error('Session destroy error:', err);
    res.clearCookie('connect.sid');
    return res.redirect('/');
  });
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
