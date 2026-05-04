import express from 'express';
import Product from '../models/Product.js';
import StockItem from '../models/StockItem.js';
import GoldRate from '../models/GoldRate.js';
import { isAuthenticated, isProductManager } from '../middleware/auth.js';
import Staff from '../models/Staff.js';

const router = express.Router();

function normalizeProductCategory(category) {
  if (category === 'Bangle') return 'Bangles';
  if (category === 'Earring') return 'Earrings';
  return category;
}

// Get inventory-backed stock options for product manager (protected)
router.get('/stock-options', isProductManager, async (req, res) => {
  try {
    const stockItems = await StockItem.find({ quantity: { $gt: 0 } })
      .populate('supplier', 'name')
      .select('serial name category karat weight quantity supplier status')
      .sort({ updatedAt: -1 });

    // Fetch latest gold rates
    const latestRates = await GoldRate.findOne().sort({ lastUpdated: -1 });
    
    // Add calculated karatRate to each stock item
    const itemsWithRates = stockItems.map(item => {
      const itemObj = item.toObject();
      itemObj.karatRate = latestRates?.[item.karat] || 0;
      return itemObj;
    });

    res.json(itemsWithRates);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching stock options', error: error.message });
  }
});

// Get product statistics (protected route) - Must be before /:id route
router.get('/stats/overview', isAuthenticated, async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments();
    const featuredProducts = await Product.countDocuments({ featured: true });
    const inStockProducts = await Product.countDocuments({ availabilityStatus: 'In Stock' });
    
    // Get products created this week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const newThisWeek = await Product.countDocuments({ createdAt: { $gte: oneWeekAgo } });

    // Get category count
    const categories = await Product.distinct('category');

    res.json({
      totalProducts,
      featuredProducts,
      inStockProducts,
      newThisWeek,
      totalCategories: categories.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching statistics', error: error.message });
  }
});

// Get all products (public route)
router.get('/', async (req, res) => {
  try {
    const { category, kType, karat, availabilityStatus, isAvailable, featured, productStatus } = req.query;
    
    let filter = {};
    // Customers/guests should only see published products.
    // Staff can request other states explicitly.
    if (!req.session?.staffId && !productStatus) {
      filter.productStatus = 'Active';
    }
    if (category) filter.category = category;
    if (productStatus) filter.productStatus = productStatus;
    // Support both kType and karat parameters
    if (kType) filter.kType = kType;
    if (karat) filter.kType = karat;
    // Support both availabilityStatus and isAvailable parameters
    if (availabilityStatus) filter.availabilityStatus = availabilityStatus;
    if (isAvailable !== undefined) {
      filter.availabilityStatus = isAvailable === 'true' ? 'In Stock' : { $ne: 'In Stock' };
    }
    if (featured) filter.featured = featured === 'true';

    const products = await Product.find(filter)
      .populate('createdBy', 'fullName email')
      .sort({ createdAt: -1 });
    
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching products', error: error.message });
  }
});

// Get single product (public route)
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('createdBy', 'fullName email');
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching product', error: error.message });
  }
});

// Create new product (protected route - requires Product Manager role)
// Product Manager can ONLY set: name, description, image, category, featured
router.post('/', isProductManager, async (req, res) => {
  try {
    const {
      stockProductId,
      name,
      description,
      image,
      category,
      taxPercentage,
      featured
    } = req.body;

    const parsedTaxPercentage = Number(taxPercentage ?? 0);
    if (!Number.isFinite(parsedTaxPercentage) || parsedTaxPercentage < 0 || parsedTaxPercentage > 100) {
      return res.status(400).json({ message: 'Tax percentage must be between 0 and 100' });
    }

    // Debug logging
    console.log('Creating product with data:', {
      name, category,
      createdBy: req.session.staffId,
      sessionData: req.session
    });

    // Check if staff exists
    if (!req.session.staffId) {
      return res.status(401).json({ message: 'User session invalid. Please log in again.' });
    }

    const staff = await Staff.findById(req.session.staffId);
    if (!staff) {
      return res.status(401).json({ message: 'User not found. Please log in again.' });
    }

    // If product manager selected an existing inventory stock item,
    // create a product using the stock item as the source record.
    if (stockProductId) {
      if (!name || !name.trim()) {
        return res.status(400).json({ message: 'Please provide jewellery name' });
      }

      const stockProduct = await StockItem.findById(stockProductId).populate('supplier', 'name');
      if (!stockProduct) {
        return res.status(404).json({ message: 'Selected stock item not found' });
      }

      const latestRates = await GoldRate.findOne().sort({ lastUpdated: -1 });
      const karatRate = latestRates?.[stockProduct.karat] || 0;

      const product = new Product({
        name: name.trim(),
        description: description || `${stockProduct.name} created from inventory stock ${stockProduct.serial}`,
        image: image || '/assets/placeholder-product.jpg',
        category: normalizeProductCategory(category || stockProduct.category),
        taxPercentage: parsedTaxPercentage,
        featured: featured || false,
        weight: stockProduct.weight || 0,
        kType: stockProduct.karat || null,
        karatRate,
        stockQuantity: stockProduct.quantity || 0,
        supplier: stockProduct.supplier?.name || '',
        sku: stockProduct.serial,
        productStatus: 'Active',
        createdBy: req.session.staffId
      });

      await product.save();

      const populatedStockProduct = await Product.findById(product._id)
        .populate('createdBy', 'fullName email');

      return res.status(200).json(populatedStockProduct);
    }

    // Validate required fields for brand-new product creation
    if (!name || !description || !image || !category) {
      return res.status(400).json({ message: 'Please provide name, description, image, and category' });
    }

    const product = new Product({
      name,
      description,
      image,
      category,
      taxPercentage: parsedTaxPercentage,
      featured: featured || false,
      productStatus: 'Draft',
      createdBy: req.session.staffId
    });

    await product.save();
    
    const populatedProduct = await Product.findById(product._id)
      .populate('createdBy', 'fullName email');
    
    console.log('Product created successfully:', populatedProduct._id);
    res.status(201).json(populatedProduct);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ message: 'Error creating product', error: error.message });
  }
});

// Update product basic info (protected route - requires Product Manager role)
// Product Manager can ONLY update: name, description, image, category, featured
router.put('/:id', isProductManager, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const {
      name,
      description,
      image,
      category,
      taxPercentage,
      featured,
      availabilityStatus,
      productStatus
    } = req.body;

    if (name) product.name = name;
    if (description) product.description = description;
    if (image) product.image = image;
    if (category) product.category = category;
    if (taxPercentage !== undefined) {
      const parsedTaxPercentage = Number(taxPercentage);
      if (!Number.isFinite(parsedTaxPercentage) || parsedTaxPercentage < 0 || parsedTaxPercentage > 100) {
        return res.status(400).json({ message: 'Tax percentage must be between 0 and 100' });
      }
      product.taxPercentage = parsedTaxPercentage;
    }
    if (featured !== undefined) product.featured = featured;
    if (availabilityStatus && ['In Stock', 'Out of Stock', 'Pre-Order'].includes(availabilityStatus)) {
      product.availabilityStatus = availabilityStatus;
      if (availabilityStatus === 'Out of Stock') {
        product.stockQuantity = 0;
      }
    }
    if (productStatus && ['Draft', 'Active'].includes(productStatus)) {
      product.productStatus = productStatus;
    }

    await product.save();
    
    const updatedProduct = await Product.findById(product._id)
      .populate('createdBy', 'fullName email');
    
    res.json(updatedProduct);
  } catch (error) {
    res.status(500).json({ message: 'Error updating product', error: error.message });
  }
});

// Delete product (protected route - requires Product Manager role)
router.delete('/:id', isProductManager, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    await Product.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting product', error: error.message });
  }
});

export default router;
