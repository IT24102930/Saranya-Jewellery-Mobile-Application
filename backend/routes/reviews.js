import express from 'express';
import Review from '../models/Review.js';
import Product from '../models/Product.js';
import { isAuthenticated, hasRole } from '../middleware/auth.js';

const router = express.Router();

// Public: Get approved reviews for a product
router.get('/product/:productId', async (req, res) => {
  try {
    const reviews = await Review.find({
      productId: req.params.productId,
      status: 'approved'
    })
    .populate('customerId', 'fullName')
    .sort({ createdAt: -1 })
    .limit(20);

    const avgRating = reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : 0;

    res.json({ reviews, avgRating, totalReviews: reviews.length });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ message: 'Error fetching reviews' });
  }
});

// Customer: Submit a review
router.post('/', isAuthenticated, async (req, res) => {
  try {
    const { productId, rating, title, comment } = req.body;

    if (!productId || !rating || !title || !comment) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const review = new Review({
      productId,
      productName: product.name,
      customerId: req.session.userId,
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
          'staffReply.repliedBy': req.session.userId,
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
        'staffReply.repliedBy': req.session.userId,
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

export default router;
