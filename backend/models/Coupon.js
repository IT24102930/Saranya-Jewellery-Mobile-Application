import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema({
  // Coupon identification
  code: {
    type: String,
    unique: true,
    required: true,
    uppercase: true,
    trim: true
  },
  offerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LoyaltyOffer',
    required: true
  },

  // Customer assignment (optional for loyalty offers available to all tier members)
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    default: null
  },
  assignedTier: {
    type: String,
    enum: ['Silver', 'Gold', 'Platinum', 'Standard', 'All'],
    default: 'Standard'
  },

  // Coupon behavior
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: true
  },
  discountValue: {
    type: Number,
    required: true
  },
  minOrderAmount: {
    type: Number,
    default: 0
  },
  maxUses: {
    type: Number,
    default: 1
  },
  usageCount: {
    type: Number,
    default: 0
  },

  // Timeline
  validFrom: {
    type: Date,
    default: Date.now
  },
  validUntil: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },

  // Redemption tracking
  usedAt: {
    type: Date,
    default: null
  },
  usedInOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null
  },

  // Email tracking
  emailSent: {
    type: Boolean,
    default: false
  },
  emailSentAt: {
    type: Date,
    default: null
  },

  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for fast lookups (code index is created automatically via unique: true)
couponSchema.index({ customerId: 1, offerId: 1 });
couponSchema.index({ validUntil: 1, isActive: 1 });

const Coupon = mongoose.model('Coupon', couponSchema);

export default Coupon;
