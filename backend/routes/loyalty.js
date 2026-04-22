import express from 'express';
import Customer from '../models/Customer.js';
import LoyaltyTier from '../models/LoyaltyTier.js';
import LoyaltyOffer from '../models/LoyaltyOffer.js';
import StandardOffer from '../models/StandardOffer.js';
import Coupon from '../models/Coupon.js';
import Order from '../models/Order.js';
import { isLoyaltyManager, isApproved, isCustomerCareManager } from '../middleware/auth.js';
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

// Update loyalty member points (set to specific value)
router.post('/members/points/:customerId', isLoyaltyManager, isApproved, async (req, res) => {
  try {
    const { customerId } = req.params;
    const { points } = req.body;
    
    // Validate points
    if (typeof points !== 'number' || points < 0) {
      return res.status(400).json({ message: 'Points must be a non-negative number' });
    }
    
    const customer = await Customer.findById(customerId);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    if (!customer.isLoyalty) return res.status(400).json({ message: 'Customer is not a loyalty member' });
    
    const previousPoints = customer.loyaltyPoints || 0;
    customer.loyaltyPoints = points;
    await customer.save();
    
    res.json({ 
      message: `Loyalty points updated from ${previousPoints} to ${points} for ${customer.fullName}`,
      customer 
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating loyalty points', error: error.message });
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

// ============ STANDARD CUSTOMER OFFERS (Must come BEFORE general /offers routes) ============
// NOTE: This section is for Customer Care Manager ONLY - sends to non-loyalty customers
// Loyalty tier customers (Silver, Gold, Platinum) are managed separately via /offers endpoints
// StandardOffer collection is independent from LoyaltyOffer collection

// PUBLIC ROUTE - Get active standard offers for customers (no auth required)
router.get('/offers/standard/active/list', async (req, res) => {
  try {
    const offers = await StandardOffer.find({
      isActive: true,
      $or: [
        { validUntil: { $exists: false } },
        { validUntil: { $gte: new Date() } }
      ]
    })
    .select('title description discountPercentage discountAmount validFrom validUntil couponCode')
    .sort({ createdAt: -1 })
    .limit(10);
    
    res.json(offers);
  } catch (error) {
    console.error('Error fetching active standard offers:', error);
    res.status(500).json({ message: 'Error fetching standard offers', error: error.message });
  }
});

// Get all standard customer offers (Manager only)
router.get('/offers/standard', isCustomerCareManager, isApproved, async (req, res) => {
  try {
    const offers = await StandardOffer.find().sort({ createdAt: -1 });
    res.json(offers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching standard offers', error: error.message });
  }
});

// Create standard customer offer (Customer Care Manager for non-loyalty customers)
router.post('/offers/standard/create', isCustomerCareManager, isApproved, async (req, res) => {
  try {
    const { 
      title, 
      description, 
      discountPercentage, 
      discountAmount, 
      validFrom,
      validUntil,
      couponCode
    } = req.body;
    
    if (!couponCode) {
      return res.status(400).json({ message: 'Coupon code is required' });
    }
    
    // Create offer for standard customers in StandardOffer collection
    const offer = new StandardOffer({
      title,
      description,
      discountPercentage,
      discountAmount,
      validFrom: new Date(validFrom),
      validUntil: new Date(validUntil),
      couponCode,
      isActive: true
    });
    
    await offer.save();
    
    // Create corresponding coupon record in Coupons collection
    const coupon = new Coupon({
      code: offer.couponCode,
      offerId: offer._id,
      assignedTier: 'Standard',
      discountType: discountPercentage > 0 ? 'percentage' : 'fixed',
      discountValue: discountPercentage > 0 ? discountPercentage : discountAmount,
      validFrom: offer.validFrom,
      validUntil: offer.validUntil,
      maxUses: 999, // Allow unlimited uses for standard coupons
      isActive: true
    });
    
    await coupon.save();
    
    res.json({ message: 'Standard customer offer created successfully', offer, coupon });
  } catch (error) {
    res.status(500).json({ message: 'Error creating standard offer', error: error.message });
  }
});

// Send emails to STANDARD CUSTOMERS ONLY (non-loyalty customers)
// Auto-generates coupons targeting customers where isLoyalty=false OR loyaltyTier=null
// Loyalty tier customers will NOT receive these emails
router.post('/offers/standard/:id/send-coupons', isCustomerCareManager, isApproved, async (req, res) => {
  try {
    const offer = await StandardOffer.findById(req.params.id);
    if (!offer) return res.status(404).json({ message: 'Offer not found' });
    
    // Get all standard customers (non-loyalty customers only)
    const customers = await Customer.find({ $or: [{ isLoyalty: false }, { loyaltyTier: null }] });
    
    let successCount = 0;
    let failCount = 0;
    
    // Send the same coupon code to all standard customers
    for (const customer of customers) {
      try {
        const emailContent = `
          <h2>${offer.title}</h2>
          <p>${offer.description}</p>
          <hr/>
          <h3>Your Exclusive Coupon Code:</h3>
          <div style="background-color: #f0f0f0; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <h1 style="color: #d4af37; letter-spacing: 2px; font-weight: bold;">${offer.couponCode}</h1>
          </div>
          <h3>Offer Details:</h3>
          <p><strong>Discount:</strong> ${offer.discountPercentage > 0 ? offer.discountPercentage + '%' : 'Rs. ' + offer.discountAmount} Off</p>
          <p><strong>Valid From:</strong> ${new Date(offer.validFrom).toLocaleDateString()}</p>
          <p><strong>Valid Until:</strong> ${new Date(offer.validUntil).toLocaleDateString()}</p>
          <hr/>
          <p style="color: #666;">Use this coupon code at checkout to enjoy your exclusive discount!</p>
        `;
        
        await emailService.sendCustomEmail(
          customer.email,
          `Your Exclusive Coupon: ${offer.couponCode}`,
          emailContent
        );
        
        successCount++;
      } catch (emailError) {
        failCount++;
        console.error(`Failed to send coupon to ${customer.email}:`, emailError.message);
      }
    }
    
    offer.emailSent = true;
    offer.sentAt = new Date();
    offer.recipientsCount = successCount;
    await offer.save();
    
    res.json({ 
      message: `Coupon sent to ${successCount} customers, ${failCount} failed`,
      offer,
      successCount,
      failCount,
      totalStandardCustomers: successCount + failCount
    });
  } catch (error) {
    res.status(500).json({ message: 'Error sending coupons', error: error.message });
  }
});

// Update standard customer offer
router.put('/offers/standard/:id', isCustomerCareManager, isApproved, async (req, res) => {
  try {
    const { 
      title, 
      description, 
      discountPercentage, 
      discountAmount, 
      validUntil,
      couponCode
    } = req.body;

    const offer = await StandardOffer.findById(req.params.id);
    if (!offer) return res.status(404).json({ message: 'Standard offer not found' });

    // Update fields
    if (title) offer.title = title;
    if (description) offer.description = description;
    if (discountPercentage !== undefined) offer.discountPercentage = discountPercentage;
    if (discountAmount !== undefined) offer.discountAmount = discountAmount;
    if (validUntil) offer.validUntil = new Date(validUntil);
    if (couponCode) offer.couponCode = couponCode;
    offer.updatedAt = new Date();

    await offer.save();
    
    // Update corresponding coupon
    await Coupon.findOneAndUpdate(
      { offerId: req.params.id },
      {
        code: offer.couponCode,
        assignedTier: 'Standard',
        discountType: offer.discountPercentage > 0 ? 'percentage' : 'fixed',
        discountValue: offer.discountPercentage > 0 ? offer.discountPercentage : offer.discountAmount,
        validFrom: offer.validFrom,
        validUntil: offer.validUntil,
        isActive: offer.isActive
      }
    );
    
    res.json({ message: 'Standard offer updated successfully', offer });
  } catch (error) {
    res.status(500).json({ message: 'Error updating standard offer', error: error.message });
  }
});

// Delete standard customer offer (also delete associated coupons)
router.delete('/offers/standard/:id', isCustomerCareManager, isApproved, async (req, res) => {
  try {
    const offer = await StandardOffer.findById(req.params.id);
    if (!offer) return res.status(404).json({ message: 'Standard offer not found' });
    
    // Delete associated coupons
    await Coupon.deleteMany({ offerId: req.params.id });
    
    // Delete the offer
    await StandardOffer.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Standard offer and associated coupons deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting standard offer', error: error.message });
  }
});

// ============ LOYALTY OFFERS (General) ============
// NOTE: This section is for Loyalty Manager ONLY - sends to loyalty tier customers (Silver, Gold, Platinum, All)
// LoyaltyOffer collection is independent from StandardOffer collection
// Only customers with loyalty tiers receive these offers

// Create new offer (Loyalty Manager for loyalty customers)
router.post('/offers', isLoyaltyManager, isApproved, async (req, res) => {
  try {
    const { 
      title, 
      description, 
      tierType, 
      discountPercentage, 
      discountAmount,
      validFrom,
      validUntil,
      couponCode
    } = req.body;
    
    const offer = new LoyaltyOffer({
      title,
      description,
      tierType,
      discountPercentage,
      discountAmount,
      validFrom: validFrom ? new Date(validFrom) : new Date(),
      validUntil: new Date(validUntil),
      couponCode: couponCode ? couponCode.toUpperCase() : ''
    });
    
    await offer.save();
    
    // Create corresponding coupon record
    const coupon = new Coupon({
      code: offer.couponCode,
      offerId: offer._id,
      assignedTier: tierType,
      discountType: discountPercentage > 0 ? 'percentage' : 'fixed',
      discountValue: discountPercentage > 0 ? discountPercentage : discountAmount,
      validFrom: offer.validFrom,
      validUntil: offer.validUntil,
      maxUses: 999, // Allow unlimited uses for loyalty coupons
      isActive: true
    });
    
    await coupon.save();
    
    res.json({ message: 'Offer created successfully', offer, coupon });
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
      validFrom,
      validUntil,
      couponCode,
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
        validFrom: validFrom ? new Date(validFrom) : undefined,
        validUntil: validUntil ? new Date(validUntil) : undefined,
        couponCode: couponCode ? couponCode.toUpperCase() : undefined,
        isActive,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );
    
    if (!offer) return res.status(404).json({ message: 'Offer not found' });
    
    // Update corresponding coupon
    await Coupon.findOneAndUpdate(
      { offerId: req.params.id },
      {
        code: offer.couponCode,
        assignedTier: offer.tierType,
        discountType: offer.discountPercentage > 0 ? 'percentage' : 'fixed',
        discountValue: offer.discountPercentage > 0 ? offer.discountPercentage : offer.discountAmount,
        validFrom: offer.validFrom,
        validUntil: offer.validUntil,
        isActive: offer.isActive
      }
    );
    
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
    
    // Cascade delete the corresponding coupon
    await Coupon.deleteOne({ offerId: req.params.id });
    
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
// ============ COUPON MANAGEMENT ============

// Generate coupons for an offer
router.post('/offers/:id/generate-coupons', isLoyaltyManager, isApproved, async (req, res) => {
  try {
    const { couponPrefix } = req.body;
    const offer = await LoyaltyOffer.findById(req.params.id);
    
    if (!offer) return res.status(404).json({ message: 'Offer not found' });
    if (offer.couponsGenerated) {
      return res.status(400).json({ message: 'Coupons already generated for this offer' });
    }
    
    // Get eligible customers based on tier
    let query = { isLoyalty: true };
    if (offer.tierType !== 'All') {
      query.loyaltyTier = offer.tierType;
    }
    
    const customers = await Customer.find(query);
    if (customers.length === 0) {
      return res.status(400).json({ message: 'No eligible loyal customers found for this offer tier' });
    }
    
    let generatedCount = 0;
    const coupons = [];
    
    for (let i = 0; i < customers.length; i++) {
      const customer = customers[i];
      const code = `${couponPrefix}${offer._id.toString().slice(-6).toUpperCase()}${String(i + 1).padStart(4, '0')}`;
      
      const coupon = new Coupon({
        code,
        offerId: offer._id,
        customerId: customer._id,
        assignedTier: customer.loyaltyTier || offer.tierType,
        discountType: offer.discountPercentage > 0 ? 'percentage' : 'fixed',
        discountValue: offer.discountPercentage > 0 ? offer.discountPercentage : offer.discountAmount,
        validFrom: offer.validFrom,
        validUntil: offer.validUntil
      });
      
      await coupon.save();
      coupons.push(coupon);
      generatedCount++;
    }
    
    // Update offer
    offer.usesCouponSystem = true;
    offer.couponPrefix = couponPrefix;
    offer.generatedCouponsCount = generatedCount;
    offer.couponsGenerated = true;
    offer.generatedAt = new Date();
    await offer.save();
    
    res.json({ 
      message: `Generated ${generatedCount} coupons for offer`,
      offer,
      generatedCount,
      couponsGenerated: coupons.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Error generating coupons', error: error.message });
  }
});

// Send coupons via email
router.post('/offers/:id/send-coupons', isLoyaltyManager, isApproved, async (req, res) => {
  try {
    const offer = await LoyaltyOffer.findById(req.params.id);
    if (!offer) return res.status(404).json({ message: 'Offer not found' });
    if (!offer.couponCode) {
      return res.status(400).json({ message: 'Coupon code is required. Please add a coupon code to this offer.' });
    }
    
    // Get eligible customers based on tier
    let query = { isLoyalty: true };
    if (offer.tierType !== 'All') {
      query.loyaltyTier = offer.tierType;
    }
    
    const customers = await Customer.find(query);
    
    if (customers.length === 0) {
      return res.status(400).json({ message: 'No eligible loyal customers found for this offer tier' });
    }
    
    let successCount = 0;
    let failCount = 0;
    
    for (const customer of customers) {
      if (!customer.email) {
        failCount++;
        console.error(`Skipping customer ${customer._id}: No email found`);
        continue;
      }
      
      try {
        const emailContent = `
          <h2>${offer.title}</h2>
          <p>${offer.description}</p>
          <hr/>
          <h3>Your Exclusive Coupon Code:</h3>
          <div style="background-color: #f0f0f0; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <h1 style="color: #d4af37; letter-spacing: 2px; font-weight: bold;">${offer.couponCode}</h1>
          </div>
          <h3>Offer Details:</h3>
          <p><strong>Discount:</strong> ${offer.discountPercentage > 0 ? offer.discountPercentage + '%' : 'LKR ' + offer.discountAmount} Off</p>
          <p><strong>Valid From:</strong> ${new Date(offer.validFrom).toLocaleDateString()}</p>
          <p><strong>Valid Until:</strong> ${new Date(offer.validUntil).toLocaleDateString()}</p>
          <p><strong>Loyalty Tier:</strong> ${offer.tierType}</p>
          <hr/>
          <p style="color: #666;">Use this coupon code at checkout to enjoy your exclusive discount!</p>
        `;
        
        const emailResult = await emailService.sendCustomEmail(
          customer.email,
          `Your Exclusive Offer: ${offer.title}`,
          emailContent
        );
        
        if (!emailResult.success) {
          failCount++;
          console.error(`Failed to send email to ${customer.email}:`, emailResult.error);
          continue;
        }
        
        successCount++;
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
    res.status(500).json({ message: 'Error sending coupons', error: error.message });
  }
});

// Validate and redeem coupon
router.post('/coupons/validate', async (req, res) => {
  try {
    const { code, customerId } = req.body;
    
    const coupon = await Coupon.findOne({ code: code.toUpperCase() });
    if (!coupon) return res.status(404).json({ message: 'Coupon not found', valid: false });
    
    // Check if coupon is active
    if (!coupon.isActive) {
      return res.status(400).json({ message: 'This coupon is no longer active', valid: false });
    }
    
    // Check validity period
    const now = new Date();
    if (now < coupon.validFrom || now > coupon.validUntil) {
      return res.status(400).json({ message: 'This coupon is not valid for this period', valid: false });
    }
    
    // Check usage limit
    if (coupon.usageCount >= coupon.maxUses) {
      return res.status(400).json({ message: 'This coupon has reached its usage limit', valid: false });
    }
    
    // Check if customer ID matches (if coupon is assigned to specific customer)
    if (coupon.customerId && coupon.customerId.toString() !== customerId) {
      return res.status(400).json({ message: 'This coupon is not assigned to your account', valid: false });
    }

    // Check customer tier eligibility
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found', valid: false });
    }

    // Determine customer type and check tier eligibility
    let customerTier = 'Standard'; // Default to standard customers
    if (customer.isLoyalty && customer.loyaltyTier) {
      customerTier = customer.loyaltyTier; // Silver, Gold, or Platinum
    }

    // Check if coupon tier matches customer tier (or if coupon is for 'All')
    if (coupon.assignedTier !== 'All' && coupon.assignedTier !== customerTier) {
      const tierName = coupon.assignedTier === 'Standard' 
        ? 'standard customers' 
        : `${coupon.assignedTier} tier loyalty members`;
      return res.status(403).json({ 
        message: `This coupon is only available for ${tierName}. You are a ${customerTier === 'Standard' ? 'standard' : customerTier + ' tier'} customer.`, 
        valid: false,
        requiredTier: coupon.assignedTier,
        customerTier: customerTier
      });
    }
    
    res.json({ 
      valid: true,
      coupon: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        minOrderAmount: coupon.minOrderAmount,
        message: 'Coupon is valid!'
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error validating coupon', error: error.message });
  }
});

// Get coupons for a customer
router.get('/coupons/customer/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    
    const coupons = await Coupon.find({
      customerId,
      isActive: true,
      validUntil: { $gte: new Date() }
    }).populate('offerId');
    
    res.json(coupons);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching coupons', error: error.message });
  }
});


export default router;
