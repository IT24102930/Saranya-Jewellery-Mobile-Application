import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: false
  },
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  imageUrl: String,
  category: String,
  karat: String
});

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: false
  },
  customerName: {
    type: String,
    required: true
  },
  customerEmail: {
    type: String,
    required: true
  },
  items: [orderItemSchema],
  subtotal: {
    type: Number,
    required: true
  },
  tax: {
    type: Number,
    required: true
  },
  total: {
    type: Number,
    required: true
  },
  deliveryAddress: {
    type: String,
    default: 'Shop Collection - Visit Saranya Jewellery'
  },
  phoneNumber: {
    type: String,
    required: true
  },
  paymentMethod: {
    type: String,
    default: 'Bank Transfer',
    enum: ['Bank Transfer']
  },
  paymentReceipt: {
    type: String,
    default: null
  },
  orderNotes: String,
  status: {
    type: String,
    enum: ['Pending', 'Confirmed', 'Invoice Created', 'Payment Received', 'Preparing', 'Ready for Collection', 'Completed', 'Cancelled', 'Refunded'],
    default: 'Pending'
  },
  // Invoice fields
  invoiceNumber: {
    type: String,
    default: null
  },
  invoiceDate: {
    type: Date,
    default: null
  },
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Invoice Sent', 'Paid', 'Refunded'],
    default: 'Pending'
  },
  // Inventory notification fields
  inventoryNotified: {
    type: Boolean,
    default: false
  },
  inventoryAccepted: {
    type: Boolean,
    default: false
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

// Generate order number before saving
orderSchema.pre('save', async function() {
  if (this.isNew) {
    // Generate order number: ORD-YYYYMMDD-XXXXX
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    this.orderNumber = `ORD-${dateStr}-${randomNum}`;
  }
  this.updatedAt = Date.now();
});

const Order = mongoose.model('Order', orderSchema);

export default Order;
