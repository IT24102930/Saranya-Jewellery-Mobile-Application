import express from 'express';
import Staff from '../models/Staff.js';
import { isAuthenticated, isAdmin, isApproved } from '../middleware/auth.js';

const router = express.Router();

function isDatabaseError(error) {
  const message = String(error?.message || '').toLowerCase();
  const name = String(error?.name || '').toLowerCase();

  return (
    name.includes('mongo') ||
    name.includes('mongoose') ||
    message.includes('mongodb') ||
    message.includes('mongoose') ||
    message.includes('buffering timed out') ||
    message.includes('server selection') ||
    message.includes('topology')
  );
}

// POST /api/auth/register - Register new staff
router.post('/register', async (req, res) => {
  try {
    const { email, password, fullName, role } = req.body;

    if (!email || !password || !fullName) {
      return res.status(400).json({ message: 'Email, password, and full name are required' });
    }

    if (String(password).length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }

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

    // Block login until account is approved by an admin
    if (staff.status !== 'Approved') {
      const message = staff.status === 'Pending'
        ? 'Your account is pending admin approval'
        : 'Your account has been rejected by admin';
      return res.status(403).json({ message });
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

    // Explicitly save session before sending response
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ message: 'Session error during login' });
      }

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
    });
  } catch (error) {
    console.error('Login error:', error);
    if (isDatabaseError(error)) {
      return res.status(503).json({ message: 'Database is temporarily unavailable. Please try again later.' });
    }

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
