import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['promotion', 'announcement', 'welcome', 'general'],
    default: 'general'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'scheduled'],
    default: 'active'
  },
  validUntil: {
    type: Date
  },
  targetAudience: {
    type: String,
    enum: ['all', 'new', 'existing', 'specific'],
    default: 'all'
  },
  sendOnLogin: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: true
  },
  sentCount: {
    type: Number,
    default: 0
  },
  discountPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  }
  ,
  couponCode: {
    type: String,
    trim: true,
    default: ''
  }
}, {
  timestamps: true  // Automatically adds createdAt and updatedAt
});

// Method to check if message is still valid
messageSchema.methods.isValid = function() {
  if (this.status !== 'active') return false;
  if (this.validUntil && new Date() > this.validUntil) return false;
  return true;
};

const Message = mongoose.model('Message', messageSchema);

export default Message;
