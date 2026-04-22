import mongoose from 'mongoose';

const stockItemSchema = new mongoose.Schema({
  serial: { type: String, unique: true, required: true },
  name: { type: String, required: true, trim: true },
  category: {
    type: String,
    enum: ['Ring', 'Necklace', 'Bangle', 'Bangles', 'Earring', 'Earrings', 'Bracelet', 'Pendant', 'Chain', 'Anklet', 'Other'],
    required: true
  },
  karat: { type: String, enum: ['18K', '22K', '24K'], default: '22K' },
  weight: { type: Number, required: true, min: 0 },
  quantity: { type: Number, required: true, default: 0, min: 0 },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  notes: { type: String, trim: true },
  karatRate: { type: Number, default: 0, min: 0 },
  status: {
    type: String,
    enum: ['In Stock', 'Low Stock', 'Out of Stock'],
    default: 'In Stock'
  }
}, { timestamps: true });

stockItemSchema.pre('save', function() {
  if (this.quantity === 0)     this.status = 'Out of Stock';
  else if (this.quantity <= 3) this.status = 'Low Stock';
  else                         this.status = 'In Stock';
});

const StockItem = mongoose.model('StockItem', stockItemSchema, 'stockitems');
export default StockItem;