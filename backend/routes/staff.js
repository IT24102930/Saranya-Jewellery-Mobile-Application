import express from 'express';
import Staff from '../models/Staff.js';
import { isAuthenticated, isAdmin } from '../middleware/auth.js';

const router = express.Router();

// All routes require admin authentication
router.use(isAuthenticated);
router.use(isAdmin);

// GET /api/staff - Get all staff
router.get('/', async (req, res) => {
  try {
    const staff = await Staff.find()
      .select('-password')
      .sort({ createdAt: -1 });
    
    res.json(staff);
  } catch (error) {
    console.error('Error fetching staff:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/staff/:id - Get single staff
router.get('/:id', async (req, res) => {
  try {
    const staff = await Staff.findById(req.params.id).select('-password');
    
    if (!staff) {
      return res.status(404).json({ message: 'Staff not found' });
    }
    
    res.json(staff);
  } catch (error) {
    console.error('Error fetching staff:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/staff - Create new staff (admin)
router.post('/', async (req, res) => {
  try {
    const { email, password, fullName, role, status } = req.body;

    if (!email || !password || !fullName || !role) {
      return res.status(400).json({ message: 'Email, password, full name, and role are required' });
    }

    if (String(password).length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }

    const existingStaff = await Staff.findOne({ email });
    if (existingStaff) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const newStaff = new Staff({
      email,
      password,
      fullName,
      role,
      status: status || 'Approved' // Admin can approve directly
    });

    await newStaff.save();

    res.status(201).json({
      message: 'Staff created successfully',
      staff: {
        id: newStaff._id,
        email: newStaff.email,
        fullName: newStaff.fullName,
        role: newStaff.role,
        status: newStaff.status
      }
    });
  } catch (error) {
    console.error('Error creating staff:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/staff/:id - Update staff
router.put('/:id', async (req, res) => {
  try {
    const { fullName, role, status, password } = req.body;

    if (password && String(password).length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }

    const staff = await Staff.findById(req.params.id);

    if (!staff) {
      return res.status(404).json({ message: 'Staff not found' });
    }

    if (fullName) staff.fullName = fullName;
    if (role) staff.role = role;
    if (status) staff.status = status;
    if (password) staff.password = password;
    staff.updatedAt = new Date();

    await staff.save();

    res.json({
      message: 'Staff updated successfully',
      staff: {
        id: staff._id,
        email: staff.email,
        fullName: staff.fullName,
        role: staff.role,
        status: staff.status,
        isActive: staff.isActive,
        updatedAt: staff.updatedAt
      }
    });
  } catch (error) {
    console.error('Error updating staff:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/staff/:id/approve - Approve staff
router.patch('/:id/approve', async (req, res) => {
  try {
    const staff = await Staff.findByIdAndUpdate(
      req.params.id,
      { status: 'Approved', isActive: true },
      { new: true }
    ).select('-password');

    if (!staff) {
      return res.status(404).json({ message: 'Staff not found' });
    }

    res.json({
      message: 'Staff approved successfully',
      staff
    });
  } catch (error) {
    console.error('Error approving staff:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/staff/:id/reject - Reject staff
router.patch('/:id/reject', async (req, res) => {
  try {
    const staff = await Staff.findByIdAndUpdate(
      req.params.id,
      { status: 'Revoked' },
      { new: true }
    ).select('-password');

    if (!staff) {
      return res.status(404).json({ message: 'Staff not found' });
    }

    res.json({
      message: 'Staff rejected successfully',
      staff
    });
  } catch (error) {
    console.error('Error rejecting staff:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/staff/:id/toggle-active - Toggle staff active status
router.patch('/:id/toggle-active', async (req, res) => {
  try {
    const staff = await Staff.findById(req.params.id);
    
    if (!staff) {
      return res.status(404).json({ message: 'Staff not found' });
    }

    staff.isActive = !staff.isActive;
    await staff.save();

    res.json({
      message: `Staff ${staff.isActive ? 'activated' : 'deactivated'} successfully`,
      staff: {
        id: staff._id,
        email: staff.email,
        fullName: staff.fullName,
        isActive: staff.isActive
      }
    });
  } catch (error) {
    console.error('Error toggling staff status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/staff/:id - Delete staff permanently
router.delete('/:id', async (req, res) => {
  try {
    // Prevent admin from deleting themselves
    if (req.params.id === req.session.staffId.toString()) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    const staff = await Staff.findByIdAndDelete(req.params.id);

    if (!staff) {
      return res.status(404).json({ message: 'Staff not found' });
    }

    res.json({
      message: 'Staff deleted successfully',
      deletedStaff: {
        id: staff._id,
        email: staff.email,
        fullName: staff.fullName
      }
    });
  } catch (error) {
    console.error('Error deleting staff:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
