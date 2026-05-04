import mongoose from 'mongoose';

const loyaltyOfferSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  tierType: {
    type: String,
    enum: ['Silver', 'Gold', 'Platinum', 'All'],
    required: true
  },
  discountPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  discountAmount: {
    type: Number,
    default: 0
  },
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
  emailSent: {
    type: Boolean,
    default: false
  },
  sentAt: {
    type: Date,
    default: null
  },
  recipientsCount: {
    type: Number,
    default: 0
  },
  // Coupon code field
  couponCode: {
    type: String,
    unique: true,
    sparse: true,
    uppercase: true,
    trim: true
  },
  // Legacy coupon system fields
  usesCouponSystem: {
    type: Boolean,
    default: true
  },
  couponPrefix: {
    type: String,
    default: ''
  },
  generatedCouponsCount: {
    type: Number,
    default: 0
  },
  redeemedCount: {
    type: Number,
    default: 0
  },
  couponsGenerated: {
    type: Boolean,
    default: false
  },
  generatedAt: {
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

const LoyaltyOffer = mongoose.model('LoyaltyOffer', loyaltyOfferSchema);

export default LoyaltyOffer;
