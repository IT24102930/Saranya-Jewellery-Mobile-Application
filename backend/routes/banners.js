import express from 'express';
import Banner from '../models/Banner.js';
import { isAdmin, isApproved } from '../middleware/auth.js';

const router = express.Router();

// GET /api/banners/admin/all - Get all banners (admin only) - MUST BE BEFORE generic GET
router.get('/admin/all', isApproved, isAdmin, async (req, res) => {
  try {
    const banners = await Banner.find().sort({ createdAt: -1 });
    res.json(banners);
  } catch (error) {
    console.error('Error fetching banners:', error);
    res.status(500).json({ message: 'Failed to fetch banners' });
  }
});

// GET /api/banners - Get active banners (public)
router.get('/', async (req, res) => {
  try {
    const now = new Date();
    const banners = await Banner.find({
      isActive: true,
      startDate: { $lte: now },
      $or: [
        { endDate: null },
        { endDate: { $gte: now } }
      ]
    }).sort({ createdAt: -1 });

    res.json(banners);
  } catch (error) {
    console.error('Error fetching banners:', error);
    res.status(500).json({ message: 'Failed to fetch banners' });
  }
});

// POST /api/banners - Create new banner (admin only)
router.post('/', isApproved, isAdmin, async (req, res) => {
  try {
    const { message, type, startDate, endDate, backgroundColor, textColor } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ message: 'Banner message is required' });
    }

    const banner = new Banner({
      message: message.trim(),
      type: type || 'info',
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : null,
      backgroundColor: backgroundColor || '#fff3cd',
      textColor: textColor || '#856404',
      isActive: true
    });

    await banner.save();
    res.status(201).json(banner);
  } catch (error) {
    console.error('Error creating banner:', error);
    res.status(500).json({ message: 'Failed to create banner' });
  }
});

// PATCH /api/banners/:id - Update banner (admin only)
router.patch('/:id', isApproved, isAdmin, async (req, res) => {
  try {
    const { message, type, isActive, startDate, endDate, backgroundColor, textColor } = req.body;
    const updates = {};

    if (message !== undefined) updates.message = message.trim();
    if (type !== undefined) updates.type = type;
    if (isActive !== undefined) updates.isActive = isActive;
    if (startDate !== undefined) updates.startDate = new Date(startDate);
    if (endDate !== undefined) updates.endDate = endDate ? new Date(endDate) : null;
    if (backgroundColor !== undefined) updates.backgroundColor = backgroundColor;
    if (textColor !== undefined) updates.textColor = textColor;
    updates.updatedAt = new Date();

    const banner = await Banner.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!banner) {
      return res.status(404).json({ message: 'Banner not found' });
    }

    res.json(banner);
  } catch (error) {
    console.error('Error updating banner:', error);
    res.status(500).json({ message: 'Failed to update banner' });
  }
});

// DELETE /api/banners/:id - Delete banner (admin only)
router.delete('/:id', isApproved, isAdmin, async (req, res) => {
  try {
    const banner = await Banner.findByIdAndDelete(req.params.id);
    if (!banner) {
      return res.status(404).json({ message: 'Banner not found' });
    }

    res.json({ message: 'Banner deleted successfully' });
  } catch (error) {
    console.error('Error deleting banner:', error);
    res.status(500).json({ message: 'Failed to delete banner' });
  }
});

export default router;
