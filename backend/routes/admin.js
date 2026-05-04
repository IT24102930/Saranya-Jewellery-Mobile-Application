import express from 'express';
import { isAdmin, isApproved } from '../middleware/auth.js';
import Customer from '../models/Customer.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import GoldRate from '../models/GoldRate.js';
import LoyaltyOffer from '../models/LoyaltyOffer.js';
import StaffAuditLog from '../models/StaffAuditLog.js';

const router = express.Router();

// GET /api/admin/stats - Get dashboard statistics
router.get('/stats', isApproved, isAdmin, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const yearStart = new Date(today.getFullYear(), 0, 1);

    const incomeStatuses = ['Payment Received', 'Ready for Collection', 'Completed'];
    const incomeFilter = {
      $or: [
        { status: { $in: incomeStatuses } },
        { paymentStatus: 'Paid' }
      ]
    };

    const [
      totalCustomers,
      totalProducts,
      totalOrders,
      loyaltyMembers,
      paidOrders,
      paidMonthOrders,
      paidYearOrders,
      completedOrders,
      pendingOrders,
      refundOrders,
      latestGoldRate,
      promotionsSentToday
    ] = await Promise.all([
      Customer.countDocuments(),
      Product.countDocuments(),
      Order.countDocuments(),
      Customer.countDocuments({ isLoyalty: true }),
      Order.find(incomeFilter).select('total totalAmount'),
      Order.find({ ...incomeFilter, createdAt: { $gte: monthStart } }).select('total totalAmount'),
      Order.find({ ...incomeFilter, createdAt: { $gte: yearStart } }).select('total totalAmount'),
      Order.countDocuments({ status: 'Completed' }),
      Order.countDocuments({ status: { $in: ['Pending', 'Confirmed', 'Invoice Created', 'Preparing'] } }),
      Order.find({ $or: [{ status: { $in: ['Refunded', 'Cancelled'] } }, { paymentStatus: 'Refunded' }] }).select('total totalAmount'),
      GoldRate.findOne().sort({ lastUpdated: -1 }),
      LoyaltyOffer.countDocuments({
        $or: [
          { sentAt: { $gte: today } },
          { createdAt: { $gte: today } }
        ]
      })
    ]);

    const getOrderValue = (order) => Number(order.total ?? order.totalAmount ?? 0);

    const totalIncome = paidOrders.reduce((sum, order) => sum + getOrderValue(order), 0);
    const monthIncome = paidMonthOrders.reduce((sum, order) => sum + getOrderValue(order), 0);
    const yearIncome = paidYearOrders.reduce((sum, order) => sum + getOrderValue(order), 0);
    const totalRefunds = refundOrders.reduce((sum, order) => sum + getOrderValue(order), 0);

    // Use 22K rate as primary display value for admin summary.
    const goldRate = latestGoldRate ? Number(latestGoldRate['22K'] || 0) : 0;

    res.json({
      totalCustomers,
      totalProducts,
      totalOrders,
      loyaltyMembers,
      totalIncome: Math.round(totalIncome),
      monthIncome: Math.round(monthIncome),
      yearIncome: Math.round(yearIncome),
      completedOrders,
      pendingOrders,
      totalRefunds: Math.round(totalRefunds),
      goldRate: Math.round(goldRate),
      promotionsSentToday
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ message: 'Failed to fetch statistics' });
  }
});

// GET /api/admin/audit-logs - Get staff audit trail
router.get('/audit-logs', isApproved, isAdmin, async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(parseInt(req.query.limit, 10) || 200, 1000));
    const logs = await StaffAuditLog.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.json(logs);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ message: 'Failed to fetch audit logs' });
  }
});

export default router;
