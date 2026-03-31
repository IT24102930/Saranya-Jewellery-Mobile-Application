import express from 'express';
import Customer from '../models/Customer.js';
import LoyaltyTier from '../models/LoyaltyTier.js';
import LoyaltyOffer from '../models/LoyaltyOffer.js';
import Order from '../models/Order.js';
import { isLoyaltyManager, isApproved } from '../middleware/auth.js';
import emailService from '../utils/emailService.js';

const router = express.Router();

const defaultTiers = [
  {
    tierName: 'Silver',
    minSpent: 0,
    maxSpent: 50000,
    pointMultiplier: 1,
    benefits: [
      '1 point per Rs. 100 spent',
      'Birthday discount',
      'Priority support'
    ],
    description: 'Entry-level loyalty program with essential benefits'
  },
  {
    tierName: 'Gold',
    minSpent: 50001,
    maxSpent: 200000,
    pointMultiplier: 1.5,
    benefits: [
      '1.5 points per Rs. 100 spent',
      'Exclusive previews',
      'Free cleaning service',
      '10% discount on repairs'
    ],
    description: 'Premium loyalty program with enhanced benefits'
  },
  {
    tierName: 'Platinum',
    minSpent: 200001,
    maxSpent: 999999999,
    pointMultiplier: 2,
    benefits: [
      '2 points per Rs. 100 spent',
      'VIP events access',
      'Personal shopper',
      '15% discount on all repairs',
      'Complimentary gift wrapping'
    ],
    description: 'Elite loyalty program with VIP privileges'
  }
];

// ============ TIER MANAGEMENT ============

// Get all loyalty tiers
router.get('/tiers', isLoyaltyManager, isApproved, async (req, res) => {
  try {
    let tiers = await LoyaltyTier.find().sort({ minSpent: 1 });

    if (tiers.length === 0) {
      await LoyaltyTier.insertMany(defaultTiers);
      tiers = await LoyaltyTier.find().sort({ minSpent: 1 });
    }

    res.json(tiers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tiers', error: error.message });
  }
});

// Get single tier
router.get('/tiers/:id', isLoyaltyManager, isApproved, async (req, res) => {
  try {
    const tier = await LoyaltyTier.findById(req.params.id);
    if (!tier) return res.status(404).json({ message: 'Tier not found' });
    res.json(tier);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tier', error: error.message });
  }
});

// Update tier configuration
router.put('/tiers/:id', isLoyaltyManager, isApproved, async (req, res) => {
  try {
    const { minSpent, maxSpent, pointMultiplier, benefits, description } = req.body;
    
    const tier = await LoyaltyTier.findByIdAndUpdate(
      req.params.id,
      {
        minSpent,
        maxSpent,
        pointMultiplier,
        benefits,
        description,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );
    
    if (!tier) return res.status(404).json({ message: 'Tier not found' });
    res.json({ message: 'Tier updated successfully', tier });
  } catch (error) {
    res.status(500).json({ message: 'Error updating tier', error: error.message });
  }
});

// ============ CUSTOMER LOYALTY MANAGEMENT ============

// Get all customers (loyal and non-loyal)
router.get('/members', isLoyaltyManager, isApproved, async (req, res) => {
  try {
    const customers = await Customer.find().sort({ createdAt: -1 });
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching customers', error: error.message });
  }
});

// Add customer to loyalty program
router.post('/members/add', isLoyaltyManager, isApproved, async (req, res) => {
  try {
    const { customerId } = req.body;
    
    const customer = await Customer.findById(customerId);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    if (customer.isLoyalty) return res.status(400).json({ message: 'Customer is already a loyalty member' });
    
    // Set customer to Silver tier by default
    customer.isLoyalty = true;
    customer.loyaltyTier = 'Silver';
    customer.loyaltyJoinedDate = new Date();
    customer.loyaltyPoints = customer.loyaltyPoints || 0;
    
    await customer.save();
    
    res.json({ 
      message: 'Customer added to loyalty program as Silver tier',
      customer 
    });
  } catch (error) {
    res.status(500).json({ message: 'Error adding customer to loyalty', error: error.message });
  }
});

// Remove customer from loyalty program
router.post('/members/remove', isLoyaltyManager, isApproved, async (req, res) => {
  try {
    const { customerId } = req.body;
    
    const customer = await Customer.findById(customerId);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    
    customer.isLoyalty = false;
    customer.loyaltyTier = null;
    customer.loyaltyJoinedDate = null;
    customer.loyaltyPoints = 0;
    customer.totalSpent = 0;
    customer.pointsRedeemed = 0;
    
    await customer.save();
    
    res.json({ 
      message: 'Customer removed from loyalty program',
      customer 
    });
  } catch (error) {
    res.status(500).json({ message: 'Error removing customer from loyalty', error: error.message });
  }
});

// Upgrade customer tier
router.post('/members/upgrade/:customerId', isLoyaltyManager, isApproved, async (req, res) => {
  try {
    const { customerId } = req.params;
    const { newTier } = req.body;
    
    const validTiers = ['Silver', 'Gold', 'Platinum'];
    if (!validTiers.includes(newTier)) {
      return res.status(400).json({ message: 'Invalid tier' });
    }
    
    const customer = await Customer.findById(customerId);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    if (!customer.isLoyalty) return res.status(400).json({ message: 'Customer is not a loyalty member' });
    
    const oldTier = customer.loyaltyTier;
    const preservedPoints = customer.loyaltyPoints || 0;
    const preservedTotalSpent = customer.totalSpent || 0;
    customer.loyaltyTier = newTier;
    customer.loyaltyPoints = preservedPoints;
    customer.totalSpent = preservedTotalSpent;
    await customer.save();
    
    res.json({ 
      message: `Customer tier upgraded from ${oldTier} to ${newTier}`,
      customer 
    });
  } catch (error) {
    res.status(500).json({ message: 'Error upgrading customer tier', error: error.message });
  }
});

// Downgrade customer tier
router.post('/members/downgrade/:customerId', isLoyaltyManager, isApproved, async (req, res) => {
  try {
    const { customerId } = req.params;
    const { newTier } = req.body;
    
    const validTiers = ['Silver', 'Gold', 'Platinum'];
    if (!validTiers.includes(newTier)) {
      return res.status(400).json({ message: 'Invalid tier' });
    }
    
    const customer = await Customer.findById(customerId);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    if (!customer.isLoyalty) return res.status(400).json({ message: 'Customer is not a loyalty member' });
    
    const oldTier = customer.loyaltyTier;
    const preservedPoints = customer.loyaltyPoints || 0;
    const preservedTotalSpent = customer.totalSpent || 0;
    customer.loyaltyTier = newTier;
    customer.loyaltyPoints = preservedPoints;
    customer.totalSpent = preservedTotalSpent;
    await customer.save();
    
    res.json({ 
      message: `Customer tier downgraded from ${oldTier} to ${newTier}`,
      customer 
    });
  } catch (error) {
    res.status(500).json({ message: 'Error downgrading customer tier', error: error.message });
  }
});

// Check for tier eligibility based on total spent
router.post('/members/check-eligibility/:customerId', isLoyaltyManager, isApproved, async (req, res) => {
  try {
    const { customerId } = req.params;
    
    const customer = await Customer.findById(customerId);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    
    const tiers = await LoyaltyTier.find().sort({ minSpent: 1 });
    
    let eligibleTier = null;
    for (const tier of tiers) {
      if (customer.totalSpent >= tier.minSpent && customer.totalSpent <= tier.maxSpent) {
        eligibleTier = tier.tierName;
      }
    }
    
    // Check if customer is eligible for upgrade
    const currentTierIndex = ['Silver', 'Gold', 'Platinum'].indexOf(customer.loyaltyTier);
    const eligibleTierIndex = ['Silver', 'Gold', 'Platinum'].indexOf(eligibleTier);
    
    const isEligibleForUpgrade = eligibleTierIndex > currentTierIndex;
    
    res.json({
      customer: {
        id: customer._id,
        name: customer.fullName,
        email: customer.email,
        currentTier: customer.loyaltyTier,
        totalSpent: customer.totalSpent,
        eligibleTier,
        isEligibleForUpgrade,
        message: isEligibleForUpgrade ? 
          `Customer is eligible to upgrade to ${eligibleTier} tier!` :
          'Customer is in appropriate tier'
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error checking eligibility', error: error.message });
  }
});

// Award loyalty points
router.post('/members/award-points', isLoyaltyManager, isApproved, async (req, res) => {
  try {
    const { customerId, points, reason } = req.body;
    
    const customer = await Customer.findById(customerId);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    if (!customer.isLoyalty) return res.status(400).json({ message: 'Customer is not a loyalty member' });
    
    customer.loyaltyPoints = (customer.loyaltyPoints || 0) + points;
    await customer.save();
    
    res.json({ 
      message: `${points} points awarded to ${customer.fullName}`,
      customer 
    });
  } catch (error) {
    res.status(500).json({ message: 'Error awarding points', error: error.message });
  }
});

// ============ LOYALTY OFFERS MANAGEMENT ============

// Get all offers
router.get('/offers', isLoyaltyManager, isApproved, async (req, res) => {
  try {
    const offers = await LoyaltyOffer.find().sort({ createdAt: -1 });
    res.json(offers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching offers', error: error.message });
  }
});

// Create new offer
router.post('/offers', isLoyaltyManager, isApproved, async (req, res) => {
  try {
    const { 
      title, 
      description, 
      tierType, 
      discountPercentage, 
      discountAmount, 
      validUntil 
    } = req.body;
    
    const offer = new LoyaltyOffer({
      title,
      description,
      tierType,
      discountPercentage,
      discountAmount,
      validUntil: new Date(validUntil)
    });
    
    await offer.save();
    res.json({ message: 'Offer created successfully', offer });
  } catch (error) {
    res.status(500).json({ message: 'Error creating offer', error: error.message });
  }
});

// Update offer
router.put('/offers/:id', isLoyaltyManager, isApproved, async (req, res) => {
  try {
    const { 
      title, 
      description, 
      tierType, 
      discountPercentage, 
      discountAmount, 
      validUntil,
      isActive 
    } = req.body;
    
    const offer = await LoyaltyOffer.findByIdAndUpdate(
      req.params.id,
      {
        title,
        description,
        tierType,
        discountPercentage,
        discountAmount,
        validUntil: validUntil ? new Date(validUntil) : undefined,
        isActive,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );
    
    if (!offer) return res.status(404).json({ message: 'Offer not found' });
    res.json({ message: 'Offer updated successfully', offer });
  } catch (error) {
    res.status(500).json({ message: 'Error updating offer', error: error.message });
  }
});

// Delete offer
router.delete('/offers/:id', isLoyaltyManager, isApproved, async (req, res) => {
  try {
    const offer = await LoyaltyOffer.findByIdAndDelete(req.params.id);
    if (!offer) return res.status(404).json({ message: 'Offer not found' });
    res.json({ message: 'Offer deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting offer', error: error.message });
  }
});

// Send offer email to loyalty customers
router.post('/offers/:id/send-email', isLoyaltyManager, isApproved, async (req, res) => {
  try {
    const offer = await LoyaltyOffer.findById(req.params.id);
    if (!offer) return res.status(404).json({ message: 'Offer not found' });
    
    // Get eligible customers based on tier
    let query = { isLoyalty: true };
    if (offer.tierType !== 'All') {
      query.loyaltyTier = offer.tierType;
    }
    
    const customers = await Customer.find(query);
    
    let successCount = 0;
    let failCount = 0;
    
    for (const customer of customers) {
      try {
        const emailContent = `
          <h2>${offer.title}</h2>
          <p>${offer.description}</p>
          <h3>Offer Details:</h3>
          <p>Discount: ${offer.discountPercentage}% Off${offer.discountAmount ? ` or Rs. ${offer.discountAmount} Off` : ''}</p>
          <p>Valid Until: ${new Date(offer.validUntil).toLocaleDateString()}</p>
          <p>Loyalty Tier: ${offer.tierType}</p>
        `;
        
        const emailResult = await emailService.sendCustomEmail(
          customer.email,
          `Exclusive Offer for You: ${offer.title}`,
          emailContent
        );
        if (!emailResult.success) {
          failCount++;
          console.error(`Failed to send email to ${customer.email}:`, emailResult.error);
        } else {
        successCount++;
        }
      } catch (emailError) {
        failCount++;
        console.error(`Failed to send email to ${customer.email}:`, emailError.message);
      }
    }
    
    offer.emailSent = true;
    offer.sentAt = new Date();
    offer.recipientsCount = successCount;
    await offer.save();
    
    res.json({ 
      message: `Emails sent to ${successCount} customers, ${failCount} failed`,
      offer,
      successCount,
      failCount
    });
  } catch (error) {
    res.status(500).json({ message: 'Error sending emails', error: error.message });
  }
});

// Get loyalty dashboard stats
router.get('/dashboard/stats', isLoyaltyManager, isApproved, async (req, res) => {
  try {
    const activeMembers = await Customer.countDocuments({ isLoyalty: true });
    const silverMembers = await Customer.countDocuments({ loyaltyTier: 'Silver' });
    const goldMembers = await Customer.countDocuments({ loyaltyTier: 'Gold' });
    const platinumMembers = await Customer.countDocuments({ loyaltyTier: 'Platinum' });
    
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    const newMembers = await Customer.countDocuments({ 
      isLoyalty: true,
      loyaltyJoinedDate: { $gte: monthAgo } 
    });
    
    const totalPointsIssued = await Customer.aggregate([
      { $group: { _id: null, total: { $sum: '$loyaltyPoints' } } }
    ]);
    
    const totalPointsRedeemed = await Customer.aggregate([
      { $group: { _id: null, total: { $sum: '$pointsRedeemed' } } }
    ]);
    
    res.json({
      activeMembers,
      silverMembers,
      goldMembers,
      platinumMembers,
      newMembers,
      pointsIssued: totalPointsIssued[0]?.total || 0,
      pointsRedeemed: totalPointsRedeemed[0]?.total || 0
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching stats', error: error.message });
  }
});

export default router;
