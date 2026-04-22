import express from 'express';
import Product from '../models/Product.js';
import StockItem from '../models/StockItem.js';
import GoldRate from '../models/GoldRate.js';
import Order from '../models/Order.js';
import Supplier from '../models/Supplier.js';
import { isInventoryManager } from '../middleware/auth.js';
import emailService from '../utils/emailService.js';

const router = express.Router();

function buildStockRow(stockItem) {
  return {
    _id: stockItem._id,
    serial: stockItem.serial,
    name: stockItem.name,
    category: stockItem.category,
    karat: stockItem.karat,
    weight: stockItem.weight,
    quantity: stockItem.quantity,
    supplierId: stockItem.supplier?._id || '',
    supplier: stockItem.supplier?.name || stockItem.supplier || '-',
    status: stockItem.status
  };
}

function extractSerialNumber(serial) {
  const match = String(serial || '').match(/(\d+)$/);
  return match ? Number(match[1]) : 0;
}

async function generateStockSerial() {
  const serials = await StockItem.find().select('serial').lean();
  const maxSerialNumber = serials.reduce((highest, item) => {
    const currentSerial = extractSerialNumber(item.serial);
    return currentSerial > highest ? currentSerial : highest;
  }, 0);

  return `STK-${String(maxSerialNumber + 1).padStart(4, '0')}`;
}

// ===== GOLD RATE MANAGEMENT =====

// GET /api/inventory/gold-rates - Get current gold rates
router.get('/gold-rates', async (req, res) => {
  try {
    let rates = await GoldRate.findOne().sort({ lastUpdated: -1 });
    if (!rates) {
      rates = { '18K': 0, '22K': 0, '24K': 0, lastUpdated: null };
    }
    res.json(rates);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching gold rates', error: error.message });
  }
});

// POST /api/inventory/gold-rates - Update gold rates (Inventory Manager only)
router.post('/gold-rates', isInventoryManager, async (req, res) => {
  try {
    const { '18K': rate18K, '22K': rate22K, '24K': rate24K } = req.body;

    if (rate18K === undefined || rate22K === undefined || rate24K === undefined) {
      return res.status(400).json({ message: 'Please provide all three karat rates' });
    }

    const parsed18K = Number(rate18K);
    const parsed22K = Number(rate22K);
    const parsed24K = Number(rate24K);

    if (![parsed18K, parsed22K, parsed24K].every((value) => Number.isFinite(value) && value >= 0)) {
      return res.status(400).json({ message: 'Gold rates cannot be negative' });
    }

    // Upsert the single gold rate document
    let goldRate = await GoldRate.findOne();
    if (goldRate) {
      // Store previous rates before updating
      goldRate.previous18K = goldRate['18K'];
      goldRate.previous22K = goldRate['22K'];
      goldRate.previous24K = goldRate['24K'];
      goldRate['18K'] = parsed18K;
      goldRate['22K'] = parsed22K;
      goldRate['24K'] = parsed24K;
      goldRate.updatedBy = req.session.staffId;
    } else {
      goldRate = new GoldRate({
        '18K': parsed18K,
        '22K': parsed22K,
        '24K': parsed24K,
        previous18K: parsed18K,
        previous22K: parsed22K,
        previous24K: parsed24K,
        updatedBy: req.session.staffId
      });
    }
    await goldRate.save();

    // Update karatRate for ALL products that have a kType assigned
    const products = await Product.find({ kType: { $in: ['18K', '22K', '24K'] } });
    for (const product of products) {
      product.karatRate = goldRate[product.kType];
      // Price auto-calculated in pre-save hook (weight × karatRate)
      await product.save();
    }

    res.json({ 
      message: 'Gold rates updated and product prices recalculated', 
      rates: goldRate,
      productsUpdated: products.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating gold rates', error: error.message });
  }
});

// ===== PRODUCT INVENTORY MANAGEMENT =====

// GET /api/inventory/stock - Get stock rows for inventory dashboard
router.get('/stock', isInventoryManager, async (req, res) => {
  try {
    const stockItems = await StockItem.find()
      .populate('supplier', 'name')
      .sort({ createdAt: -1 })
      .select('serial name category karat weight quantity supplier status');

    res.json({
      success: true,
      data: stockItems.map(buildStockRow)
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching stock', error: error.message });
  }
});

// POST /api/inventory/stock - Create a stock item from inventory dashboard
router.post('/stock', isInventoryManager, async (req, res) => {
  try {
    const { name, category, karat, weight, quantity, supplier } = req.body;

    if (!name || !category || weight === undefined || quantity === undefined) {
      return res.status(400).json({ message: 'name, category, weight and quantity are required' });
    }

    const parsedWeight = Number(weight);
    const parsedQuantity = Number(quantity);

    if (!Number.isFinite(parsedWeight) || parsedWeight < 0) {
      return res.status(400).json({ message: 'Weight cannot be negative' });
    }

    if (!Number.isFinite(parsedQuantity) || parsedQuantity < 0) {
      return res.status(400).json({ message: 'Quantity cannot be negative' });
    }

    const serial = await generateStockSerial();

    const stockItem = new StockItem({
      serial,
      name,
      category,
      karat,
      weight: parsedWeight,
      quantity: parsedQuantity,
      supplier: supplier || undefined
    });

    await stockItem.save();

    res.status(201).json({
      success: true,
      message: 'Stock added successfully',
      data: buildStockRow(await StockItem.findById(stockItem._id).populate('supplier', 'name'))
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Stock item already exists' });
    }
    console.error('Error adding stock:', error);
    res.status(500).json({
      message: 'Error adding stock',
      error: error.message,
      details: error.errors ? Object.values(error.errors).map((item) => item.message).join(', ') : undefined
    });
  }
});

// PUT /api/inventory/stock/:id - Update a stock item
router.put('/stock/:id', isInventoryManager, async (req, res) => {
  try {
    const stockItem = await StockItem.findById(req.params.id);
    if (!stockItem) {
      return res.status(404).json({ message: 'Stock item not found' });
    }

    const { name, category, karat, weight, quantity, supplier } = req.body;

    if (name !== undefined) stockItem.name = name;
    if (category !== undefined) stockItem.category = category;
    if (karat !== undefined) stockItem.karat = karat;
    if (weight !== undefined) {
      const parsedWeight = Number(weight);
      if (!Number.isFinite(parsedWeight) || parsedWeight < 0) {
        return res.status(400).json({ message: 'Weight cannot be negative' });
      }
      stockItem.weight = parsedWeight;
    }
    if (quantity !== undefined) {
      const parsedQuantity = Number(quantity);
      if (!Number.isFinite(parsedQuantity) || parsedQuantity < 0) {
        return res.status(400).json({ message: 'Quantity cannot be negative' });
      }
      stockItem.quantity = parsedQuantity;
    }
    if (supplier !== undefined) stockItem.supplier = supplier || undefined;

    await stockItem.save();
    const populatedStockItem = await StockItem.findById(stockItem._id).populate('supplier', 'name');

    res.json({
      success: true,
      message: 'Stock updated successfully',
      data: buildStockRow(populatedStockItem)
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating stock', error: error.message });
  }
});

// DELETE /api/inventory/stock/:id - Delete a stock item
router.delete('/stock/:id', isInventoryManager, async (req, res) => {
  try {
    const stockItem = await StockItem.findByIdAndDelete(req.params.id);
    if (!stockItem) {
      return res.status(404).json({ message: 'Stock item not found' });
    }

    res.json({ success: true, message: 'Stock deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting stock', error: error.message });
  }
});

// GET /api/inventory/products - Get all products for inventory view
router.get('/products', isInventoryManager, async (req, res) => {
  try {
    const { category, status } = req.query;
    let filter = {};
    if (category) filter.category = category;
    if (status) filter.productStatus = status;

    const products = await Product.find(filter)
      .populate('createdBy', 'fullName email')
      .sort({ createdAt: -1 });
    
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching products', error: error.message });
  }
});

// GET /api/inventory/suppliers - Get suppliers for inventory dashboard
router.get('/suppliers', isInventoryManager, async (req, res) => {
  try {
    const suppliers = await Supplier.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      count: suppliers.length,
      data: suppliers
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching suppliers', error: error.message });
  }
});

// PATCH /api/inventory/products/:id - Update product inventory details (Inventory Manager only)
// Inventory can update: weight, kType, karatRate, sku, stockQuantity
router.patch('/products/:id', isInventoryManager, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const { weight, kType, karatRate, sku, stockQuantity } = req.body;

    if (weight !== undefined) product.weight = weight;
    if (kType) {
      product.kType = kType;
      // Auto-fetch karatRate from gold rates if not explicitly provided
      if (!karatRate) {
        const rates = await GoldRate.findOne().sort({ lastUpdated: -1 });
        if (rates && rates[kType]) {
          product.karatRate = rates[kType];
        }
      }
    }
    if (karatRate !== undefined) product.karatRate = karatRate;
    if (sku !== undefined) product.sku = sku;
    if (stockQuantity !== undefined) product.stockQuantity = stockQuantity;

    // Inventory edits should not change publish status.
    // Keep Draft/Active as-is; publishing is handled by Product Manager flow.

    // Price auto-calculated in pre-save hook
    await product.save();

    const updatedProduct = await Product.findById(product._id)
      .populate('createdBy', 'fullName email');

    res.json(updatedProduct);
  } catch (error) {
    res.status(500).json({ message: 'Error updating product inventory', error: error.message });
  }
});

// ===== ORDER FULFILLMENT =====

// GET /api/inventory/orders - Get orders that need inventory fulfillment
router.get('/orders', isInventoryManager, async (req, res) => {
  try {
    const orders = await Order.find({ 
      inventoryNotified: true,
      status: { $in: ['Confirmed', 'Preparing'] }
    }).sort({ updatedAt: -1 });
    
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching orders', error: error.message });
  }
});

// PATCH /api/inventory/orders/:id/accept - Inventory accepts order for preparation
router.patch('/orders/:id/accept', isInventoryManager, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (!order.inventoryNotified) {
      return res.status(400).json({ message: 'This order has not been assigned to inventory' });
    }

    order.status = 'Preparing';
    order.inventoryAccepted = true;
    await order.save();

    // Send email to customer
    try {
      await emailService.sendCustomEmail(
        order.customerEmail,
        `Order #${order.orderNumber} - Being Prepared`,
        `<div style="font-family: 'Poppins', sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #6f0022; color: white; padding: 2rem; text-align: center;">
            <h1 style="margin: 0;">Saranya Jewellery</h1>
          </div>
          <div style="padding: 2rem; background: #f9f9f9;">
            <h2 style="color: #6f0022;">Your Order is Being Prepared!</h2>
            <p>Dear ${order.customerName},</p>
            <p>Great news! Your order <strong>#${order.orderNumber}</strong> is now being prepared by our inventory team.</p>
            <p>We will notify you once it's ready for collection.</p>
            <div style="background: white; padding: 1.5rem; border-radius: 8px; margin: 1rem 0;">
              <p><strong>Order Number:</strong> ${order.orderNumber}</p>
              <p><strong>Status:</strong> Preparing</p>
              <p><strong>Total:</strong> LKR ${order.total.toLocaleString()}</p>
            </div>
            <p style="color: #666;">Thank you for choosing Saranya Jewellery!</p>
          </div>
        </div>`
      );
    } catch (emailErr) {
      console.error('Failed to send preparation email:', emailErr);
    }

    res.json({ message: 'Order accepted for preparation', order });
  } catch (error) {
    res.status(500).json({ message: 'Error accepting order', error: error.message });
  }
});

// PATCH /api/inventory/orders/:id/ready - Mark order as ready for collection
router.patch('/orders/:id/ready', isInventoryManager, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.status !== 'Preparing') {
      return res.status(400).json({ message: 'Order must be in Preparing status' });
    }

    order.status = 'Ready for Collection';
    await order.save();

    // Send email to customer about collection
    try {
      await emailService.sendCustomEmail(
        order.customerEmail,
        `Order #${order.orderNumber} - Ready for Collection!`,
        `<div style="font-family: 'Poppins', sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #6f0022; color: white; padding: 2rem; text-align: center;">
            <h1 style="margin: 0;">Saranya Jewellery</h1>
          </div>
          <div style="padding: 2rem; background: #f9f9f9;">
            <h2 style="color: #28a745;">🎉 Your Order is Ready!</h2>
            <p>Dear ${order.customerName},</p>
            <p>Your order <strong>#${order.orderNumber}</strong> is ready for collection from our shop!</p>
            <div style="background: white; padding: 1.5rem; border-radius: 8px; margin: 1rem 0;">
              <p><strong>Order Number:</strong> ${order.orderNumber}</p>
              <p><strong>Status:</strong> Ready for Collection</p>
              <p><strong>Total:</strong> LKR ${order.total.toLocaleString()}</p>
            </div>
            <div style="background: #d4edda; padding: 1.5rem; border-radius: 8px; margin: 1rem 0;">
              <h3 style="color: #155724; margin-top: 0;">📍 Collection Details</h3>
              <p style="color: #155724;">You can collect your jewellery from our shop. Please bring your order number and a valid ID for verification.</p>
            </div>
            <p style="color: #666;">Thank you for choosing Saranya Jewellery!</p>
          </div>
        </div>`
      );
    } catch (emailErr) {
      console.error('Failed to send collection email:', emailErr);
    }

    res.json({ message: 'Order marked as ready for collection', order });
  } catch (error) {
    res.status(500).json({ message: 'Error updating order', error: error.message });
  }
});

// ===== SUPPLIER MANAGEMENT =====

// GET /api/inventory/suppliers - list suppliers for inventory manager
router.get('/suppliers', isInventoryManager, async (req, res) => {
  try {
    const suppliers = await Supplier.find().sort({ createdAt: -1 });
    res.json({ success: true, data: suppliers });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching suppliers', error: error.message });
  }
});

// POST /api/inventory/suppliers - create supplier
router.post('/suppliers', isInventoryManager, async (req, res) => {
  try {
    const { name, contact, email, location, itemsSupplied } = req.body;

    if (!name || !contact) {
      return res.status(400).json({ message: 'Name and contact are required' });
    }

    const count = await Supplier.countDocuments();
    const supplierId = `SUP-${String(count + 1).padStart(3, '0')}`;

    const supplier = new Supplier({
      supplierId,
      name,
      contact,
      email,
      location,
      itemsSupplied
    });

    await supplier.save();
    res.status(201).json({ success: true, data: supplier, message: 'Supplier added successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error adding supplier', error: error.message });
  }
});

// PUT /api/inventory/suppliers/:id - update supplier
router.put('/suppliers/:id', isInventoryManager, async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    const { name, contact, email, location, itemsSupplied } = req.body;
    if (name !== undefined) supplier.name = name;
    if (contact !== undefined) supplier.contact = contact;
    if (email !== undefined) supplier.email = email;
    if (location !== undefined) supplier.location = location;
    if (itemsSupplied !== undefined) supplier.itemsSupplied = itemsSupplied;

    await supplier.save();
    res.json({ success: true, data: supplier, message: 'Supplier updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating supplier', error: error.message });
  }
});

// DELETE /api/inventory/suppliers/:id - remove supplier
router.delete('/suppliers/:id', isInventoryManager, async (req, res) => {
  try {
    const supplier = await Supplier.findByIdAndDelete(req.params.id);
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    res.json({ success: true, message: 'Supplier deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting supplier', error: error.message });
  }
});

export default router;
