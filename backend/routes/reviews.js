import express from 'express';
import Review from '../models/Review.js';
import Product from '../models/Product.js';
import { isAuthenticated, hasRole } from '../middleware/auth.js';

const router = express.Router();

// Public: Get approved reviews for a product + customer's own pending reviews
router.get('/product/:productId', async (req, res) => {
  try {
    const productId = req.params.productId;
    const customerId = req.session?.customerId;

    // Get all approved reviews
    const approvedReviews = await Review.find({
      productId,
      status: 'approved'
    })
    .populate('customerId', 'fullName')
    .sort({ createdAt: -1 });

    // If customer is logged in, also get their pending/rejected reviews for this product
    let customerReviews = [];
    if (customerId) {
      customerReviews = await Review.find({
        productId,
        customerId,
        status: { $in: ['pending', 'rejected'] }
      })
      .populate('customerId', 'fullName')
      .sort({ createdAt: -1 });
    }

    // Combine reviews (approved first, then customer's own pending)
    const allReviews = [...approvedReviews, ...customerReviews];

    const avgRating = approvedReviews.length > 0
      ? (approvedReviews.reduce((sum, r) => sum + r.rating, 0) / approvedReviews.length).toFixed(1)
      : 0;

    res.json({ reviews: allReviews, avgRating, totalReviews: approvedReviews.length });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ message: 'Error fetching reviews' });
  }
});

// Customer: Submit a review
router.post('/', isAuthenticated, async (req, res) => {
  try {
    const { orderId, productId, rating, title, comment } = req.body;

    if (!orderId || !productId || !rating || !title || !comment) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const review = new Review({
      orderId,
      productId,
      productName: product.name,
      customerId: req.session.customerId,
      customerName: req.session.fullName || 'Anonymous',
      customerEmail: req.session.email,
      rating,
      title,
      comment,
      status: 'pending'
    });

    await review.save();
    res.status(201).json({ message: 'Review submitted successfully', review });
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ message: 'Error creating review' });
  }
});

// Customer: Get their own reviews
router.get('/my/reviews', isAuthenticated, async (req, res) => {
  try {
    const customerId = req.session.customerId;

    const reviews = await Review.find({ customerId })
      .sort({ createdAt: -1 });

    res.json({ reviews });
  } catch (error) {
    console.error('Error fetching customer reviews:', error);
    res.status(500).json({ message: 'Error fetching reviews' });
  }
});

// Staff: Get all reviews (pending, approved, rejected)
router.get('/', isAuthenticated, hasRole('Customer Care', 'Admin'), async (req, res) => {
  try {
    const { status, productId } = req.query;
    let filter = {};
    if (status) filter.status = status;
    if (productId) filter.productId = productId;

    const reviews = await Review.find(filter)
      .populate('customerId', 'fullName email')
      .sort({ createdAt: -1 });

    const stats = {
      pending: await Review.countDocuments({ status: 'pending' }),
      approved: await Review.countDocuments({ status: 'approved' }),
      rejected: await Review.countDocuments({ status: 'rejected' })
    };

    res.json({ reviews, stats });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ message: 'Error fetching reviews' });
  }
});

// Staff: Approve/reject a review
router.patch('/:reviewId/status', isAuthenticated, hasRole('Customer Care', 'Admin'), async (req, res) => {
  try {
    const { status, staffReply } = req.body;

    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const review = await Review.findByIdAndUpdate(
      req.params.reviewId,
      {
        status,
        ...(staffReply && {
          'staffReply.reply': staffReply,
          'staffReply.repliedBy': req.session.staffId,
          'staffReply.repliedAt': new Date()
        })
      },
      { new: true }
    );

    if (!review) return res.status(404).json({ message: 'Review not found' });

    res.json({ message: `Review ${status}`, review });
  } catch (error) {
    console.error('Error updating review:', error);
    res.status(500).json({ message: 'Error updating review' });
  }
});

// Staff: Delete a review
router.delete('/:reviewId', isAuthenticated, hasRole('Customer Care', 'Admin'), async (req, res) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.reviewId);
    if (!review) return res.status(404).json({ message: 'Review not found' });

    res.json({ message: 'Review deleted' });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ message: 'Error deleting review' });
  }
});

// Staff: Reply to a review
router.post('/:reviewId/reply', isAuthenticated, hasRole('Customer Care', 'Admin'), async (req, res) => {
  try {
    const { reply } = req.body;

    if (!reply) {
      return res.status(400).json({ message: 'Reply message required' });
    }

    const review = await Review.findByIdAndUpdate(
      req.params.reviewId,
      {
        'staffReply.reply': reply,
        'staffReply.repliedBy': req.session.staffId,
        'staffReply.repliedAt': new Date()
      },
      { new: true }
    );

    if (!review) return res.status(404).json({ message: 'Review not found' });

    res.json({ message: 'Reply added', review });
  } catch (error) {
    console.error('Error replying to review:', error);
    res.status(500).json({ message: 'Error replying to review' });
  }
});

// Customer: Get eligible items for review (completed orders)
router.get('/customer/eligible-items', isAuthenticated, async (req, res) => {
  try {
    const customerId = req.session.customerId;

    // Import Order model
    const Order = (await import('../models/Order.js')).default;

    // Get completed orders for this customer (status: 'Completed' or 'Ready for Collection')
    const completedOrders = await Order.find({
      customerId,
      status: { $in: ['Completed', 'Ready for Collection'] }
    })
    .sort({ createdAt: -1 });

    // Flatten items and get existing reviews
    const eligibleItems = [];
    for (const order of completedOrders) {
      for (const item of order.items) {
        const existingReview = await Review.findOne({
          customerId,
          productId: item.productId,
          orderId: order._id
        });

        eligibleItems.push({
          orderId: order._id,
          orderNumber: order.orderNumber,
          orderDate: order.createdAt,
          orderStatus: order.status,
          productId: item.productId,
          productName: item.name,
          productImage: item.imageUrl,
          review: existingReview
        });
      }
    }

    res.json(eligibleItems);
  } catch (error) {
    console.error('Error fetching eligible items:', error);
    res.status(500).json({ message: 'Error fetching eligible items' });
  }
});

// Public: Get review summary for multiple products
router.get('/summary', async (req, res) => {
  try {
    const { productIds } = req.query;
    if (!productIds) {
      return res.status(400).json({ message: 'Product IDs required' });
    }

    const ids = String(productIds).split(',').filter(id => id.trim());
    const summary = {};

    for (const productId of ids) {
      const reviews = await Review.find({
        productId,
        status: 'approved'
      });

      if (reviews.length > 0) {
        const avgRating = (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1);
        summary[productId] = {
          avgRating: Number(avgRating),
          totalReviews: reviews.length
        };
      } else {
        summary[productId] = {
          avgRating: 0,
          totalReviews: 0
        };
      }
    }

    res.json({ summary });
  } catch (error) {
    console.error('Error fetching review summary:', error);
    res.status(500).json({ message: 'Error fetching review summary' });
  }
});

export default router;
