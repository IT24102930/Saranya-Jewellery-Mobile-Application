import mongoose from 'mongoose';

const goldRateSchema = new mongoose.Schema({
  '18K': {
    type: Number,
    required: true,
    min: 0
  },
  '22K': {
    type: Number,
    required: true,
    min: 0
  },
  '24K': {
    type: Number,
    required: true,
    min: 0
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff'
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

goldRateSchema.pre('save', function() {
  this.lastUpdated = Date.now();
});

const GoldRate = mongoose.model('GoldRate', goldRateSchema);

export default GoldRate;
