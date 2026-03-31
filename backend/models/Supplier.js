import mongoose from 'mongoose';

const supplierSchema = new mongoose.Schema({
  supplierId: {
    type: String,
    unique: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  contact: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  location: {
    type: String,
    trim: true
  },
  itemsSupplied: {
    type: String,
    trim: true
  }
}, { timestamps: true });

const Supplier = mongoose.model('Supplier', supplierSchema);
export default Supplier;