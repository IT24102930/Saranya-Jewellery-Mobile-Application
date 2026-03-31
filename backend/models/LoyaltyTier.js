import mongoose from 'mongoose';

const loyaltyTierSchema = new mongoose.Schema({
  tierName: {
    type: String,
    enum: ['Silver', 'Gold', 'Platinum'],
    required: true,
    unique: true
  },
  minSpent: {
    type: Number,
    required: true,
    default: 0
  },
  maxSpent: {
    type: Number,
    required: true
  },
  pointMultiplier: {
    type: Number,
    default: 1,
    min: 1
  },
  benefits: {
    type: [String],
    default: []
  },
  description: {
    type: String,
    default: ''
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

const LoyaltyTier = mongoose.model('LoyaltyTier', loyaltyTierSchema);

export default LoyaltyTier;
