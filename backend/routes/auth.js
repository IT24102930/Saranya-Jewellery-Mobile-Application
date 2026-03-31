import express from 'express';
import Staff from '../models/Staff.js';
import { isAuthenticated, isAdmin, isApproved } from '../middleware/auth.js';

const router = express.Router();

// POST /api/auth/register - Register new staff
router.post('/register', async (req, res) => {
  try {
    const { email, password, fullName, role } = req.body;

    // Check if staff already exists
    const existingStaff = await Staff.findOne({ email });
    if (existingStaff) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Create new staff (status will be 'Pending' by default)
    const newStaff = new Staff({
      email,
      password,
      fullName,
      role: role || 'Customer Care'
    });

    await newStaff.save();

    res.status(201).json({ 
      message: 'Registration successful. Waiting for admin approval.',
      staff: {
        id: newStaff._id,
        email: newStaff.email,
        fullName: newStaff.fullName,
        role: newStaff.role,
        status: newStaff.status
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// POST /api/auth/login - Login staff
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find staff by email
    const staff = await Staff.findOne({ email });
    if (!staff) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check if account is active
    if (!staff.isActive) {
      return res.status(403).json({ message: 'Account has been deactivated' });
    }

    // Verify password
    const isMatch = await staff.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Set session
    req.session.staffId = staff._id;
    req.session.email = staff.email;
    req.session.fullName = staff.fullName;
    req.session.role = staff.role;
    req.session.status = staff.status;
    req.session.isActive = staff.isActive;

    res.json({
      message: 'Login successful',
      staff: {
        id: staff._id,
        email: staff.email,
        fullName: staff.fullName,
        role: staff.role,
        status: staff.status,
        isActive: staff.isActive
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// POST /api/auth/logout - Logout staff
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: 'Error logging out' });
    }
    res.json({ message: 'Logged out successfully' });
  });
});

// GET /api/auth/me - Get current logged-in user
router.get('/me', isAuthenticated, (req, res) => {
  res.json({
    id: req.session.staffId,
    email: req.session.email,
    fullName: req.session.fullName,
    role: req.session.role,
    status: req.session.status,
    isActive: req.session.isActive
  });
});

export default router;
