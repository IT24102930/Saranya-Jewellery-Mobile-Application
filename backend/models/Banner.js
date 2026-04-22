import mongoose from 'mongoose';

const bannerSchema = new mongoose.Schema({
  message: {
    type: String,
    required: true,
    maxlength: 500
  },
  type: {
    type: String,
    enum: ['info', 'warning', 'success', 'promo'],
    default: 'info'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
    default: null
  },
  backgroundColor: {
    type: String,
    default: '#fff3cd'
  },
  textColor: {
    type: String,
    default: '#856404'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

export default mongoose.model('Banner', bannerSchema);
