import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  image: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['Ring', 'Necklace', 'Bracelet', 'Earring', 'Earrings', 'Pendant', 'Chain', 'Bangle', 'Bangles', 'Anklet', 'Other']
  },
  price: {
    type: Number,
    default: 0,
    min: 0
  },
  weight: {
    type: Number,
    default: 0,
    min: 0
  },
  kType: {
    type: String,
    enum: ['18K', '22K', '24K'],
    default: null
  },
  karatRate: {
    type: Number,
    default: 0,
    min: 0
  },
  taxPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  stockQuantity: {
    type: Number,
    default: 0,
    min: 0
  },
  sku: {
    type: String,
    trim: true
  },
  supplier: {
    type: String,
    trim: true,
    default: ''
  },
  availabilityStatus: {
    type: String,
    enum: ['In Stock', 'Out of Stock', 'Pre-Order'],
    default: 'Out of Stock'
  },
  productStatus: {
    type: String,
    enum: ['Draft', 'Active'],
    default: 'Draft'
  },
  featured: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: true
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

// Virtual fields for frontend compatibility
productSchema.virtual('imageUrl').get(function() {
  return this.image;
});

productSchema.virtual('karat').get(function() {
  return this.kType;
});

productSchema.virtual('isAvailable').get(function() {
  return this.availabilityStatus === 'In Stock';
});

// Ensure virtual fields are included when converting to JSON
productSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    // Add virtual fields to the JSON output
    return ret;
  }
});

productSchema.set('toObject', { virtuals: true });

// Auto-calculate price and update timestamp before saving
productSchema.pre('save', function() {
  // Auto-calculate price = (weight × karatRate) + tax
  if (this.weight > 0 && this.karatRate > 0) {
    const basePrice = this.weight * this.karatRate;
    const taxPercent = Number(this.taxPercentage || 0);
    const taxAmount = basePrice * (taxPercent / 100);
    this.price = Math.round((basePrice + taxAmount) * 100) / 100;
  }
  // Auto-set availability based on stock
  if (this.stockQuantity > 0 && this.productStatus === 'Active') {
    this.availabilityStatus = 'In Stock';
  } else if (this.stockQuantity === 0) {
    this.availabilityStatus = 'Out of Stock';
  }
  this.updatedAt = Date.now();
});

const Product = mongoose.model('Product', productSchema);

export default Product;
