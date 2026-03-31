import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const customerSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  loyaltyPoints: {
    type: Number,
    default: 0
  },
  isLoyalty: {
    type: Boolean,
    default: false
  },
  loyaltyTier: {
    type: String,
    enum: ['Silver', 'Gold', 'Platinum', null],
    default: null
  },
  totalSpent: {
    type: Number,
    default: 0
  },
  pointsRedeemed: {
    type: Number,
    default: 0
  },
  loyaltyJoinedDate: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
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

// Hash password before saving
customerSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare password
customerSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const Customer = mongoose.model('Customer', customerSchema);

export default Customer;
