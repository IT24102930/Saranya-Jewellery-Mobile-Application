import express from 'express';
import crypto from 'crypto';
import Customer from '../models/Customer.js';
import Order from '../models/Order.js';
import emailService from '../utils/emailService.js';
import { isAdmin, isApproved } from '../middleware/auth.js';

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

function getOtpHash(email, otp) {
  return crypto
    .createHash('sha256')
    .update(`${String(email || '').toLowerCase().trim()}:${String(otp || '').trim()}`)
    .digest('hex');
}

function isStrongPassword(password) {
  return typeof password === 'string' && password.length >= 8 && /\d/.test(password);
}

// POST /api/customer/register - Register new customer
router.post('/register', async (req, res) => {
  try {
    const { email, password, fullName, phone, address } = req.body;

    // Validate required fields
    if (!email || !password || !fullName) {
      return res.status(400).json({ message: 'Email, password, and full name are required' });
    }

    // Check if customer already exists
    const existingCustomer = await Customer.findOne({ email });
    if (existingCustomer) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Create new customer
    const newCustomer = new Customer({
      email,
      password,
      fullName,
      phone,
      address
    });

    await newCustomer.save();

    // Send welcome email asynchronously (don't block registration)
    emailService.sendWelcomeEmail(newCustomer).catch(err => {
      console.error('Failed to send welcome email:', err);
    });

    res.status(201).json({ 
      message: 'Registration successful. Welcome email sent! You can now login.',
      customer: {
        id: newCustomer._id,
        email: newCustomer.email,
        fullName: newCustomer.fullName,
        phone: newCustomer.phone,
        loyaltyPoints: newCustomer.loyaltyPoints
      }
    });
  } catch (error) {
    console.error('Customer registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// POST /api/customer/login - Login customer
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find customer by email
    const customer = await Customer.findOne({ email });
    if (!customer) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check if account is active
    if (!customer.isActive) {
      return res.status(403).json({ message: 'Account has been deactivated' });
    }

    // Verify password
    const isMatch = await customer.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Set session
    req.session.customerId = customer._id;
    req.session.email = customer.email;
    req.session.fullName = customer.fullName;
    req.session.isCustomer = true;

    res.json({
      message: 'Login successful',
      customer: {
        id: customer._id,
        email: customer.email,
        fullName: customer.fullName,
        phone: customer.phone,
        loyaltyPoints: customer.loyaltyPoints
      }
    });
  } catch (error) {
    console.error('Customer login error:', error);
    if (isDatabaseError(error)) {
      return res.status(503).json({ message: 'Database is temporarily unavailable. Please try again later.' });
    }

    res.status(500).json({ message: 'Server error during login' });
  }
});

// POST /api/customer/forgot-password/send-otp - Send OTP for password reset
router.post('/forgot-password/send-otp', async (req, res) => {
  try {
    const email = String(req.body?.email || '').toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({ message: 'Please provide a valid email address' });
    }

    const customer = await Customer.findOne({ email, isActive: true });
    if (!customer) {
      return res.status(404).json({ message: 'No active account found for this email' });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    customer.resetPasswordOtpHash = getOtpHash(email, otp);
    customer.resetPasswordOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await customer.save();

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #6f0022;">Saranya Jewellery Password Reset</h2>
        <p>Hello ${customer.fullName || 'Customer'},</p>
        <p>Use the OTP below to reset your password:</p>
        <div style="font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #6f0022; margin: 20px 0;">
          ${otp}
        </div>
        <p>This OTP is valid for 10 minutes.</p>
        <p>If you did not request this, please ignore this email.</p>
      </div>
    `;

    const sendResult = await emailService.sendCustomEmail(email, 'Password Reset OTP - Saranya Jewellery', html);
    if (!sendResult.success) {
      return res.status(500).json({ message: 'Failed to send OTP email. Please try again.' });
    }

    return res.json({ message: 'OTP sent to your email successfully' });
  } catch (error) {
    console.error('Forgot password send OTP error:', error);
    return res.status(500).json({ message: 'Server error during OTP send' });
  }
});

// POST /api/customer/forgot-password/verify-otp - Verify password reset OTP
router.post('/forgot-password/verify-otp', async (req, res) => {
  try {
    const email = String(req.body?.email || '').toLowerCase().trim();
    const otp = String(req.body?.otp || '').trim();

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const customer = await Customer.findOne({ email, isActive: true });
    if (!customer || !customer.resetPasswordOtpHash || !customer.resetPasswordOtpExpiresAt) {
      return res.status(400).json({ message: 'OTP is invalid or expired' });
    }

    if (new Date(customer.resetPasswordOtpExpiresAt) < new Date()) {
      return res.status(400).json({ message: 'OTP has expired. Please request a new OTP.' });
    }

    const otpHash = getOtpHash(email, otp);
    if (otpHash !== customer.resetPasswordOtpHash) {
      return res.status(400).json({ message: 'OTP is invalid or expired' });
    }

    return res.json({ message: 'OTP verified successfully' });
  } catch (error) {
    console.error('Forgot password verify OTP error:', error);
    return res.status(500).json({ message: 'Server error during OTP verification' });
  }
});

// POST /api/customer/forgot-password/reset-password - Reset password after OTP verification
router.post('/forgot-password/reset-password', async (req, res) => {
  try {
    const email = String(req.body?.email || '').toLowerCase().trim();
    const otp = String(req.body?.otp || '').trim();
    const newPassword = String(req.body?.newPassword || '');

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'Email, OTP and new password are required' });
    }

    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({ message: 'Password must be at least 8 characters and include at least 1 number' });
    }

    const customer = await Customer.findOne({ email, isActive: true });
    if (!customer || !customer.resetPasswordOtpHash || !customer.resetPasswordOtpExpiresAt) {
      return res.status(400).json({ message: 'OTP is invalid or expired' });
    }

    if (new Date(customer.resetPasswordOtpExpiresAt) < new Date()) {
      return res.status(400).json({ message: 'OTP has expired. Please request a new OTP.' });
    }

    const otpHash = getOtpHash(email, otp);
    if (otpHash !== customer.resetPasswordOtpHash) {
      return res.status(400).json({ message: 'OTP is invalid or expired' });
    }

    customer.password = newPassword;
    customer.resetPasswordOtpHash = null;
    customer.resetPasswordOtpExpiresAt = null;
    customer.updatedAt = Date.now();
    await customer.save();

    return res.json({ message: 'Password reset successful. Please login with your new password.' });
  } catch (error) {
    console.error('Forgot password reset error:', error);
    return res.status(500).json({ message: 'Server error during password reset' });
  }
});

// POST /api/customer/logout - Logout customer
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: 'Error logging out' });
    }
    res.json({ message: 'Logged out successfully' });
  });
});

// GET /api/customer/me - Get current logged-in customer
router.get('/me', async (req, res) => {
  try {
    if (!req.session.customerId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const customer = await Customer.findById(req.session.customerId).select('-password');
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    res.json({ customer });
  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/customer/profile - Update customer profile
router.put('/profile', async (req, res) => {
  try {
    if (!req.session.customerId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { fullName, phone, address } = req.body;

    const customer = await Customer.findById(req.session.customerId);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Update fields
    if (fullName) customer.fullName = fullName;
    if (phone) customer.phone = phone;
    if (address) customer.address = address;
    customer.updatedAt = Date.now();

    await customer.save();

    res.json({
      message: 'Profile updated successfully',
      customer: {
        id: customer._id,
        email: customer.email,
        fullName: customer.fullName,
        phone: customer.phone,
        address: customer.address,
        loyaltyPoints: customer.loyaltyPoints
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/customer/change-password - Change customer password
router.put('/change-password', async (req, res) => {
  try {
    if (!req.session.customerId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const customer = await Customer.findById(req.session.customerId);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Verify current password
    const isMatch = await customer.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    // Update password
    customer.password = newPassword;
    customer.updatedAt = Date.now();
    await customer.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/customer/admin/list - Get all customers for admin dashboard
router.get('/admin/list', isAdmin, isApproved, async (req, res) => {
  try {
    const customers = await Customer.find()
      .select('-password')
      .sort({ createdAt: -1 });

    res.json(customers);
  } catch (error) {
    console.error('Admin customer list error:', error);
    res.status(500).json({ message: 'Error fetching customers', error: error.message });
  }
});

// DELETE /api/customer/admin/:id - Delete customer (admin)
router.delete('/admin/:id', isAdmin, isApproved, async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const activeOrderStatuses = ['Pending', 'Confirmed', 'Invoice Created', 'Payment Received', 'Preparing', 'Ready for Collection'];
    const activeOrders = await Order.countDocuments({
      customerId: customer._id,
      status: { $in: activeOrderStatuses }
    });

    if (activeOrders > 0) {
      return res.status(400).json({
        message: 'Cannot delete customer with active orders. Complete/cancel their orders first.'
      });
    }

    await Customer.findByIdAndDelete(customer._id);

    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({ message: 'Error deleting customer', error: error.message });
  }
});

// GET /api/customers - Get all customers (admin only)
router.get('/', isApproved, isAdmin, async (req, res) => {
  try {
    const customers = await Customer.find().select('-password').sort({ createdAt: -1 });
    res.json(customers);
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ message: 'Failed to fetch customers' });
  }
});

// DELETE /api/customers/:customerId - Delete customer (admin only)
router.delete('/:customerId', isApproved, isAdmin, async (req, res) => {
  try {
    const { customerId } = req.params;

    const customer = await Customer.findByIdAndDelete(customerId);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({ message: 'Failed to delete customer' });
  }
});

export default router;
