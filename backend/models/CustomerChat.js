import mongoose from 'mongoose';

const customerChatSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  customerName: {
    type: String,
    required: true
  },
  customerEmail: {
    type: String,
    required: true
  },
  messages: [{
    sender: {
      type: String,
      enum: ['customer', 'care-manager'],
      required: true
    },
    senderName: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    read: {
      type: Boolean,
      default: false
    }
  }],
  status: {
    type: String,
    enum: ['active', 'resolved', 'pending'],
    default: 'active'
  },
  lastMessageAt: {
    type: Date,
    default: Date.now
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff'
  }
}, {
  timestamps: true
});

// Index for faster queries
customerChatSchema.index({ customerId: 1 });
customerChatSchema.index({ status: 1, lastMessageAt: -1 });

const CustomerChat = mongoose.model('CustomerChat', customerChatSchema);

export default CustomerChat;
