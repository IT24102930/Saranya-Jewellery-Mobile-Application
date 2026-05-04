import express from 'express';
import CustomerChat from '../models/CustomerChat.js';
import { isAuthenticated, hasRole } from '../middleware/auth.js';

const router = express.Router();

// Customer sends a message (requires customer authentication)
router.post('/send', isAuthenticated, async (req, res) => {
  try {
    console.log('Chat send request - Session:', req.session);
    console.log('Chat send request - Body:', req.body);
    
    const { message } = req.body;
    
    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Message cannot be empty' });
    }

    const customerId = req.session.customerId;
    const customerName = req.session.fullName || req.session.email;
    const customerEmail = req.session.email;

    console.log('Customer details:', { customerId, customerName, customerEmail });

    if (!customerId) {
      return res.status(401).json({ message: 'Customer authentication required' });
    }

    // Find or create chat conversation for this customer
    let chat = await CustomerChat.findOne({ customerId });

    if (!chat) {
      console.log('Creating new chat for customer:', customerId);
      // Create new chat
      chat = new CustomerChat({
        customerId,
        customerName,
        customerEmail,
        messages: [],
        status: 'active'
      });
    }

    // Add message to conversation
    chat.messages.push({
      sender: 'customer',
      senderName: customerName,
      message: message.trim(),
      timestamp: new Date()
    });

    chat.lastMessageAt = new Date();
    chat.status = 'active'; // Ensure it's active when customer messages

    await chat.save();

    console.log('Message saved successfully, chat ID:', chat._id);

    res.json({ 
      success: true, 
      message: 'Message sent successfully',
      chatId: chat._id
    });
  } catch (error) {
    console.error('Error sending customer message:', error);
    res.status(500).json({ message: 'Error sending message', error: error.message });
  }
});

// Customer gets their chat history (requires customer authentication)
router.get('/my-messages', isAuthenticated, async (req, res) => {
  try {
    const customerId = req.session.customerId;

    if (!customerId) {
      return res.status(401).json({ message: 'Customer authentication required' });
    }

    const chat = await CustomerChat.findOne({ customerId })
      .select('messages status lastMessageAt')
      .sort({ lastMessageAt: -1 });

    if (!chat) {
      return res.json({ messages: [], status: 'no-chat' });
    }

    res.json({
      messages: chat.messages,
      status: chat.status,
      lastMessageAt: chat.lastMessageAt
    });
  } catch (error) {
    console.error('Error fetching customer messages:', error);
    res.status(500).json({ message: 'Error fetching messages', error: error.message });
  }
});

// Care Manager: Get all customer chats
router.get('/all', isAuthenticated, hasRole('Customer Care', 'Admin'), async (req, res) => {
  try {
    const { status } = req.query;
    
    let filter = {};
    if (status) {
      filter.status = status;
    }

    const chats = await CustomerChat.find(filter)
      .select('customerId customerName customerEmail messages status lastMessageAt')
      .sort({ lastMessageAt: -1 })
      .limit(50); // Limit to recent 50 conversations

    // Get unread message counts for each chat
    const chatsWithUnread = chats.map(chat => {
      const unreadCount = chat.messages.filter(
        msg => msg.sender === 'customer' && !msg.read
      ).length;
      
      const lastMessage = chat.messages.length > 0 
        ? chat.messages[chat.messages.length - 1] 
        : null;

      return {
        _id: chat._id,
        customerId: chat.customerId,
        customerName: chat.customerName,
        customerEmail: chat.customerEmail,
        status: chat.status,
        lastMessageAt: chat.lastMessageAt,
        messageCount: chat.messages.length,
        unreadCount,
        lastMessage
      };
    });

    res.json(chatsWithUnread);
  } catch (error) {
    console.error('Error fetching chats:', error);
    res.status(500).json({ message: 'Error fetching chats', error: error.message });
  }
});

// Care Manager: Get specific chat conversation
router.get('/:chatId', isAuthenticated, hasRole('Customer Care', 'Admin'), async (req, res) => {
  try {
    const chat = await CustomerChat.findById(req.params.chatId);

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Mark customer messages as read
    chat.messages.forEach(msg => {
      if (msg.sender === 'customer') {
        msg.read = true;
      }
    });
    await chat.save();

    res.json(chat);
  } catch (error) {
    console.error('Error fetching chat:', error);
    res.status(500).json({ message: 'Error fetching chat', error: error.message });
  }
});

// Care Manager: Reply to customer
router.post('/:chatId/reply', isAuthenticated, hasRole('Customer Care', 'Admin'), async (req, res) => {
  try {
    console.log('Reply request - Chat ID:', req.params.chatId);
    console.log('Reply request - Session:', req.session);
    console.log('Reply request - Body:', req.body);
    
    const { message } = req.body;
    
    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Message cannot be empty' });
    }

    const chat = await CustomerChat.findById(req.params.chatId);

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    const careManagerName = req.session.fullName || req.session.email || 'Customer Care Manager';
    console.log('Care manager name:', careManagerName);

    // Add reply message
    chat.messages.push({
      sender: 'care-manager',
      senderName: careManagerName,
      message: message.trim(),
      timestamp: new Date(),
      read: false
    });

    chat.lastMessageAt = new Date();
    chat.assignedTo = req.session.staffId;

    await chat.save();

    console.log('Reply saved successfully to chat:', chat._id);

    res.json({ 
      success: true, 
      message: 'Reply sent successfully',
      chat
    });
  } catch (error) {
    console.error('Error sending reply:', error);
    res.status(500).json({ message: 'Error sending reply', error: error.message });
  }
});

// Care Manager: Update chat status
router.patch('/:chatId/status', isAuthenticated, hasRole('Customer Care', 'Admin'), async (req, res) => {
  try {
    const { status } = req.body;

    if (!['active', 'resolved', 'pending'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const chat = await CustomerChat.findById(req.params.chatId);

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    chat.status = status;
    await chat.save();

    res.json({ 
      success: true, 
      message: 'Status updated successfully'
    });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ message: 'Error updating status', error: error.message });
  }
});

// Delete a message from a chat
router.delete('/:chatId/message/:messageIndex', isAuthenticated, hasRole('Customer Care', 'Admin'), async (req, res) => {
  try {
    const { chatId, messageIndex } = req.params;
    const chat = await CustomerChat.findById(chatId);
    
    if (!chat) return res.status(404).json({ message: 'Chat not found' });
    
    const index = parseInt(messageIndex);
    if (index < 0 || index >= chat.messages.length) {
      return res.status(400).json({ message: 'Invalid message index' });
    }
    
    // Remove the message at the specified index
    chat.messages.splice(index, 1);
    await chat.save();
    
    res.json({ message: 'Message deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting message', error: err.message });
  }
});

// Get chat statistics
router.get('/stats/summary', isAuthenticated, hasRole('Customer Care', 'Admin'), async (req, res) => {
  try {
    const totalChats = await CustomerChat.countDocuments();
    const activeChats = await CustomerChat.countDocuments({ status: 'active' });
    const resolvedChats = await CustomerChat.countDocuments({ status: 'resolved' });
    
    // Count unread messages
    const chatsWithUnread = await CustomerChat.find({
      'messages.sender': 'customer',
      'messages.read': false
    });
    
    let totalUnread = 0;
    chatsWithUnread.forEach(chat => {
      totalUnread += chat.messages.filter(msg => msg.sender === 'customer' && !msg.read).length;
    });

    res.json({
      totalChats,
      activeChats,
      resolvedChats,
      unreadMessages: totalUnread
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ message: 'Error fetching stats', error: error.message });
  }
});

export default router;
