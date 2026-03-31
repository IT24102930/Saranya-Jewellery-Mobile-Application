import express from 'express';
import Supplier from '../models/Supplier.js';
import { isInventoryManager } from '../middleware/auth.js';

const router = express.Router();

// GET all suppliers
router.get('/', isInventoryManager, async (req, res) => {
  try {
    const suppliers = await Supplier.find().sort({ createdAt: -1 });
    res.json(suppliers);
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({ message: 'Error fetching suppliers', error: error.message });
  }
});

// POST create supplier
router.post('/', isInventoryManager, async (req, res) => {
  try {
    const { name, contact, email, location, itemsSupplied } = req.body;

    if (!name || !contact) {
      return res.status(400).json({ message: 'Name and contact are required' });
    }

    const supplierCount = await Supplier.countDocuments();
    const supplierId = `SUP-${String(supplierCount + 1).padStart(4, '0')}`;

    const supplier = new Supplier({
      supplierId,
      name,
      contact,
      email: email || '',
      location: location || '',
      itemsSupplied: itemsSupplied || ''
    });

    await supplier.save();
    res.status(201).json({ message: 'Supplier added successfully', supplier });
  } catch (error) {
    console.error('Error creating supplier:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Supplier with this details already exists' });
    }
    res.status(500).json({ message: 'Error creating supplier', error: error.message });
  }
});

// PATCH update supplier
router.patch('/:id', isInventoryManager, async (req, res) => {
  try {
    const { name, contact, email, location, itemsSupplied } = req.body;

    const supplier = await Supplier.findByIdAndUpdate(
      req.params.id,
      {
        name,
        contact,
        email,
        location,
        itemsSupplied
      },
      { new: true }
    );

    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    res.json({ message: 'Supplier updated successfully', supplier });
  } catch (error) {
    console.error('Error updating supplier:', error);
    res.status(500).json({ message: 'Error updating supplier', error: error.message });
  }
});

// DELETE supplier
router.delete('/:id', isInventoryManager, async (req, res) => {
  try {
    const supplier = await Supplier.findByIdAndDelete(req.params.id);

    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    res.json({ message: 'Supplier deleted successfully' });
  } catch (error) {
    console.error('Error deleting supplier:', error);
    res.status(500).json({ message: 'Error deleting supplier', error: error.message });
  }
});

export default router;
