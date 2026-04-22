import express from 'express';
import Message from '../models/Message.js';
import { isAuthenticated, hasRole } from '../middleware/auth.js';
import emailService from '../utils/emailService.js';
import Customer from '../models/Customer.js';

const router = express.Router();

function getStartOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function parseValidUntilDate(validUntil) {
  if (!validUntil) return undefined;
  const parsed = new Date(validUntil);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

// Public route - Get active messages for customers (no auth required for viewing)
router.get('/active', async (req, res) => {
  try {
    const messages = await Message.find({
      status: 'active',
      $or: [
        { validUntil: { $exists: false } },
        { validUntil: { $gte: new Date() } }
      ]
    })
    .select('title message type validUntil createdAt discountPercentage couponCode')
    .sort({ createdAt: -1 })
    .limit(10);
    
    res.json(messages);
  } catch (error) {
    console.error('Error fetching active messages:', error);
    res.status(500).json({ message: 'Error fetching messages', error: error.message });
  }
});

// All other routes require authentication
router.use(isAuthenticated);

// Test email connection
router.get('/test-email', hasRole('Customer Care', 'Admin'), async (req, res) => {
  try {
    const verifyResult = await emailService.verifyConnection();
    if (!verifyResult.success) {
      return res.status(500).json({ 
        message: 'Email connection failed', 
        error: verifyResult.error 
      });
    }
    
    // Send a test email to the logged-in staff member if they have an email
    const testEmail = req.session.email || process.env.EMAIL_USER;
    const result = await emailService.sendCustomEmail(
      testEmail,
      'Saranya Jewellery - Email Test',
      '<h1>Success!</h1><p>Email system is working correctly.</p>'
    );
    
    if (result.success) {
      res.json({ 
        message: 'Email test successful', 
        sentTo: testEmail,
        messageId: result.messageId 
      });
    } else {
      res.status(500).json({ 
        message: 'Email verification passed but sending failed', 
        error: result.error 
      });
    }
  } catch (error) {
    console.error('Error testing email:', error);
    res.status(500).json({ message: 'Error testing email', error: error.message });
  }
});


// GET /api/messages - Get all messages (Customer Care only)
router.get('/', hasRole('Customer Care', 'Admin'), async (req, res) => {
  try {
    const { status, type } = req.query;
    
    let filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;

    const messages = await Message.find(filter)
      .populate('createdBy', 'fullName email')
      .sort({ createdAt: -1 });
    
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Error fetching messages', error: error.message });
  }
});

// GET /api/messages/stats - Get message statistics
router.get('/stats', hasRole('Customer Care', 'Admin'), async (req, res) => {
  try {
    const totalMessages = await Message.countDocuments();
    const activeMessages = await Message.countDocuments({ status: 'active' });
    const totalSent = await Message.aggregate([
      { $group: { _id: null, total: { $sum: '$sentCount' } } }
    ]);

    res.json({
      totalMessages,
      activeMessages,
      totalSent: totalSent[0]?.total || 0
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching statistics', error: error.message });
  }
});

// GET /api/messages/:id - Get single message
router.get('/:id', hasRole('Customer Care', 'Admin'), async (req, res) => {
  try {
    const message = await Message.findById(req.params.id)
      .populate('createdBy', 'fullName email');
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    res.json(message);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching message', error: error.message });
  }
});

// POST /api/messages - Create new message (Customer Care only)
router.post('/', hasRole('Customer Care', 'Admin'), async (req, res) => {
  try {
    console.log('Creating message - Session:', req.session);
    console.log('Request body:', req.body);
    
    const {
      title,
      message,
      type,
      status,
      validUntil,
      discountPercentage,
      couponCode,
      targetAudience,
      sendOnLogin
    } = req.body;

    if (!title || !message) {
      console.log('Missing title or message');
      return res.status(400).json({ message: 'Title and message are required' });
    }

    const parsedDiscount = Number(discountPercentage ?? 0);
    if (!Number.isFinite(parsedDiscount) || parsedDiscount < 0 || parsedDiscount > 100) {
      return res.status(400).json({ message: 'Discount percentage must be between 0 and 100' });
    }

    const parsedValidUntil = parseValidUntilDate(validUntil);
    if (validUntil && !parsedValidUntil) {
      return res.status(400).json({ message: 'Invalid offer valid until date' });
    }
    if (parsedValidUntil && parsedValidUntil < getStartOfToday()) {
      return res.status(400).json({ message: 'Offer valid until date cannot be in the past' });
    }

    const newMessage = new Message({
      title,
      message,
      type: type || 'general',
      status: status || 'active',
      validUntil: parsedValidUntil,
      discountPercentage: parsedDiscount,
      couponCode: couponCode || '',
      targetAudience: targetAudience || 'all',
      sendOnLogin: sendOnLogin !== undefined ? sendOnLogin : true,
      createdBy: req.session.staffId
    });

    console.log('Saving message:', newMessage);
    await newMessage.save();
    
    const populatedMessage = await Message.findById(newMessage._id)
      .populate('createdBy', 'fullName email');
    
    console.log('Message created successfully:', populatedMessage._id);
    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error('Error creating message:', error);
    res.status(500).json({ message: 'Error creating message', error: error.message });
  }
});

// PUT /api/messages/:id - Update message
router.put('/:id', hasRole('Customer Care', 'Admin'), async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    const {
      title,
      message: messageText,
      type,
      status,
      validUntil,
      discountPercentage,
      couponCode,
      targetAudience,
      sendOnLogin
    } = req.body;

    if (discountPercentage !== undefined) {
      const parsedDiscount = Number(discountPercentage);
      if (!Number.isFinite(parsedDiscount) || parsedDiscount < 0 || parsedDiscount > 100) {
        return res.status(400).json({ message: 'Discount percentage must be between 0 and 100' });
      }
      message.discountPercentage = parsedDiscount;
    }

    if (couponCode !== undefined) {
      message.couponCode = couponCode;
    }

    if (validUntil !== undefined) {
      const parsedValidUntil = parseValidUntilDate(validUntil);
      if (validUntil && !parsedValidUntil) {
        return res.status(400).json({ message: 'Invalid offer valid until date' });
      }
      if (parsedValidUntil && parsedValidUntil < getStartOfToday()) {
        return res.status(400).json({ message: 'Offer valid until date cannot be in the past' });
      }
      message.validUntil = parsedValidUntil;
    }

    if (title) message.title = title;
    if (messageText) message.message = messageText;
    if (type) message.type = type;
    if (status) message.status = status;
    if (targetAudience) message.targetAudience = targetAudience;
    if (sendOnLogin !== undefined) message.sendOnLogin = sendOnLogin;

    await message.save();
    
    const updatedMessage = await Message.findById(message._id)
      .populate('createdBy', 'fullName email');
    
    res.json(updatedMessage);
  } catch (error) {
    res.status(500).json({ message: 'Error updating message', error: error.message });
  }
});

// DELETE /api/messages/:id - Delete message
router.delete('/:id', hasRole('Customer Care', 'Admin'), async (req, res) => {
  try {
    const message = await Message.findByIdAndDelete(req.params.id);
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting message', error: error.message });
  }
});

// POST /api/messages/:id/send - Send message to specific customers
router.post('/:id/send', hasRole('Customer Care', 'Admin'), async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    
    if (!message || !message.isValid()) {
      return res.status(400).json({ message: 'Invalid or inactive message' });
    }

    const { customerIds } = req.body;
    
    if (!customerIds || !Array.isArray(customerIds) || customerIds.length === 0) {
      return res.status(400).json({ message: 'Customer IDs required' });
    }

    const customers = await Customer.find({ _id: { $in: customerIds } });
    
    // Send emails to selected customers
    let successCount = 0;
    let failCount = 0;
    
    for (const customer of customers) {
      try {
        const result = await emailService.sendPromotionEmail(customer, message._id);
        if (result.success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (error) {
        console.error(`Failed to send email to ${customer.email}:`, error);
        failCount++;
      }
    }

    res.json({
      message: `Promotion emails sent successfully to ${successCount} customers`,
      successCount,
      failCount,
      total: customers.length
    });
  } catch (error) {
    console.error('Error sending messages:', error);
    res.status(500).json({ message: 'Error sending messages', error: error.message });
  }
});

// POST /api/messages/broadcast - Broadcast message to all customers
router.post('/broadcast/:id', hasRole('Customer Care', 'Admin'), async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    if (message.status !== 'active') {
      return res.status(400).json({ 
        message: `Cannot broadcast ${message.status} message. Please set status to 'active' first.` 
      });
    }
    
    if (message.validUntil && new Date() > message.validUntil) {
      return res.status(400).json({ 
        message: 'Message has expired. Please update the valid until date.' 
      });
    }

    // Get customers based on target audience
    let customerFilter = {};
    if (message.targetAudience === 'new') {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      customerFilter.createdAt = { $gte: oneMonthAgo };
    } else if (message.targetAudience === 'existing') {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      customerFilter.createdAt = { $lt: oneMonthAgo };
    }

    const customers = await Customer.find(customerFilter).limit(100); // Limit for safety
    
    // Send broadcast emails
    let successCount = 0;
    let failCount = 0;
    
    for (const customer of customers) {
      try {
        const result = await emailService.sendPromotionEmail(customer, message._id);
        if (result.success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (error) {
        console.error(`Failed to send broadcast email to ${customer.email}:`, error);
        failCount++;
      }
    }
    
    // Update sent count for the message
    message.sentCount += successCount;
    await message.save();

    res.json({
      message: `Broadcast completed! Sent to ${successCount} customers`,
      successCount,
      failCount,
      total: customers.length
    });
  } catch (error) {
    console.error('Error broadcasting message:', error);
    res.status(500).json({ message: 'Error broadcasting message', error: error.message });
  }
});

// POST /api/messages/:id/send-email - Send message to all customers (new endpoint name)
router.post('/:id/send-email', hasRole('Customer Care', 'Admin'), async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    // Get all customers
    const customers = await Customer.find({});
    
    // Send emails to all customers
    let successCount = 0;
    let failCount = 0;
    
    for (const customer of customers) {
      try {
        const emailHtml = `
          <h2>${message.title}</h2>
          <p>${message.message}</p>
          ${message.validUntil ? `<p><small>Valid until ${new Date(message.validUntil).toLocaleDateString()}</small></p>` : ''}
          ${message.couponCode ? `<p><strong>Coupon Code: ${message.couponCode}</strong></p>` : ''}
        `;
        
        const result = await emailService.sendCustomEmail(
          customer.email,
          message.title,
          emailHtml
        );
        
        if (result.success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (error) {
        console.error(`Failed to send email to ${customer.email}:`, error);
        failCount++;
      }
    }
    
    // Update message sent count
    message.sentCount += successCount;
    await message.save();

    res.json({
      message: `Offer sent to ${successCount} customers`,
      successCount,
      failCount,
      recipientsCount: successCount,
      total: customers.length
    });
  } catch (error) {
    console.error('Error sending offer emails:', error);
    res.status(500).json({ message: 'Error sending offer emails', error: error.message });
  }
});

export default router;
