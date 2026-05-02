import { useEffect, useMemo, useState } from 'react';
import { FiHome, FiUsers, FiTrendingUp, FiLogOut, FiEye, FiDollarSign, FiShield, FiBell, FiShoppingCart, FiPackage, FiCheck, FiClock, FiRefreshCw, FiUser } from 'react-icons/fi';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import authManager from '../auth.js';

const dashboardNav = [
  { href: '/admin-dashboard', label: 'Admin', icon: 'shield-alt' },
  { href: '/product-management-dashboard', label: 'Products', icon: 'box' },
  { href: '/order-management-dashboard', label: 'Orders', icon: 'receipt' },
  { href: '/inventory-dashboard', label: 'Inventory', icon: 'warehouse' },
  { href: '/customer-care-dashboard', label: 'Support', icon: 'headset' },
  { href: '/loyalty-management-dashboard', label: 'Loyalty', icon: 'star' }
];

const emptyForm = {
  fullName: '',
  email: '',
  password: '',
  role: 'Customer Care'
};

const emptyEditForm = {
  fullName: '',
  role: 'Customer Care',
  status: 'Pending',
  password: ''
};

export default function AdminDashboardPage() {
  const [staffUser, setStaffUser] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [customerList, setCustomerList] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [isAddStaffModalOpen, setIsAddStaffModalOpen] = useState(false);
  const [isEditStaffModalOpen, setIsEditStaffModalOpen] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState('');
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [activeSection, setActiveSection] = useState('analytics');
  const [statusFilter, setStatusFilter] = useState('all');
  const [busyId, setBusyId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingStaff, setIsUpdatingStaff] = useState(false);
  const [error, setError] = useState('');
  const [isLogoutHovered, setIsLogoutHovered] = useState(false);
  
  // Statistics
  const [stats, setStats] = useState({
    totalIncome: 0,
    monthIncome: 0,
    yearIncome: 0,
    totalOrders: 0,
    completedOrders: 0,
    pendingOrders: 0,
    totalRefunds: 0,
    totalCustomers: 0,
    totalProducts: 0,
    loyaltyMembers: 0,
    promotionsSentToday: 0,
    goldRate: 0
  });
  const [customerFilter, setCustomerFilter] = useState('all');
  const [customerBusyId, setCustomerBusyId] = useState('');
  const [orders, setOrders] = useState([]);
  const [revenueRange, setRevenueRange] = useState('30d');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [banners, setBanners] = useState([]);
  const [isAddBannerModalOpen, setIsAddBannerModalOpen] = useState(false);
  const [isEditBannerModalOpen, setIsEditBannerModalOpen] = useState(false);
  const [editingBannerId, setEditingBannerId] = useState('');
  const [bannerForm, setBannerForm] = useState({ message: '', type: 'info', backgroundColor: '#fff3cd', textColor: '#856404', startDate: '', endDate: '', isActive: true });
  const [isSavingBanner, setIsSavingBanner] = useState(false);
  const [isBannerBusy, setIsBannerBusy] = useState('');

  // Customer Details Modal State
  const [isCustomerDetailsModalOpen, setIsCustomerDetailsModalOpen] = useState(false);
  const [selectedCustomerDetails, setSelectedCustomerDetails] = useState(null);
  const [isLoadingCustomerDetails, setIsLoadingCustomerDetails] = useState(false);
  const [customerDetailsError, setCustomerDetailsError] = useState('');
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customerLoyaltyFilter, setCustomerLoyaltyFilter] = useState('all');

  const filteredList = useMemo(() => {
    if (statusFilter === 'all') return staffList;
    return staffList.filter((item) => item.status === statusFilter);
  }, [staffList, statusFilter]);

  const filteredOrders = useMemo(() => {
    const now = new Date();
    const days = revenueRange === '7d' ? 7 : revenueRange === '30d' ? 30 : revenueRange === '90d' ? 90 : 3650;
    const start = new Date(now);
    start.setDate(now.getDate() - days);

    return orders.filter((order) => {
      const created = new Date(order.createdAt);
      const inRange = created >= start;
      const statusMatch = orderStatusFilter === 'all' ? true : order.status === orderStatusFilter;
      return inRange && statusMatch;
    });
  }, [orders, revenueRange, orderStatusFilter]);

  const revenueMetrics = useMemo(() => {
    const totalRevenue = filteredOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const totalCount = filteredOrders.length;
    const completedCount = filteredOrders.filter((order) => order.status === 'Completed').length;
    const avgOrderValue = totalCount > 0 ? totalRevenue / totalCount : 0;

    return {
      totalRevenue,
      totalCount,
      completedCount,
      avgOrderValue
    };
  }, [filteredOrders]);

  const customerInsights = useMemo(() => {
    const spendByEmail = new Map();

    orders.forEach((order) => {
      const email = String(order.customerEmail || '').toLowerCase();
      if (!email) return;
      spendByEmail.set(email, (spendByEmail.get(email) || 0) + Number(order.total || 0));
    });

    const topSpenders = [...customerList]
      .map((customer) => {
        const email = String(customer.email || '').toLowerCase();
        const orderSpend = spendByEmail.get(email) || 0;
        return {
          ...customer,
          computedSpend: Math.max(Number(customer.totalSpent || 0), orderSpend)
        };
      })
      .sort((a, b) => b.computedSpend - a.computedSpend)
      .slice(0, 5);

    const loyaltyBreakdown = {
      standard: customerList.filter((customer) => !customer.loyaltyTier).length,
      silver: customerList.filter((customer) => customer.loyaltyTier === 'Silver').length,
      gold: customerList.filter((customer) => customer.loyaltyTier === 'Gold').length,
      platinum: customerList.filter((customer) => customer.loyaltyTier === 'Platinum').length
    };

    return {
      topSpenders,
      loyaltyBreakdown
    };
  }, [customerList, orders]);

  const filteredCustomers = useMemo(() => {
    let result = customerList;

    // Apply loyalty filter
    if (customerLoyaltyFilter === 'loyalty') {
      result = result.filter((customer) => customer.isLoyalty === true);
    }

    // Apply search filter
    if (customerSearchQuery.trim()) {
      const query = customerSearchQuery.toLowerCase();
      result = result.filter((customer) => {
        const name = String(customer.fullName || '').toLowerCase();
        const email = String(customer.email || '').toLowerCase();
        const phone = String(customer.phone || '').toLowerCase();
        
        return name.includes(query) || email.includes(query) || phone.includes(query);
      });
    }

    return result;
  }, [customerList, customerSearchQuery, customerLoyaltyFilter]);

  const chartData = useMemo(() => {
    // Order status breakdown
    const orderStatusBreakdown = [
      { name: 'Pending', value: orders.filter(o => o.status === 'Pending').length, fill: '#ffc107' },
      { name: 'Completed', value: orders.filter(o => o.status === 'Completed').length, fill: '#28a745' },
      { name: 'Cancelled', value: orders.filter(o => o.status === 'Cancelled').length, fill: '#dc3545' },
      { name: 'Refunded', value: orders.filter(o => o.status === 'Refunded').length, fill: '#6c757d' }
    ];

    // Loyalty tier distribution
    const loyaltyData = [
      { name: 'Standard', value: customerInsights.loyaltyBreakdown.standard, fill: '#6f0022' },
      { name: 'Silver', value: customerInsights.loyaltyBreakdown.silver, fill: '#c0c0c0' },
      { name: 'Gold', value: customerInsights.loyaltyBreakdown.gold, fill: '#e0bf63' },
      { name: 'Platinum', value: customerInsights.loyaltyBreakdown.platinum, fill: '#3d5a80' }
    ];

    // Revenue trend (last 7 days)
    const now = new Date();
    const revenueTrend = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      const dayOrders = orders.filter(o => {
        const orderDate = new Date(o.createdAt);
        return orderDate.toDateString() === date.toDateString();
      });
      const dayRevenue = dayOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
      revenueTrend.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        revenue: dayRevenue
      });
    }

    return {
      orderStatusBreakdown,
      loyaltyData,
      revenueTrend
    };
  }, [orders, customerInsights.loyaltyBreakdown]);



  useEffect(() => {
    document.title = 'Admin Dashboard - Saranya Jewellery';
  }, []);

  useEffect(() => {
    if (!isAddStaffModalOpen && !isEditStaffModalOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setIsAddStaffModalOpen(false);
        setIsEditStaffModalOpen(false);
      }
    }

    window.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isAddStaffModalOpen, isEditStaffModalOpen]);

  useEffect(() => {
    async function bootstrap() {
      const me = await authManager.checkStaffAuth('Admin');
      if (!me || me.needsApproval) return;
      setStaffUser(me);
      await Promise.all([loadStaff(), loadStats(), loadCustomers(), loadOrders(), loadBanners()]);
    }

    bootstrap();
  }, []);

  async function loadStaff() {
    setError('');
    try {
      const response = await authManager.apiRequest('/api/staff');
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to load staff');
      setStaffList(Array.isArray(data) ? data : []);
    } catch (loadError) {
      setError(loadError.message || 'Failed to load staff');
      setStaffList([]);
    }
  }

  async function createStaff(event) {
    event.preventDefault();

    if (String(form.password || '').length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setIsSaving(true);
    setError('');
    try {
      const response = await authManager.apiRequest('/api/staff', {
        method: 'POST',
        body: JSON.stringify({
          fullName: form.fullName,
          email: form.email,
          password: form.password,
          role: form.role,
          status: 'Approved'
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to create staff');
      setForm(emptyForm);
      await loadStaff();
      setIsAddStaffModalOpen(false);
    } catch (saveError) {
      setError(saveError.message || 'Failed to create staff');
    } finally {
      setIsSaving(false);
    }
  }

  async function performAction(staffId, action) {
    setBusyId(staffId);
    setError('');
    try {
      const response = await authManager.apiRequest(`/api/staff/${staffId}${action}`, { method: 'PATCH' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Staff action failed');
      await loadStaff();
    } catch (actionError) {
      setError(actionError.message || 'Staff action failed');
    } finally {
      setBusyId('');
    }
  }

  async function deleteStaff(staffId) {
    if (!window.confirm('Delete this staff account permanently?')) return;
    setBusyId(staffId);
    setError('');
    try {
      const response = await authManager.apiRequest(`/api/staff/${staffId}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to delete staff');
      await loadStaff();
    } catch (deleteError) {
      setError(deleteError.message || 'Failed to delete staff');
    } finally {
      setBusyId('');
    }
  }

  function openEditStaffModal(item) {
    setError('');
    setEditingStaffId(item._id);
    setEditForm({
      fullName: item.fullName || '',
      role: item.role || 'Customer Care',
      status: item.status || 'Pending',
      password: ''
    });
    setIsEditStaffModalOpen(true);
  }

  async function updateStaff(event) {
    event.preventDefault();
    if (!editingStaffId) return;

    setIsUpdatingStaff(true);
    setError('');
    try {
      const response = await authManager.apiRequest(`/api/staff/${editingStaffId}`, {
        method: 'PUT',
        body: JSON.stringify({
          fullName: editForm.fullName,
          role: editForm.role,
          status: editForm.status,
          password: editForm.password || undefined
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to update staff');
      await loadStaff();
      setIsEditStaffModalOpen(false);
      setEditingStaffId('');
      setEditForm(emptyEditForm);
    } catch (updateError) {
      setError(updateError.message || 'Failed to update staff');
    } finally {
      setIsUpdatingStaff(false);
    }
  }

  async function loadStats() {
    try {
      const response = await authManager.apiRequest('/api/admin/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }

  async function loadCustomers() {
    try {
      const response = await authManager.apiRequest('/api/customers');
      if (response.ok) {
        const data = await response.json();
        setCustomerList(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to load customers:', err);
    }
  }

  async function loadOrders() {
    try {
      const response = await authManager.apiRequest('/api/orders');
      if (response.ok) {
        const data = await response.json();
        setOrders(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to load orders:', err);
      setOrders([]);
    }
  }

  async function loadBanners() {
    try {
      const response = await authManager.apiRequest('/api/banners/admin/all');
      if (response.ok) {
        const data = await response.json();
        setBanners(Array.isArray(data) ? data : []);
      } else {
        const errorData = await response.json();
        console.error('Failed to load banners:', response.status, errorData);
        setBanners([]);
      }
    } catch (err) {
      console.error('Failed to load banners:', err);
      setBanners([]);
    }
  }

  useEffect(() => {
    if (!staffUser || activeSection !== 'banners') return undefined;

    loadBanners();
    const intervalId = setInterval(() => {
      loadBanners();
    }, 5000);

    return () => clearInterval(intervalId);
  }, [staffUser, activeSection]);

  async function createBanner(event) {
    event.preventDefault();
    if (!bannerForm.message.trim()) {
      setError('Banner message is required');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    
    if (bannerForm.startDate && bannerForm.startDate < today) {
      setError('Start date cannot be in the past');
      return;
    }

    if (bannerForm.endDate && bannerForm.endDate < today) {
      setError('End date cannot be in the past');
      return;
    }

    if (bannerForm.startDate && bannerForm.endDate && new Date(bannerForm.startDate) > new Date(bannerForm.endDate)) {
      setError('Start date must be before end date');
      return;
    }

    setIsSavingBanner(true);
    setError('');
    try {
      const bannerData = {
        message: bannerForm.message.trim(),
        type: bannerForm.type,
        backgroundColor: bannerForm.backgroundColor,
        textColor: bannerForm.textColor,
        isActive: bannerForm.isActive,
        startDate: bannerForm.startDate || undefined,
        endDate: bannerForm.endDate || undefined
      };
      
      const response = await authManager.apiRequest('/api/banners', {
        method: 'POST',
        body: JSON.stringify(bannerData)
      });
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.message || 'Failed to create banner');
      setBannerForm({ message: '', type: 'info', backgroundColor: '#fff3cd', textColor: '#856404', startDate: '', endDate: '', isActive: true });
      await loadBanners();
      setIsAddBannerModalOpen(false);
    } catch (saveError) {
      console.error('Banner creation error:', saveError);
      setError(saveError.message || 'Failed to create banner');
    } finally {
      setIsSavingBanner(false);
    }
  }

  async function updateBanner(event) {
    event.preventDefault();
    if (!editingBannerId) return;

    const today = new Date().toISOString().split('T')[0];
    
    if (bannerForm.startDate && bannerForm.startDate < today) {
      setError('Start date cannot be in the past');
      return;
    }

    if (bannerForm.endDate && bannerForm.endDate < today) {
      setError('End date cannot be in the past');
      return;
    }

    if (bannerForm.startDate && bannerForm.endDate && new Date(bannerForm.startDate) > new Date(bannerForm.endDate)) {
      setError('Start date must be before end date');
      return;
    }

    setIsSavingBanner(true);
    setError('');
    try {
      const response = await authManager.apiRequest(`/api/banners/${editingBannerId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          message: bannerForm.message.trim(),
          type: bannerForm.type,
          backgroundColor: bannerForm.backgroundColor,
          textColor: bannerForm.textColor,
          isActive: bannerForm.isActive,
          startDate: bannerForm.startDate || undefined,
          endDate: bannerForm.endDate || undefined
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to update banner');
      setBannerForm({ message: '', type: 'info', backgroundColor: '#fff3cd', textColor: '#856404', startDate: '', endDate: '', isActive: true });
      await loadBanners();
      setIsEditBannerModalOpen(false);
      setEditingBannerId('');
    } catch (updateError) {
      setError(updateError.message || 'Failed to update banner');
    } finally {
      setIsSavingBanner(false);
    }
  }

  async function deleteBanner(bannerId) {
    if (!window.confirm('Delete this banner?')) return;
    setIsBannerBusy(bannerId);
    setError('');
    try {
      const response = await authManager.apiRequest(`/api/banners/${bannerId}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to delete banner');
      await loadBanners();
    } catch (deleteError) {
      setError(deleteError.message || 'Failed to delete banner');
    } finally {
      setIsBannerBusy('');
    }
  }

  function openEditBannerModal(banner) {
    setError('');
    setEditingBannerId(banner._id);
    setBannerForm({
      message: banner.message || '',
      type: banner.type || 'info',
      backgroundColor: banner.backgroundColor || '#fff3cd',
      textColor: banner.textColor || '#856404',
      startDate: banner.startDate ? new Date(banner.startDate).toISOString().split('T')[0] : '',
      endDate: banner.endDate ? new Date(banner.endDate).toISOString().split('T')[0] : '',
      isActive: banner.isActive !== false
    });
    setIsEditBannerModalOpen(true);
  }

  async function toggleBannerActive(bannerId, currentStatus) {
    setIsBannerBusy(bannerId);
    setError('');
    try {
      const response = await authManager.apiRequest(`/api/banners/${bannerId}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !currentStatus })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to update banner');
      await loadBanners();
    } catch (toggleError) {
      setError(toggleError.message || 'Failed to update banner status');
    } finally {
      setIsBannerBusy('');
    }
  }

  async function deleteCustomer(customerId) {
    if (!window.confirm('Are you sure you want to delete this customer? This action cannot be undone.')) return;
    setCustomerBusyId(customerId);
    setError('');
    try {
      const response = await authManager.apiRequest(`/api/customers/${customerId}`, { method: 'DELETE' });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete customer');
      }
      await loadCustomers();
    } catch (deleteError) {
      setError(deleteError.message || 'Failed to delete customer');
    } finally {
      setCustomerBusyId('');
    }
  }

  async function openCustomerDetailsModal(customer) {
    setIsCustomerDetailsModalOpen(true);
    setIsLoadingCustomerDetails(true);
    setCustomerDetailsError('');
    setSelectedCustomerDetails(null);

    try {
      // Get customer orders
      const customerOrders = orders.filter(order => 
        String(order.customerId) === String(customer._id)
      );

      // Get customer reviews from all reviews (reviews will have customerId field)
      // For now, we'll need to fetch reviews separately or filter from existing data
      // Since we don't have reviews data loaded, we'll show a message if needed
      
      // Get coupons used by customer
      const customerCouponsUsed = customerOrders
        .filter(order => order.couponCode)
        .map(order => ({
          code: order.couponCode,
          discount: order.couponDiscount,
          orderNumber: order.orderNumber
        }));

      // Get unique offers applied to this customer
      // This would typically come from the LoyaltyOffer data associated with coupons
      const uniqueOffers = [...new Set(customerCouponsUsed.map(c => c.code))];

      // Compile customer details
      const details = {
        ...customer,
        orderCount: customerOrders.length,
        totalSpent: customerOrders.reduce((sum, order) => sum + Number(order.total || 0), 0),
        orders: customerOrders,
        couponsUsed: customerCouponsUsed,
        offersReceived: uniqueOffers,
        registeredDate: customer.createdAt,
        loyaltyPointsBalance: customer.loyaltyPoints || 0,
        loyaltyTierStatus: customer.loyaltyTier || 'Standard'
      };

      setSelectedCustomerDetails(details);
    } catch (err) {
      console.error('Error loading customer details:', err);
      setCustomerDetailsError('Failed to load customer details');
    } finally {
      setIsLoadingCustomerDetails(false);
    }
  }

  function closeCustomerDetailsModal() {
    setIsCustomerDetailsModalOpen(false);
    setSelectedCustomerDetails(null);
    setCustomerDetailsError('');
  }

  if (!staffUser) return <p style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Checking admin access...</p>;

  const navItems = [
    { key: 'analytics', icon: FiHome, label: 'Dashboard' },
    { key: 'staff', icon: FiUsers, label: 'Staff' },
    { key: 'customers', icon: FiTrendingUp, label: 'Customers' },
    { key: 'banners', icon: FiBell, label: 'Banners' },
    { key: 'customerInsights', icon: FiEye, label: 'Insights' },
    { key: 'profile', icon: FiUser, label: 'Profile' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#fafbfc', position: 'relative' }}>
      {/* Main Content */}
      <main style={{
        flex: 1,
        padding: '1.25rem 1rem calc(5.5rem + env(safe-area-inset-bottom, 0px))',
        overflowY: 'auto'
      }}>

        {activeSection === 'analytics' && (
        <>
          {/* Highlight Tiles - Income */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: '0.75rem',
            marginBottom: '1rem'
          }}>
            {[
              { label: 'Today Income', value: stats.totalIncome, color: '#6f0022', icon: FiDollarSign },
              { label: 'This Month', value: stats.monthIncome, color: '#17a2b8', icon: FiDollarSign },
              { label: 'This Year', value: stats.yearIncome, color: '#28a745', icon: FiTrendingUp },
              { label: 'Refunds', value: stats.totalRefunds, color: '#dc3545', icon: FiRefreshCw }
            ].map((tile, idx) => {
              const IconComponent = tile.icon;
              return (
                <div key={idx} style={{
                  background: '#fff',
                  borderRadius: '14px',
                  padding: '0.95rem',
                  border: '1px solid #e9ecef',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.05)',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '3px',
                    background: tile.color
                  }} />
                  <div style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '10px',
                    background: `${tile.color}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '0.5rem'
                  }}>
                    <IconComponent size={18} color={tile.color} strokeWidth={2.2} />
                  </div>
                  <p style={{
                    margin: 0,
                    color: '#6b7280',
                    fontSize: '0.72rem',
                    fontWeight: 500,
                    letterSpacing: '0.3px',
                    textTransform: 'uppercase'
                  }}>
                    {tile.label}
                  </p>
                  <h3 style={{
                    margin: '0.25rem 0 0',
                    color: tile.color,
                    fontSize: '1rem',
                    fontWeight: 700,
                    wordBreak: 'break-word',
                    lineHeight: 1.2
                  }}>
                    LKR {(tile.value || 0).toLocaleString()}
                  </h3>
                </div>
              );
            })}
          </div>

          {/* Quick Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: '0.75rem',
            marginBottom: '1.25rem'
          }}>
            {[
              { label: 'Customers', value: stats.totalCustomers, color: '#6f0022', icon: FiUsers },
              { label: 'Products', value: stats.totalProducts, color: '#0066cc', icon: FiShoppingCart },
              { label: 'Orders', value: stats.totalOrders, color: '#28a745', icon: FiPackage },
              { label: 'Loyalty', value: stats.loyaltyMembers, color: '#e0bf63', icon: FiTrendingUp },
              { label: 'Completed', value: stats.completedOrders, color: '#28a745', icon: FiCheck },
              { label: 'Pending', value: stats.pendingOrders, color: '#ffc107', icon: FiClock },
              { label: 'Promotions', value: stats.promotionsSentToday, color: '#ff6b6b', icon: FiBell },
              { label: 'Gold/g', value: `LKR ${(stats.goldRate || 0).toLocaleString()}`, color: '#e0bf63', icon: FiTrendingUp }
            ].map((stat, idx) => {
              const IconComponent = stat.icon;
              return (
                <div key={idx} style={{
                  background: '#fff',
                  borderRadius: '12px',
                  padding: '0.85rem',
                  border: '1px solid #e9ecef',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.7rem'
                }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: `${stat.color}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <IconComponent size={20} color={stat.color} strokeWidth={2.2} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      margin: 0,
                      color: '#6b7280',
                      fontSize: '0.7rem',
                      fontWeight: 500,
                      letterSpacing: '0.3px',
                      textTransform: 'uppercase'
                    }}>
                      {stat.label}
                    </p>
                    <h4 style={{
                      margin: '0.1rem 0 0',
                      color: '#1f2937',
                      fontSize: '1rem',
                      fontWeight: 700,
                      lineHeight: 1.2,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {stat.value}
                    </h4>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Revenue Trend Chart */}
          <section style={{
            background: '#fff',
            borderRadius: '14px',
            padding: '1.1rem 0.85rem',
            border: '1px solid #e9ecef',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
            marginBottom: '1rem'
          }}>
            <h3 style={{
              margin: '0 0 0.85rem 0.4rem',
              color: '#6f0022',
              fontSize: '1.05rem',
              fontFamily: 'Cormorant Garamond, serif',
              fontWeight: 600
            }}>
              Revenue Trend (7 Days)
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData.revenueTrend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
                <XAxis dataKey="date" stroke="#666" tick={{ fontSize: 11 }} />
                <YAxis stroke="#666" tick={{ fontSize: 11 }} width={45} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e9ecef', borderRadius: '8px', fontSize: '0.85rem' }} />
                <Line type="monotone" dataKey="revenue" stroke="#6f0022" strokeWidth={2.5} dot={{ fill: '#6f0022', r: 3 }} activeDot={{ r: 6 }} name="LKR" />
              </LineChart>
            </ResponsiveContainer>
          </section>

          {/* Order Status */}
          <section style={{
            background: '#fff',
            borderRadius: '14px',
            padding: '1.1rem 0.85rem',
            border: '1px solid #e9ecef',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
            marginBottom: '1rem'
          }}>
            <h3 style={{
              margin: '0 0 0.85rem 0.4rem',
              color: '#6f0022',
              fontSize: '1.05rem',
              fontFamily: 'Cormorant Garamond, serif',
              fontWeight: 600
            }}>
              Order Status
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={chartData.orderStatusBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={70}
                  dataKey="value"
                >
                  {chartData.orderStatusBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: '0.85rem' }} />
              </PieChart>
            </ResponsiveContainer>
          </section>

          {/* Loyalty Tiers */}
          <section style={{
            background: '#fff',
            borderRadius: '14px',
            padding: '1.1rem 0.85rem',
            border: '1px solid #e9ecef',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
          }}>
            <h3 style={{
              margin: '0 0 0.85rem 0.4rem',
              color: '#6f0022',
              fontSize: '1.05rem',
              fontFamily: 'Cormorant Garamond, serif',
              fontWeight: 600
            }}>
              Loyalty Tiers
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData.loyaltyData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
                <XAxis dataKey="name" stroke="#666" tick={{ fontSize: 11 }} />
                <YAxis stroke="#666" tick={{ fontSize: 11 }} width={35} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e9ecef', borderRadius: '8px', fontSize: '0.85rem' }} />
                <Bar dataKey="value" fill="#6f0022" radius={[6, 6, 0, 0]} name="Customers" />
              </BarChart>
            </ResponsiveContainer>
          </section>
        </>
        )}

        {activeSection === 'banners' && (
          <>
            <section style={{
              background: '#fff',
              borderRadius: '14px',
              padding: '1rem',
              border: '1px solid #e9ecef',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
              marginBottom: '1rem'
            }}>
              <h3 style={{ margin: 0, color: '#6f0022', fontSize: '1.2rem', fontFamily: 'Cormorant Garamond, serif', fontWeight: 600 }}>
                Site Banners
              </h3>
              <p style={{ margin: '0.25rem 0 0.85rem', color: '#6b7280', fontSize: '0.85rem' }}>
                Manage promotional banners on the home page.
              </p>
              <button
                type="button"
                onClick={() => { setError(''); setBannerForm({ message: '', type: 'info', backgroundColor: '#fff3cd', textColor: '#856404', startDate: '', endDate: '' }); setIsAddBannerModalOpen(true); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  width: '100%',
                  background: '#6f0022',
                  color: '#fff',
                  border: 'none',
                  padding: '0.85rem 1rem',
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  boxShadow: '0 6px 14px rgba(111, 0, 34, 0.18)'
                }}
              >
                <FiBell size={18} />
                Create Banner
              </button>
            </section>

            {error && activeSection === 'banners' && (
              <div style={{ background: '#f8d7da', border: '1px solid #f5c6cb', color: '#721c24', padding: '0.75rem 0.85rem', borderRadius: '10px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                {error}
              </div>
            )}

            <section style={{
              background: '#fff',
              borderRadius: '14px',
              padding: '1rem',
              border: '1px solid #e9ecef',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginBottom: '0.85rem' }}>
                <h4 style={{ margin: 0, color: '#6f0022', fontSize: '1.05rem', fontFamily: 'Cormorant Garamond, serif', fontWeight: 600 }}>
                  All Banners
                </h4>
                <span style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 500 }}>
                  {banners.length}
                </span>
              </div>

              {banners.length === 0 ? (
                <div style={{
                  padding: '2rem 1rem',
                  textAlign: 'center',
                  color: '#9ca3af',
                  fontSize: '0.9rem',
                  border: '1px dashed #e5e7eb',
                  borderRadius: '12px'
                }}>
                  No banners yet. Create one to get started.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                  {banners.map((banner) => {
                    const startLabel = banner.startDate ? new Date(banner.startDate).toLocaleDateString() : 'Now';
                    const endLabel = banner.endDate ? new Date(banner.endDate).toLocaleDateString() : 'No end';
                    const busy = isBannerBusy === banner._id;
                    return (
                      <div
                        key={banner._id}
                        style={{
                          border: '1px solid #e9ecef',
                          borderRadius: '12px',
                          padding: '0.85rem',
                          background: '#fafbfc'
                        }}
                      >
                        {/* Banner preview */}
                        <div style={{
                          background: banner.backgroundColor || '#fff3cd',
                          color: banner.textColor || '#856404',
                          padding: '0.7rem 0.85rem',
                          borderRadius: '8px',
                          fontSize: '0.85rem',
                          fontWeight: 500,
                          marginBottom: '0.7rem',
                          wordBreak: 'break-word',
                          lineHeight: 1.4
                        }}>
                          {banner.message}
                        </div>

                        {/* Meta chips */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.7rem' }}>
                          <span style={{
                            background: '#e7f3ff',
                            color: '#0066cc',
                            padding: '0.25rem 0.6rem',
                            borderRadius: '999px',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            textTransform: 'capitalize'
                          }}>
                            {banner.type}
                          </span>
                          <span style={{
                            background: banner.isActive ? '#d4edda' : '#f8d7da',
                            color: banner.isActive ? '#155724' : '#721c24',
                            padding: '0.25rem 0.6rem',
                            borderRadius: '999px',
                            fontSize: '0.72rem',
                            fontWeight: 600
                          }}>
                            {banner.isActive ? 'Active' : 'Inactive'}
                          </span>
                          <span style={{
                            background: '#f1f5f9',
                            color: '#475569',
                            padding: '0.25rem 0.6rem',
                            borderRadius: '999px',
                            fontSize: '0.72rem',
                            fontWeight: 500
                          }}>
                            {startLabel} → {endLabel}
                          </span>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem' }}>
                          <button
                            type="button"
                            onClick={() => toggleBannerActive(banner._id, banner.isActive)}
                            disabled={busy}
                            style={{
                              padding: '0.55rem',
                              border: 'none',
                              background: banner.isActive ? '#dc3545' : '#28a745',
                              color: '#fff',
                              borderRadius: '8px',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              cursor: busy ? 'not-allowed' : 'pointer',
                              opacity: busy ? 0.6 : 1
                            }}
                          >
                            {banner.isActive ? 'Disable' : 'Enable'}
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditBannerModal(banner)}
                            disabled={busy}
                            style={{
                              padding: '0.55rem',
                              border: '1px solid #0066cc',
                              background: '#fff',
                              color: '#0066cc',
                              borderRadius: '8px',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              cursor: busy ? 'not-allowed' : 'pointer',
                              opacity: busy ? 0.6 : 1
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteBanner(banner._id)}
                            disabled={busy}
                            style={{
                              padding: '0.55rem',
                              border: '1px solid #dc3545',
                              background: '#fff',
                              color: '#dc3545',
                              borderRadius: '8px',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              cursor: busy ? 'not-allowed' : 'pointer',
                              opacity: busy ? 0.6 : 1
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}

        {activeSection === 'revenueFilters' && (
          <section style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '2rem',
            border: '1px solid #e9ecef',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0, color: '#6f0022', fontSize: '1.4rem', fontFamily: 'Cormorant Garamond, serif', fontWeight: 600 }}>
                Revenue and Order Analytics Filters
              </h3>
              <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                <select value={revenueRange} onChange={(e) => setRevenueRange(e.target.value)} style={{ padding: '0.55rem 0.8rem', border: '1px solid #dee2e6', borderRadius: '6px' }}>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                  <option value="90d">Last 90 Days</option>
                  <option value="all">All Time</option>
                </select>
                <select value={orderStatusFilter} onChange={(e) => setOrderStatusFilter(e.target.value)} style={{ padding: '0.55rem 0.8rem', border: '1px solid #dee2e6', borderRadius: '6px' }}>
                  <option value="all">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                  <option value="Refunded">Refunded</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginTop: '1.1rem' }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e9ecef', borderRadius: '10px', padding: '1rem' }}>
                <p style={{ margin: 0, color: '#666' }}>Filtered Revenue</p>
                <h4 style={{ margin: '0.35rem 0 0', color: '#6f0022', fontSize: '1.4rem' }}>LKR {Math.round(revenueMetrics.totalRevenue).toLocaleString()}</h4>
              </div>
              <div style={{ background: '#f8fafc', border: '1px solid #e9ecef', borderRadius: '10px', padding: '1rem' }}>
                <p style={{ margin: 0, color: '#666' }}>Orders Count</p>
                <h4 style={{ margin: '0.35rem 0 0', color: '#0066cc', fontSize: '1.4rem' }}>{revenueMetrics.totalCount}</h4>
              </div>
              <div style={{ background: '#f8fafc', border: '1px solid #e9ecef', borderRadius: '10px', padding: '1rem' }}>
                <p style={{ margin: 0, color: '#666' }}>Completed Orders</p>
                <h4 style={{ margin: '0.35rem 0 0', color: '#28a745', fontSize: '1.4rem' }}>{revenueMetrics.completedCount}</h4>
              </div>
              <div style={{ background: '#f8fafc', border: '1px solid #e9ecef', borderRadius: '10px', padding: '1rem' }}>
                <p style={{ margin: 0, color: '#666' }}>Avg. Order Value</p>
                <h4 style={{ margin: '0.35rem 0 0', color: '#17a2b8', fontSize: '1.4rem' }}>LKR {Math.round(revenueMetrics.avgOrderValue).toLocaleString()}</h4>
              </div>
            </div>

            <div style={{ marginTop: '1.4rem' }}>
              <h4 style={{ margin: '0 0 0.85rem', color: '#6f0022', fontSize: '1.08rem' }}>
                Filtered Orders Details
              </h4>

              <div style={{ overflowX: 'auto', border: '1px solid #e9ecef', borderRadius: '10px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', minWidth: '980px' }}>
                  <thead>
                    <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #e9ecef' }}>
                      <th style={{ padding: '0.85rem', textAlign: 'left', color: '#333' }}>Order #</th>
                      <th style={{ padding: '0.85rem', textAlign: 'left', color: '#333' }}>Customer</th>
                      <th style={{ padding: '0.85rem', textAlign: 'left', color: '#333' }}>Date</th>
                      <th style={{ padding: '0.85rem', textAlign: 'left', color: '#333' }}>Status</th>
                      <th style={{ padding: '0.85rem', textAlign: 'left', color: '#333' }}>Payment</th>
                      <th style={{ padding: '0.85rem', textAlign: 'left', color: '#333' }}>Items</th>
                      <th style={{ padding: '0.85rem', textAlign: 'right', color: '#333' }}>Subtotal</th>
                      <th style={{ padding: '0.85rem', textAlign: 'right', color: '#333' }}>Tax</th>
                      <th style={{ padding: '0.85rem', textAlign: 'right', color: '#333' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => {
                      const itemCount = Array.isArray(order.items)
                        ? order.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
                        : 0;

                      const statusColor = order.status === 'Completed'
                        ? { bg: '#d4edda', text: '#155724' }
                        : order.status === 'Pending'
                          ? { bg: '#fff3cd', text: '#856404' }
                          : order.status === 'Cancelled' || order.status === 'Refunded'
                            ? { bg: '#f8d7da', text: '#721c24' }
                            : { bg: '#e2e8f0', text: '#334155' };

                      return (
                        <tr key={order._id} style={{ borderBottom: '1px solid #eef2f5' }}>
                          <td style={{ padding: '0.85rem', fontWeight: 600, color: '#1f2937' }}>{order.orderNumber || '-'}</td>
                          <td style={{ padding: '0.85rem' }}>
                            <div style={{ fontWeight: 600, color: '#1f2937' }}>{order.customerName || '-'}</div>
                            <div style={{ fontSize: '0.82rem', color: '#6b7280' }}>{order.customerEmail || '-'}</div>
                          </td>
                          <td style={{ padding: '0.85rem', color: '#374151' }}>{order.createdAt ? new Date(order.createdAt).toLocaleString() : '-'}</td>
                          <td style={{ padding: '0.85rem' }}>
                            <span style={{
                              background: statusColor.bg,
                              color: statusColor.text,
                              borderRadius: '999px',
                              padding: '0.25rem 0.6rem',
                              fontWeight: 600,
                              fontSize: '0.8rem'
                            }}>
                              {order.status || '-'}
                            </span>
                          </td>
                          <td style={{ padding: '0.85rem', color: '#374151' }}>
                            <div>{order.paymentStatus || 'Pending'}</div>
                            <div style={{ fontSize: '0.82rem', color: '#6b7280' }}>{order.paymentMethod || '-'}</div>
                          </td>
                          <td style={{ padding: '0.85rem', color: '#374151' }}>{itemCount}</td>
                          <td style={{ padding: '0.85rem', textAlign: 'right', color: '#374151' }}>LKR {Math.round(Number(order.subtotal || 0)).toLocaleString()}</td>
                          <td style={{ padding: '0.85rem', textAlign: 'right', color: '#374151' }}>LKR {Math.round(Number(order.tax || 0)).toLocaleString()}</td>
                          <td style={{ padding: '0.85rem', textAlign: 'right', fontWeight: 700, color: '#6f0022' }}>LKR {Math.round(Number(order.total || 0)).toLocaleString()}</td>
                        </tr>
                      );
                    })}

                    {filteredOrders.length === 0 && (
                      <tr>
                        <td colSpan={9} style={{ padding: '1.1rem', textAlign: 'center', color: '#999' }}>
                          No orders found for the selected filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {activeSection === 'customerInsights' && (
          <>
            {/* Header */}
            <section style={{
              background: '#fff',
              borderRadius: '14px',
              padding: '1rem',
              border: '1px solid #e9ecef',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
              marginBottom: '1rem'
            }}>
              <h3 style={{
                margin: 0,
                color: '#6f0022',
                fontSize: '1.2rem',
                fontFamily: 'Cormorant Garamond, serif',
                fontWeight: 600
              }}>
                Customer Insights
              </h3>
              <p style={{ margin: '0.25rem 0 0', color: '#6b7280', fontSize: '0.85rem' }}>
                Top spenders and loyalty distribution.
              </p>
            </section>

            {/* Loyalty Breakdown */}
            <section style={{
              background: '#fff',
              borderRadius: '14px',
              padding: '1rem',
              border: '1px solid #e9ecef',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
              marginBottom: '1rem'
            }}>
              <h4 style={{
                margin: '0 0 0.7rem',
                color: '#6f0022',
                fontSize: '0.78rem',
                fontWeight: 700,
                letterSpacing: '0.6px',
                textTransform: 'uppercase'
              }}>
                Loyalty Breakdown
              </h4>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: '0.55rem'
              }}>
                {[
                  { label: 'Standard', value: customerInsights.loyaltyBreakdown.standard, color: '#6f0022', bg: '#fce7eb' },
                  { label: 'Silver', value: customerInsights.loyaltyBreakdown.silver, color: '#475569', bg: '#f1f5f9' },
                  { label: 'Gold', value: customerInsights.loyaltyBreakdown.gold, color: '#92400e', bg: '#fef3c7' },
                  { label: 'Platinum', value: customerInsights.loyaltyBreakdown.platinum, color: '#3d5a80', bg: '#e0e7ff' }
                ].map((tier, idx) => (
                  <div key={idx} style={{
                    background: '#fafbfc',
                    border: '1px solid #e9ecef',
                    borderRadius: '12px',
                    padding: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem'
                  }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: tier.bg,
                      color: tier.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      flexShrink: 0
                    }}>
                      {tier.label.charAt(0)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        margin: 0,
                        color: '#6b7280',
                        fontSize: '0.7rem',
                        fontWeight: 500,
                        letterSpacing: '0.3px',
                        textTransform: 'uppercase'
                      }}>
                        {tier.label}
                      </p>
                      <p style={{
                        margin: '0.1rem 0 0',
                        color: '#1f2937',
                        fontSize: '1.05rem',
                        fontWeight: 700,
                        lineHeight: 1.1
                      }}>
                        {tier.value}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Top Spenders */}
            <section style={{
              background: '#fff',
              borderRadius: '14px',
              padding: '1rem',
              border: '1px solid #e9ecef',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
            }}>
              <h4 style={{
                margin: '0 0 0.7rem',
                color: '#6f0022',
                fontSize: '0.78rem',
                fontWeight: 700,
                letterSpacing: '0.6px',
                textTransform: 'uppercase'
              }}>
                Top Spenders
              </h4>
              {customerInsights.topSpenders.length === 0 ? (
                <div style={{
                  padding: '1.5rem 1rem',
                  textAlign: 'center',
                  color: '#9ca3af',
                  fontSize: '0.85rem',
                  border: '1px dashed #e5e7eb',
                  borderRadius: '12px'
                }}>
                  No spender insights yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                  {customerInsights.topSpenders.map((customer, idx) => {
                    const rankColors = ['#e0bf63', '#c0c0c0', '#cd7f32', '#94a3b8', '#94a3b8'];
                    const rankColor = rankColors[idx] || '#94a3b8';
                    return (
                      <div key={customer._id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.7rem',
                        padding: '0.7rem 0.85rem',
                        background: '#fafbfc',
                        border: '1px solid #e9ecef',
                        borderRadius: '12px'
                      }}>
                        <div style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: rankColor,
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          flexShrink: 0
                        }}>
                          {idx + 1}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontWeight: 600,
                            color: '#1f2937',
                            fontSize: '0.9rem',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {customer.fullName || 'Unnamed'}
                          </div>
                          {customer.email && (
                            <div style={{
                              fontSize: '0.72rem',
                              color: '#6b7280',
                              marginTop: '0.1rem',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              {customer.email}
                            </div>
                          )}
                        </div>
                        <div style={{
                          color: '#6f0022',
                          fontSize: '0.92rem',
                          fontWeight: 700,
                          flexShrink: 0,
                          whiteSpace: 'nowrap'
                        }}>
                          LKR {Math.round(customer.computedSpend || 0).toLocaleString()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}

        {activeSection === 'staff' && (
        <section style={{
          background: '#fff',
          borderRadius: '14px',
          padding: '1rem',
          border: '1px solid #e9ecef',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
          marginBottom: '1rem'
        }}>
          <h3 style={{
            margin: 0,
            color: '#6f0022',
            fontSize: '1.2rem',
            fontFamily: 'Cormorant Garamond, serif',
            fontWeight: 600
          }}>
            Staff Management
          </h3>
          <p style={{ margin: '0.25rem 0 0.85rem', color: '#6b7280', fontSize: '0.85rem' }}>
            Add and manage staff accounts.
          </p>
          <button
            type="button"
            onClick={() => {
              setError('');
              setIsAddStaffModalOpen(true);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              width: '100%',
              background: '#6f0022',
              color: '#fff',
              border: 'none',
              padding: '0.85rem 1rem',
              borderRadius: '10px',
              fontWeight: 600,
              fontSize: '0.95rem',
              cursor: 'pointer',
              boxShadow: '0 6px 14px rgba(111, 0, 34, 0.18)'
            }}
          >
            <FiUsers size={18} />
            Add Staff Member
          </button>
        </section>
        )}

        {activeSection === 'staff' && isAddStaffModalOpen && (
          <div
            role="presentation"
            onClick={() => setIsAddStaffModalOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(18, 18, 18, 0.65)',
              backdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem',
              zIndex: 1000
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="add-staff-title"
              onClick={(event) => event.stopPropagation()}
              style={{
                width: 'min(100%, 820px)',
                background: '#fff',
                borderRadius: '24px',
                border: '1px solid #eadfd6',
                boxShadow: '0 24px 60px rgba(0, 0, 0, 0.28)',
                overflow: 'hidden'
              }}
            >
              {/* Header with gradient accent */}
              <div style={{
                position: 'relative',
                overflow: 'hidden',
                paddingBottom: '0'
              }}>
                {/* Accent bar at top */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: 'linear-gradient(90deg, #6f0022, #e0bf63)',
                }}></div>
                
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'start',
                  gap: '1rem',
                  padding: '2.5rem 2.5rem 2rem',
                  background: 'linear-gradient(135deg, #fff9f7 0%, #f9f7f4 100%)'
                }}>
                  <div style={{ flex: 1 }}>
                    <h3 id="add-staff-title" style={{
                      margin: 0,
                      color: '#6f0022',
                      fontSize: '2rem',
                      fontFamily: 'Cormorant Garamond, serif',
                      fontWeight: 600,
                      letterSpacing: '0.5px'
                    }}>
                      Add New Staff Member
                    </h3>
                    <p style={{ 
                      margin: '0.6rem 0 0', 
                      color: '#888', 
                      fontSize: '0.95rem',
                      fontWeight: 400
                    }}>
                      Create a new account and assign a role to get started.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddStaffModalOpen(false)}
                    aria-label="Close add staff dialog"
                    style={{
                      width: '2.8rem',
                      height: '2.8rem',
                      borderRadius: '50%',
                      border: '1px solid #e0bf63',
                      background: '#fff',
                      color: '#6f0022',
                      fontSize: '1.5rem',
                      lineHeight: 1,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = '#f1e8ea';
                      e.target.style.transform = 'scale(1.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = '#fff';
                      e.target.style.transform = 'scale(1)';
                    }}
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Form Content */}
              <form
                onSubmit={createStaff}
                style={{
                  padding: '2.5rem',
                  background: '#fff'
                }}
              >
                {error && (
                  <div style={{
                    background: '#fff5f5',
                    border: '1px solid #f8d7da',
                    color: '#721c24',
                    padding: '1rem 1.2rem',
                    borderRadius: '12px',
                    marginBottom: '1.8rem',
                    fontSize: '0.92rem',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.8rem'
                  }}>
                    <span style={{ fontSize: '1.2rem' }}>⚠</span>
                    {error}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.8rem', marginBottom: '1.8rem' }}>
                  {/* Full Name Field */}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{
                      display: 'block',
                      color: '#333',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      marginBottom: '0.6rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.3px'
                    }}>
                      Full Name
                    </label>
                    <input
                      required
                      value={form.fullName}
                      onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
                      placeholder="e.g., John Doe"
                      style={{
                        width: '100%',
                        padding: '0.95rem 1.1rem',
                        border: '1px solid #e0e7ff',
                        borderRadius: '12px',
                        fontSize: '1rem',
                        fontFamily: 'Poppins, sans-serif',
                        background: '#f9f9f9',
                        transition: 'all 0.2s',
                        boxSizing: 'border-box'
                      }}
                      onFocus={(e) => {
                        e.target.style.border = '2px solid #6f0022';
                        e.target.style.background = '#fff';
                        e.target.style.boxShadow = '0 4px 12px rgba(111, 0, 34, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.border = '1px solid #e0e7ff';
                        e.target.style.background = '#f9f9f9';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>

                  {/* Email Field */}
                  <div>
                    <label style={{
                      display: 'block',
                      color: '#333',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      marginBottom: '0.6rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.3px'
                    }}>
                      Email Address
                    </label>
                    <input
                      required
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="john@example.com"
                      style={{
                        width: '100%',
                        padding: '0.95rem 1.1rem',
                        border: '1px solid #e0e7ff',
                        borderRadius: '12px',
                        fontSize: '1rem',
                        fontFamily: 'Poppins, sans-serif',
                        background: '#f9f9f9',
                        transition: 'all 0.2s',
                        boxSizing: 'border-box'
                      }}
                      onFocus={(e) => {
                        e.target.style.border = '2px solid #6f0022';
                        e.target.style.background = '#fff';
                        e.target.style.boxShadow = '0 4px 12px rgba(111, 0, 34, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.border = '1px solid #e0e7ff';
                        e.target.style.background = '#f9f9f9';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>

                  {/* Password Field */}
                  <div>
                    <label style={{
                      display: 'block',
                      color: '#333',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      marginBottom: '0.6rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.3px'
                    }}>
                      Password
                    </label>
                    <input
                      required
                      minLength={8}
                      type="password"
                      value={form.password}
                      onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                      placeholder="Minimum 8 characters"
                      style={{
                        width: '100%',
                        padding: '0.95rem 1.1rem',
                        border: '1px solid #e0e7ff',
                        borderRadius: '12px',
                        fontSize: '1rem',
                        fontFamily: 'Poppins, sans-serif',
                        background: '#f9f9f9',
                        transition: 'all 0.2s',
                        boxSizing: 'border-box'
                      }}
                      onFocus={(e) => {
                        e.target.style.border = '2px solid #6f0022';
                        e.target.style.background = '#fff';
                        e.target.style.boxShadow = '0 4px 12px rgba(111, 0, 34, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.border = '1px solid #e0e7ff';
                        e.target.style.background = '#f9f9f9';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                    <p style={{ margin: '0.4rem 0 0', color: '#999', fontSize: '0.8rem' }}>Must be at least 8 characters long</p>
                  </div>

                  {/* Role Field */}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{
                      display: 'block',
                      color: '#333',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      marginBottom: '0.6rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.3px'
                    }}>
                      Staff Role
                    </label>
                    <select
                      value={form.role}
                      onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '0.95rem 1.1rem',
                        border: '1px solid #e0e7ff',
                        borderRadius: '12px',
                        fontSize: '1rem',
                        fontFamily: 'Poppins, sans-serif',
                        background: '#f9f9f9',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxSizing: 'border-box'
                      }}
                      onFocus={(e) => {
                        e.target.style.border = '2px solid #6f0022';
                        e.target.style.background = '#fff';
                        e.target.style.boxShadow = '0 4px 12px rgba(111, 0, 34, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.border = '1px solid #e0e7ff';
                        e.target.style.background = '#f9f9f9';
                        e.target.style.boxShadow = 'none';
                      }}
                    >
                      <option value="Customer Care">Customer Care</option>
                      <option value="Inventory">Inventory</option>
                      <option value="Order Management">Order Management</option>
                      <option value="Product Management">Product Management</option>
                      <option value="Loyalty Management">Loyalty Management</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '1rem',
                  flexWrap: 'wrap',
                  marginTop: '2rem',
                  paddingTop: '1.5rem',
                  borderTop: '1px solid #f0f0f0'
                }}>
                  <button
                    type="button"
                    onClick={() => setIsAddStaffModalOpen(false)}
                    style={{
                      border: '1px solid #e0e7ff',
                      color: '#666',
                      background: '#f9f9f9',
                      padding: '0.85rem 1.6rem',
                      fontSize: '0.95rem',
                      borderRadius: '999px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = '#f1f1f1';
                      e.target.style.border = '1px solid #d0d0d0';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = '#f9f9f9';
                      e.target.style.border = '1px solid #e0e7ff';
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    style={{
                      background: isSaving ? '#c9c9c9' : 'linear-gradient(135deg, #6f0022, #8b0029)',
                      color: '#fff',
                      border: 'none',
                      padding: '0.85rem 2rem',
                      borderRadius: '999px',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      cursor: isSaving ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: isSaving ? 'none' : '0 8px 16px rgba(111, 0, 34, 0.2)'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSaving) {
                        e.target.style.boxShadow = '0 12px 24px rgba(111, 0, 34, 0.3)';
                        e.target.style.transform = 'translateY(-2px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSaving) {
                        e.target.style.boxShadow = '0 8px 16px rgba(111, 0, 34, 0.2)';
                        e.target.style.transform = 'translateY(0)';
                      }
                    }}
                  >
                    {isSaving ? 'Creating...' : 'Create Staff Member'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {activeSection === 'staff' && isEditStaffModalOpen && (
          <div
            role="presentation"
            onClick={() => {
              if (!isUpdatingStaff) setIsEditStaffModalOpen(false);
            }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(18, 18, 18, 0.65)',
              backdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem',
              zIndex: 1001
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="edit-staff-title"
              onClick={(event) => event.stopPropagation()}
              style={{
                width: 'min(100%, 700px)',
                background: '#fff',
                borderRadius: '24px',
                border: '1px solid #eadfd6',
                boxShadow: '0 24px 60px rgba(0, 0, 0, 0.28)',
                overflow: 'hidden'
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'start',
                gap: '1rem',
                padding: '2rem 2rem 1.25rem',
                borderBottom: '1px solid #f1e8ea'
              }}>
                <div>
                  <h3 id="edit-staff-title" style={{
                    margin: 0,
                    color: '#6f0022',
                    fontSize: '1.8rem',
                    fontFamily: 'Cormorant Garamond, serif',
                    fontWeight: 600
                  }}>
                    Edit Staff Member
                  </h3>
                  <p style={{ margin: '0.35rem 0 0', color: '#666', fontSize: '0.95rem' }}>
                    Update profile details and approval status.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isUpdatingStaff}
                  onClick={() => setIsEditStaffModalOpen(false)}
                  aria-label="Close edit staff dialog"
                  style={{
                    width: '2.9rem',
                    height: '2.9rem',
                    borderRadius: '50%',
                    border: '1px solid #eadfd6',
                    background: '#fff',
                    color: '#6f0022',
                    fontSize: '1.45rem',
                    lineHeight: 1,
                    cursor: isUpdatingStaff ? 'not-allowed' : 'pointer',
                    opacity: isUpdatingStaff ? 0.6 : 1
                  }}
                >
                  ×
                </button>
              </div>

              <form
                onSubmit={updateStaff}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: '1.15rem',
                  padding: '2rem'
                }}
              >
                {error && (
                  <div style={{
                    gridColumn: '1 / -1',
                    background: '#f8d7da',
                    color: '#721c24',
                    padding: '0.9rem 1rem',
                    borderRadius: '10px',
                    border: '1px solid #f1b0b7',
                    fontSize: '0.92rem',
                    fontWeight: 500
                  }}>
                    {error}
                  </div>
                )}

                <input
                  required
                  value={editForm.fullName}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, fullName: e.target.value }))}
                  placeholder="Full Name"
                  style={{
                    gridColumn: '1 / -1',
                    padding: '1rem 1.1rem',
                    border: '1px solid #dee2e6',
                    borderRadius: '10px',
                    fontSize: '1rem',
                    fontFamily: 'Poppins, sans-serif'
                  }}
                />

                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, role: e.target.value }))}
                  style={{
                    padding: '1rem 1.1rem',
                    border: '1px solid #dee2e6',
                    borderRadius: '10px',
                    fontSize: '1rem',
                    fontFamily: 'Poppins, sans-serif',
                    background: '#fff',
                    cursor: 'pointer'
                  }}
                >
                  <option>Customer Care</option>
                  <option>Inventory</option>
                  <option>Order Management</option>
                  <option>Product Management</option>
                  <option>Loyalty Management</option>
                  <option>Admin</option>
                </select>

                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value }))}
                  style={{
                    padding: '1rem 1.1rem',
                    border: '1px solid #dee2e6',
                    borderRadius: '10px',
                    fontSize: '1rem',
                    fontFamily: 'Poppins, sans-serif',
                    background: '#fff',
                    cursor: 'pointer'
                  }}
                >
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Revoked">Revoked</option>
                </select>

                <input
                  type="password"
                  minLength={8}
                  value={editForm.password}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="New Password (optional, min. 8 characters)"
                  style={{
                    gridColumn: '1 / -1',
                    padding: '1rem 1.1rem',
                    border: '1px solid #dee2e6',
                    borderRadius: '10px',
                    fontSize: '1rem',
                    fontFamily: 'Poppins, sans-serif'
                  }}
                />

                <div style={{
                  gridColumn: '1 / -1',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.9rem',
                  flexWrap: 'wrap',
                  paddingTop: '0.5rem'
                }}>
                  <button
                    type="button"
                    disabled={isUpdatingStaff}
                    onClick={() => setIsEditStaffModalOpen(false)}
                    style={{
                      border: '1px solid #dee2e6',
                      color: '#6b7280',
                      padding: '0.95rem 1.4rem',
                      fontSize: '0.98rem',
                      borderRadius: '999px',
                      fontWeight: 600,
                      cursor: isUpdatingStaff ? 'not-allowed' : 'pointer',
                      opacity: isUpdatingStaff ? 0.7 : 1
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdatingStaff}
                    style={{
                      background: '#6f0022',
                      color: '#fff',
                      border: 'none',
                      padding: '0.95rem 1.55rem',
                      borderRadius: '999px',
                      fontWeight: 700,
                      fontSize: '0.98rem',
                      cursor: isUpdatingStaff ? 'not-allowed' : 'pointer',
                      opacity: isUpdatingStaff ? 0.7 : 1
                    }}
                  >
                    {isUpdatingStaff ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {activeSection === 'staff' && (
        <section style={{
          background: '#fff',
          borderRadius: '14px',
          padding: '1rem',
          border: '1px solid #e9ecef',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginBottom: '0.85rem' }}>
            <h3 style={{
              margin: 0,
              color: '#6f0022',
              fontSize: '1.1rem',
              fontFamily: 'Cormorant Garamond, serif',
              fontWeight: 600
            }}>
              Staff Directory
            </h3>
            <span style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 500 }}>
              {filteredList.length}
            </span>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              width: '100%',
              padding: '0.7rem 0.85rem',
              border: '1px solid #dee2e6',
              borderRadius: '10px',
              fontSize: '0.9rem',
              fontFamily: 'Poppins, sans-serif',
              background: '#f8fafc',
              cursor: 'pointer',
              marginBottom: '0.85rem'
            }}
          >
            <option value="all">All Staff</option>
            <option value="Pending">Pending Approval</option>
            <option value="Approved">Approved</option>
            <option value="Revoked">Revoked</option>
          </select>

          {error && (
            <div style={{
              background: '#f8d7da',
              color: '#721c24',
              padding: '0.75rem 0.85rem',
              borderRadius: '10px',
              marginBottom: '0.85rem',
              borderLeft: '4px solid #dc3545',
              fontSize: '0.85rem'
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
            {filteredList.map((item) => {
              const statusStyles = item.status === 'Approved'
                ? { bg: '#d4edda', text: '#155724' }
                : item.status === 'Pending'
                  ? { bg: '#fff3cd', text: '#856404' }
                  : { bg: '#f8d7da', text: '#721c24' };
              return (
                <div
                  key={item._id}
                  style={{
                    border: '1px solid #e9ecef',
                    borderRadius: '12px',
                    padding: '0.85rem',
                    background: '#fafbfc'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.7rem' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: '#6f0022',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1rem',
                      fontWeight: 700,
                      flexShrink: 0
                    }}>
                      {item.fullName?.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontWeight: 600,
                        color: '#1f2937',
                        fontSize: '0.95rem',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {item.fullName}
                      </div>
                      <div style={{
                        fontSize: '0.78rem',
                        color: '#6b7280',
                        marginTop: '0.1rem',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {item.email}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.7rem' }}>
                    <span style={{
                      background: '#eef2ff',
                      color: '#3730a3',
                      padding: '0.25rem 0.6rem',
                      borderRadius: '999px',
                      fontSize: '0.72rem',
                      fontWeight: 600
                    }}>
                      {item.role}
                    </span>
                    <span style={{
                      background: statusStyles.bg,
                      color: statusStyles.text,
                      padding: '0.25rem 0.6rem',
                      borderRadius: '999px',
                      fontSize: '0.72rem',
                      fontWeight: 600
                    }}>
                      {item.status}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.4rem' }}>
                    {item.status !== 'Approved' && (
                      <button
                        disabled={busyId === item._id}
                        onClick={() => performAction(item._id, '/approve')}
                        style={{
                          padding: '0.55rem',
                          border: 'none',
                          background: '#28a745',
                          color: '#fff',
                          borderRadius: '8px',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          cursor: busyId === item._id ? 'not-allowed' : 'pointer',
                          opacity: busyId === item._id ? 0.6 : 1
                        }}
                      >
                        Approve
                      </button>
                    )}
                    {item.status === 'Approved' && (
                      <button
                        disabled={busyId === item._id}
                        onClick={() => performAction(item._id, '/reject')}
                        style={{
                          padding: '0.55rem',
                          border: 'none',
                          background: '#dc3545',
                          color: '#fff',
                          borderRadius: '8px',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          cursor: busyId === item._id ? 'not-allowed' : 'pointer',
                          opacity: busyId === item._id ? 0.6 : 1
                        }}
                      >
                        Reject
                      </button>
                    )}
                    <button
                      disabled={busyId === item._id}
                      onClick={() => openEditStaffModal(item)}
                      style={{
                        padding: '0.55rem',
                        border: '1px solid #0ea5e9',
                        background: '#fff',
                        color: '#0ea5e9',
                        borderRadius: '8px',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        cursor: busyId === item._id ? 'not-allowed' : 'pointer',
                        opacity: busyId === item._id ? 0.6 : 1
                      }}
                    >
                      Edit
                    </button>
                    <button
                      disabled={busyId === item._id}
                      onClick={() => deleteStaff(item._id)}
                      style={{
                        gridColumn: item.status === 'Approved' || item.status === 'Pending' || item.status === 'Revoked' ? 'auto' : 'span 2',
                        padding: '0.55rem',
                        border: '1px solid #9ca3af',
                        background: '#fff',
                        color: '#6b7280',
                        borderRadius: '8px',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        cursor: busyId === item._id ? 'not-allowed' : 'pointer',
                        opacity: busyId === item._id ? 0.6 : 1
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredList.length === 0 && (
              <div style={{
                padding: '2rem 1rem',
                textAlign: 'center',
                color: '#9ca3af',
                fontSize: '0.9rem',
                border: '1px dashed #e5e7eb',
                borderRadius: '12px'
              }}>
                No staff members found for the selected filter.
              </div>
            )}
          </div>
        </section>
        )}

        {activeSection === 'customers' && (
        <section style={{
          background: '#fff',
          borderRadius: '14px',
          padding: '1rem',
          border: '1px solid #e9ecef',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginBottom: '0.85rem' }}>
            <h3 style={{
              margin: 0,
              color: '#6f0022',
              fontSize: '1.1rem',
              fontFamily: 'Cormorant Garamond, serif',
              fontWeight: 600
            }}>
              Customers
            </h3>
            <span style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 500 }}>
              {filteredCustomers.length}
            </span>
          </div>

          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={customerSearchQuery}
            onChange={(e) => setCustomerSearchQuery(e.target.value)}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '0.7rem 0.85rem',
              border: '1px solid #dee2e6',
              borderRadius: '10px',
              fontSize: '0.9rem',
              fontFamily: 'Poppins, sans-serif',
              background: '#f8fafc',
              marginBottom: '0.5rem'
            }}
            onFocus={(e) => e.target.style.borderColor = '#6f0022'}
            onBlur={(e) => e.target.style.borderColor = '#dee2e6'}
          />

          <select
            value={customerLoyaltyFilter}
            onChange={(e) => setCustomerLoyaltyFilter(e.target.value)}
            style={{
              width: '100%',
              padding: '0.7rem 0.85rem',
              border: '1px solid #dee2e6',
              borderRadius: '10px',
              fontSize: '0.9rem',
              fontFamily: 'Poppins, sans-serif',
              background: '#f8fafc',
              cursor: 'pointer',
              marginBottom: '0.85rem'
            }}
          >
            <option value="all">All Customers</option>
            <option value="loyalty">Loyalty Customers</option>
          </select>

          {error && (
            <div style={{
              background: '#f8d7da',
              color: '#721c24',
              padding: '0.75rem 0.85rem',
              borderRadius: '10px',
              marginBottom: '0.85rem',
              borderLeft: '4px solid #dc3545',
              fontSize: '0.85rem'
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
            {filteredCustomers && filteredCustomers.length > 0 ? (
              filteredCustomers.map((customer) => {
                const customerOrderCount = orders.filter(order =>
                  String(order.customerId) === String(customer._id)
                ).length;
                const tier = customer.loyaltyTier || 'Standard';
                const tierStyles = tier === 'Platinum'
                  ? { bg: '#e0e7ff', text: '#3d5a80' }
                  : tier === 'Gold'
                    ? { bg: '#fef3c7', text: '#92400e' }
                    : tier === 'Silver'
                      ? { bg: '#f1f5f9', text: '#475569' }
                      : { bg: '#fce7eb', text: '#6f0022' };

                return (
                  <div
                    key={customer._id}
                    style={{
                      border: '1px solid #e9ecef',
                      borderRadius: '12px',
                      padding: '0.85rem',
                      background: '#fafbfc'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.7rem' }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: '#0066cc',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1rem',
                        fontWeight: 700,
                        flexShrink: 0
                      }}>
                        {(customer.fullName || '?').charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontWeight: 600,
                          color: '#1f2937',
                          fontSize: '0.95rem',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {customer.fullName || 'N/A'}
                        </div>
                        <div style={{
                          fontSize: '0.78rem',
                          color: '#6b7280',
                          marginTop: '0.1rem',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {customer.email}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.7rem' }}>
                      <span style={{
                        background: tierStyles.bg,
                        color: tierStyles.text,
                        padding: '0.25rem 0.6rem',
                        borderRadius: '999px',
                        fontSize: '0.72rem',
                        fontWeight: 600
                      }}>
                        {tier}
                      </span>
                      <span style={{
                        background: '#eef2ff',
                        color: '#3730a3',
                        padding: '0.25rem 0.6rem',
                        borderRadius: '999px',
                        fontSize: '0.72rem',
                        fontWeight: 600
                      }}>
                        {customerOrderCount} {customerOrderCount === 1 ? 'order' : 'orders'}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.4rem' }}>
                      <button
                        disabled={customerBusyId === customer._id}
                        onClick={() => openCustomerDetailsModal(customer)}
                        style={{
                          padding: '0.55rem',
                          border: 'none',
                          background: '#0066cc',
                          color: '#fff',
                          borderRadius: '8px',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          cursor: customerBusyId === customer._id ? 'not-allowed' : 'pointer',
                          opacity: customerBusyId === customer._id ? 0.6 : 1
                        }}
                      >
                        View Info
                      </button>
                      <button
                        disabled={customerBusyId === customer._id}
                        onClick={() => deleteCustomer(customer._id)}
                        style={{
                          padding: '0.55rem',
                          border: '1px solid #dc3545',
                          background: '#fff',
                          color: '#dc3545',
                          borderRadius: '8px',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          cursor: customerBusyId === customer._id ? 'not-allowed' : 'pointer',
                          opacity: customerBusyId === customer._id ? 0.6 : 1
                        }}
                      >
                        {customerBusyId === customer._id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{
                padding: '2rem 1rem',
                textAlign: 'center',
                color: '#9ca3af',
                fontSize: '0.9rem',
                border: '1px dashed #e5e7eb',
                borderRadius: '12px'
              }}>
                {customerSearchQuery.trim()
                  ? 'No customers match your search.'
                  : customerLoyaltyFilter === 'loyalty'
                    ? 'No loyalty customers found.'
                    : 'No customers found.'
                }
              </div>
            )}
          </div>
        </section>
        )}

        {isCustomerDetailsModalOpen && selectedCustomerDetails && (
          <div
            role="presentation"
            onClick={closeCustomerDetailsModal}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(18, 18, 18, 0.65)',
              backdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              padding: 0,
              zIndex: 1000
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              onClick={(event) => event.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: '550px',
                maxHeight: '92vh',
                background: '#fff',
                borderRadius: '20px 20px 0 0',
                border: '1px solid #eadfd6',
                boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.28)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              {/* Sheet handle */}
              <div style={{ display: 'flex', justifyContent: 'center', padding: '0.5rem 0 0' }}>
                <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: '#e5e7eb' }} />
              </div>

              {/* Modal Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem 1rem',
                borderBottom: '1px solid #f1e8ea',
                flexShrink: 0
              }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: '#0066cc',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  flexShrink: 0
                }}>
                  {(selectedCustomerDetails.fullName || '?').charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2 style={{
                    margin: 0,
                    color: '#6f0022',
                    fontSize: '1.15rem',
                    fontFamily: 'Cormorant Garamond, serif',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {selectedCustomerDetails.fullName}
                  </h2>
                  <p style={{
                    margin: '0.1rem 0 0',
                    color: '#6b7280',
                    fontSize: '0.72rem',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    ID: {selectedCustomerDetails._id}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeCustomerDetailsModal}
                  aria-label="Close customer details dialog"
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    border: '1px solid #eadfd6',
                    background: '#fff',
                    color: '#6f0022',
                    fontSize: '1.2rem',
                    lineHeight: 1,
                    cursor: 'pointer',
                    flexShrink: 0
                  }}
                >
                  ×
                </button>
              </div>

              {/* Modal Content */}
              <div style={{ padding: '1rem', overflowY: 'auto', flex: 1 }}>
                {customerDetailsError && (
                  <div style={{
                    background: '#f8d7da',
                    color: '#721c24',
                    padding: '0.75rem 0.85rem',
                    borderRadius: '10px',
                    marginBottom: '0.85rem',
                    border: '1px solid #f1b0b7',
                    fontSize: '0.85rem'
                  }}>
                    {customerDetailsError}
                  </div>
                )}

                {isLoadingCustomerDetails ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280', fontSize: '0.9rem' }}>
                    Loading customer details...
                  </div>
                ) : (
                  <>
                    {/* Personal Information */}
                    <div style={{ marginBottom: '1.25rem' }}>
                      <h3 style={{
                        margin: '0 0 0.7rem',
                        color: '#6f0022',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        letterSpacing: '0.6px',
                        textTransform: 'uppercase'
                      }}>
                        Personal Information
                      </h3>
                      <div style={{
                        background: '#f8fafc',
                        border: '1px solid #e9ecef',
                        borderRadius: '12px',
                        padding: '0.85rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.7rem'
                      }}>
                        {[
                          { label: 'Full Name', value: selectedCustomerDetails.fullName },
                          { label: 'Email', value: selectedCustomerDetails.email, breakAll: true },
                          { label: 'Phone', value: selectedCustomerDetails.phone || 'N/A' },
                          {
                            label: 'Registered',
                            value: selectedCustomerDetails.registeredDate
                              ? new Date(selectedCustomerDetails.registeredDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                              : 'N/A'
                          }
                        ].map((row, idx, arr) => (
                          <div key={idx} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            gap: '0.75rem',
                            paddingBottom: idx < arr.length - 1 ? '0.7rem' : 0,
                            borderBottom: idx < arr.length - 1 ? '1px solid #e9ecef' : 'none'
                          }}>
                            <span style={{ color: '#6b7280', fontSize: '0.78rem', fontWeight: 500, flexShrink: 0 }}>
                              {row.label}
                            </span>
                            <span style={{
                              color: '#1f2937',
                              fontSize: '0.85rem',
                              fontWeight: 600,
                              textAlign: 'right',
                              wordBreak: row.breakAll ? 'break-all' : 'normal',
                              minWidth: 0
                            }}>
                              {row.value}
                            </span>
                          </div>
                        ))}
                        {selectedCustomerDetails.address && (
                          <div style={{
                            paddingTop: '0.7rem',
                            borderTop: '1px solid #e9ecef'
                          }}>
                            <p style={{ margin: '0 0 0.25rem', color: '#6b7280', fontSize: '0.78rem', fontWeight: 500 }}>Address</p>
                            <p style={{ margin: 0, color: '#1f2937', fontSize: '0.85rem', fontWeight: 500, lineHeight: 1.4 }}>
                              {selectedCustomerDetails.address.street}, {selectedCustomerDetails.address.city}, {selectedCustomerDetails.address.state} {selectedCustomerDetails.address.zipCode}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Order Summary */}
                    <div style={{ marginBottom: '1.25rem' }}>
                      <h3 style={{
                        margin: '0 0 0.7rem',
                        color: '#6f0022',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        letterSpacing: '0.6px',
                        textTransform: 'uppercase'
                      }}>
                        Order Summary
                      </h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                        {[
                          { label: 'Orders', value: selectedCustomerDetails.orderCount, color: '#0066cc' },
                          { label: 'Spent', value: `LKR ${Math.round(selectedCustomerDetails.totalSpent).toLocaleString()}`, color: '#28a745' },
                          { label: 'Avg', value: `LKR ${selectedCustomerDetails.orderCount > 0 ? Math.round(selectedCustomerDetails.totalSpent / selectedCustomerDetails.orderCount).toLocaleString() : '0'}`, color: '#6f0022' }
                        ].map((tile, idx) => (
                          <div key={idx} style={{
                            background: '#f8fafc',
                            border: '1px solid #e9ecef',
                            borderRadius: '10px',
                            padding: '0.7rem 0.5rem',
                            textAlign: 'center'
                          }}>
                            <p style={{ margin: 0, color: '#6b7280', fontSize: '0.7rem', fontWeight: 500, textTransform: 'uppercase' }}>
                              {tile.label}
                            </p>
                            <p style={{
                              margin: '0.25rem 0 0',
                              color: tile.color,
                              fontSize: '0.95rem',
                              fontWeight: 700,
                              wordBreak: 'break-word',
                              lineHeight: 1.2
                            }}>
                              {tile.value}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Loyalty Program */}
                    <div style={{ marginBottom: '1.25rem' }}>
                      <h3 style={{
                        margin: '0 0 0.7rem',
                        color: '#6f0022',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        letterSpacing: '0.6px',
                        textTransform: 'uppercase'
                      }}>
                        Loyalty Program
                      </h3>
                      <div style={{
                        background: '#f8fafc',
                        border: '1px solid #e9ecef',
                        borderRadius: '12px',
                        padding: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.85rem'
                      }}>
                        <div>
                          <p style={{ margin: 0, color: '#6b7280', fontSize: '0.72rem', fontWeight: 500, textTransform: 'uppercase' }}>Tier</p>
                          <span style={{
                            display: 'inline-block',
                            marginTop: '0.35rem',
                            padding: '0.3rem 0.7rem',
                            borderRadius: '999px',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            background: selectedCustomerDetails.loyaltyTierStatus === 'Platinum' ? '#3d5a80' :
                                        selectedCustomerDetails.loyaltyTierStatus === 'Gold' ? '#e0bf63' :
                                        selectedCustomerDetails.loyaltyTierStatus === 'Silver' ? '#c0c0c0' : '#9ca3af',
                            color: selectedCustomerDetails.loyaltyTierStatus === 'Gold' ? '#3d2b00' : '#fff'
                          }}>
                            {selectedCustomerDetails.loyaltyTierStatus}
                          </span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ margin: 0, color: '#6b7280', fontSize: '0.72rem', fontWeight: 500, textTransform: 'uppercase' }}>Points</p>
                          <p style={{ margin: '0.25rem 0 0', color: '#e0bf63', fontSize: '1.15rem', fontWeight: 700 }}>
                            {selectedCustomerDetails.loyaltyPointsBalance}
                          </p>
                          <p style={{ margin: '0.1rem 0 0', color: '#9ca3af', fontSize: '0.72rem' }}>
                            {selectedCustomerDetails.isLoyalty ? 'Active Member' : 'Not a member'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Order History */}
                    <div style={{ marginBottom: '1.25rem' }}>
                      <h3 style={{
                        margin: '0 0 0.7rem',
                        color: '#6f0022',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        letterSpacing: '0.6px',
                        textTransform: 'uppercase'
                      }}>
                        Order History
                      </h3>
                      {selectedCustomerDetails.orders && selectedCustomerDetails.orders.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                          {selectedCustomerDetails.orders.map((order) => {
                            const itemCount = Array.isArray(order.items)
                              ? order.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
                              : 0;
                            const statusColor = order.status === 'Completed'
                              ? { bg: '#d4edda', text: '#155724' }
                              : order.status === 'Pending'
                                ? { bg: '#fff3cd', text: '#856404' }
                                : ['Cancelled', 'Refunded'].includes(order.status)
                                  ? { bg: '#f8d7da', text: '#721c24' }
                                  : { bg: '#e2e3e5', text: '#383d41' };
                            return (
                              <div key={order._id} style={{
                                background: '#f8fafc',
                                border: '1px solid #e9ecef',
                                borderRadius: '10px',
                                padding: '0.7rem 0.85rem'
                              }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                                  <span style={{ fontWeight: 700, color: '#1f2937', fontSize: '0.85rem' }}>
                                    #{order.orderNumber}
                                  </span>
                                  <span style={{
                                    background: statusColor.bg,
                                    color: statusColor.text,
                                    padding: '0.2rem 0.55rem',
                                    borderRadius: '999px',
                                    fontSize: '0.7rem',
                                    fontWeight: 600
                                  }}>
                                    {order.status}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                                  <div style={{ color: '#6b7280', fontSize: '0.78rem' }}>
                                    {new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                    <span style={{ margin: '0 0.4rem' }}>·</span>
                                    {itemCount} item{itemCount !== 1 ? 's' : ''}
                                  </div>
                                  <div style={{ color: '#6f0022', fontSize: '0.95rem', fontWeight: 700 }}>
                                    LKR {Math.round(Number(order.total || 0)).toLocaleString()}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div style={{
                          background: '#f8fafc',
                          border: '1px dashed #e5e7eb',
                          borderRadius: '12px',
                          padding: '1.1rem',
                          textAlign: 'center',
                          color: '#9ca3af',
                          fontSize: '0.85rem'
                        }}>
                          No orders yet.
                        </div>
                      )}
                    </div>

                    {/* Coupons Used */}
                    <div>
                      <h3 style={{
                        margin: '0 0 0.7rem',
                        color: '#6f0022',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        letterSpacing: '0.6px',
                        textTransform: 'uppercase'
                      }}>
                        Coupons Used
                      </h3>
                      {selectedCustomerDetails.couponsUsed && selectedCustomerDetails.couponsUsed.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                          {selectedCustomerDetails.couponsUsed.map((coupon, idx) => (
                            <div key={idx} style={{
                              background: '#f8fafc',
                              border: '1px solid #e9ecef',
                              borderRadius: '10px',
                              padding: '0.7rem 0.85rem',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: '0.75rem'
                            }}>
                              <div style={{ minWidth: 0 }}>
                                <p style={{
                                  margin: 0,
                                  color: '#6f0022',
                                  fontSize: '0.95rem',
                                  fontWeight: 700,
                                  fontFamily: 'monospace',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}>
                                  {coupon.code}
                                </p>
                                <p style={{ margin: '0.15rem 0 0', color: '#9ca3af', fontSize: '0.72rem' }}>
                                  Order #{coupon.orderNumber}
                                </p>
                              </div>
                              <div style={{ color: '#28a745', fontSize: '0.9rem', fontWeight: 700, flexShrink: 0 }}>
                                -LKR {Math.round(coupon.discount).toLocaleString()}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{
                          background: '#f8fafc',
                          border: '1px dashed #e5e7eb',
                          borderRadius: '12px',
                          padding: '1.1rem',
                          textAlign: 'center',
                          color: '#9ca3af',
                          fontSize: '0.85rem'
                        }}>
                          No coupons used yet.
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Modal Footer */}
              <div style={{
                padding: '0.75rem 1rem calc(0.75rem + env(safe-area-inset-bottom, 0px))',
                borderTop: '1px solid #f1e8ea',
                background: '#f9f7f4',
                flexShrink: 0
              }}>
                <button
                  type="button"
                  onClick={closeCustomerDetailsModal}
                  style={{
                    width: '100%',
                    border: 'none',
                    color: '#fff',
                    background: '#6f0022',
                    padding: '0.85rem',
                    fontSize: '0.95rem',
                    borderRadius: '10px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {(isAddBannerModalOpen || isEditBannerModalOpen) && (
          <div
            role="presentation"
            onClick={() => { setIsAddBannerModalOpen(false); setIsEditBannerModalOpen(false); }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(18, 18, 18, 0.65)',
              backdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              padding: 0,
              zIndex: 1000
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              onClick={(event) => event.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: '550px',
                maxHeight: '92vh',
                background: '#fff',
                borderRadius: '20px 20px 0 0',
                border: '1px solid #eadfd6',
                boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.28)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              {/* Sheet handle */}
              <div style={{ display: 'flex', justifyContent: 'center', padding: '0.5rem 0 0' }}>
                <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: '#e5e7eb' }} />
              </div>

              {/* Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem',
                padding: '0.75rem 1rem 1rem',
                borderBottom: '1px solid #f1e8ea',
                flexShrink: 0
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{
                    margin: 0,
                    color: '#6f0022',
                    fontSize: '1.15rem',
                    fontFamily: 'Cormorant Garamond, serif',
                    fontWeight: 600
                  }}>
                    {isEditBannerModalOpen ? 'Edit Banner' : 'Create Banner'}
                  </h3>
                  <p style={{
                    margin: '0.1rem 0 0',
                    color: '#6b7280',
                    fontSize: '0.78rem'
                  }}>
                    {isEditBannerModalOpen ? 'Update content and settings' : 'New promotional banner'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setIsAddBannerModalOpen(false); setIsEditBannerModalOpen(false); }}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    border: '1px solid #eadfd6',
                    background: '#fff',
                    color: '#6f0022',
                    fontSize: '1.2rem',
                    lineHeight: 1,
                    cursor: 'pointer',
                    flexShrink: 0
                  }}
                >
                  ×
                </button>
              </div>

              {/* Form Content */}
              <form
                onSubmit={isEditBannerModalOpen ? updateBanner : createBanner}
                style={{
                  padding: '1rem',
                  overflowY: 'auto',
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem'
                }}
              >
                {error && (
                  <div style={{
                    background: '#f8d7da',
                    border: '1px solid #f5c6cb',
                    color: '#721c24',
                    padding: '0.75rem 0.85rem',
                    borderRadius: '10px',
                    fontSize: '0.85rem'
                  }}>
                    {error}
                  </div>
                )}

                {/* Live preview */}
                <div style={{
                  background: bannerForm.backgroundColor || '#fff3cd',
                  color: bannerForm.textColor || '#856404',
                  padding: '0.85rem 1rem',
                  borderRadius: '10px',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  textAlign: 'center',
                  border: '1px dashed rgba(0,0,0,0.08)',
                  wordBreak: 'break-word'
                }}>
                  {bannerForm.message || 'Banner preview…'}
                </div>

                {/* Message */}
                <div>
                  <label style={{
                    display: 'block',
                    color: '#374151',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    marginBottom: '0.4rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.4px'
                  }}>
                    Message
                  </label>
                  <textarea
                    value={bannerForm.message}
                    onChange={(e) => setBannerForm({ ...bannerForm, message: e.target.value })}
                    placeholder="e.g., New collection launched! Check it out."
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '0.7rem 0.85rem',
                      border: '1px solid #dee2e6',
                      borderRadius: '10px',
                      fontFamily: 'Poppins, sans-serif',
                      fontSize: '0.9rem',
                      background: '#f8fafc',
                      resize: 'vertical',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => { e.target.style.borderColor = '#6f0022'; e.target.style.background = '#fff'; }}
                    onBlur={(e) => { e.target.style.borderColor = '#dee2e6'; e.target.style.background = '#f8fafc'; }}
                  />
                </div>

                {/* Type */}
                <div>
                  <label style={{
                    display: 'block',
                    color: '#374151',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    marginBottom: '0.4rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.4px'
                  }}>
                    Type
                  </label>
                  <select
                    value={bannerForm.type}
                    onChange={(e) => setBannerForm({ ...bannerForm, type: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.7rem 0.85rem',
                      border: '1px solid #dee2e6',
                      borderRadius: '10px',
                      fontSize: '0.9rem',
                      fontFamily: 'Poppins, sans-serif',
                      background: '#f8fafc',
                      cursor: 'pointer',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="info">Information</option>
                    <option value="success">Success</option>
                    <option value="warning">Warning</option>
                    <option value="promo">Promotion</option>
                  </select>
                </div>

                {/* Colors */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{
                      display: 'block',
                      color: '#374151',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      marginBottom: '0.4rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.4px'
                    }}>
                      Background
                    </label>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.4rem 0.5rem',
                      border: '1px solid #dee2e6',
                      borderRadius: '10px',
                      background: '#f8fafc'
                    }}>
                      <input
                        type="color"
                        value={bannerForm.backgroundColor}
                        onChange={(e) => setBannerForm({ ...bannerForm, backgroundColor: e.target.value })}
                        style={{
                          width: '38px',
                          height: '38px',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          padding: 0,
                          background: 'transparent'
                        }}
                      />
                      <span style={{ color: '#6b7280', fontSize: '0.78rem', fontFamily: 'monospace' }}>
                        {bannerForm.backgroundColor}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label style={{
                      display: 'block',
                      color: '#374151',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      marginBottom: '0.4rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.4px'
                    }}>
                      Text
                    </label>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.4rem 0.5rem',
                      border: '1px solid #dee2e6',
                      borderRadius: '10px',
                      background: '#f8fafc'
                    }}>
                      <input
                        type="color"
                        value={bannerForm.textColor}
                        onChange={(e) => setBannerForm({ ...bannerForm, textColor: e.target.value })}
                        style={{
                          width: '38px',
                          height: '38px',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          padding: 0,
                          background: 'transparent'
                        }}
                      />
                      <span style={{ color: '#6b7280', fontSize: '0.78rem', fontFamily: 'monospace' }}>
                        {bannerForm.textColor}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Dates */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{
                      display: 'block',
                      color: '#374151',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      marginBottom: '0.4rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.4px'
                    }}>
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={bannerForm.startDate}
                      onChange={(e) => setBannerForm({ ...bannerForm, startDate: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                      style={{
                        width: '100%',
                        padding: '0.7rem 0.85rem',
                        border: '1px solid #dee2e6',
                        borderRadius: '10px',
                        fontSize: '0.9rem',
                        fontFamily: 'Poppins, sans-serif',
                        background: '#f8fafc',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{
                      display: 'block',
                      color: '#374151',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      marginBottom: '0.4rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.4px'
                    }}>
                      End Date
                    </label>
                    <input
                      type="date"
                      value={bannerForm.endDate}
                      onChange={(e) => setBannerForm({ ...bannerForm, endDate: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                      style={{
                        width: '100%',
                        padding: '0.7rem 0.85rem',
                        border: '1px solid #dee2e6',
                        borderRadius: '10px',
                        fontSize: '0.9rem',
                        fontFamily: 'Poppins, sans-serif',
                        background: '#f8fafc',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                {/* Active toggle */}
                <label
                  htmlFor="isActiveBanner"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    padding: '0.75rem 0.85rem',
                    background: '#f8fafc',
                    border: '1px solid #dee2e6',
                    borderRadius: '10px',
                    cursor: 'pointer'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, color: '#1f2937', fontSize: '0.9rem' }}>
                      Active
                    </div>
                    <div style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '0.1rem' }}>
                      Show this banner on the home page
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    id="isActiveBanner"
                    checked={bannerForm.isActive}
                    onChange={(e) => setBannerForm({ ...bannerForm, isActive: e.target.checked })}
                    style={{
                      width: '20px',
                      height: '20px',
                      cursor: 'pointer',
                      accentColor: '#6f0022'
                    }}
                  />
                </label>
              </form>

              {/* Sticky footer actions */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1.4fr',
                gap: '0.5rem',
                padding: '0.75rem 1rem calc(0.75rem + env(safe-area-inset-bottom, 0px))',
                borderTop: '1px solid #f1e8ea',
                background: '#f9f7f4',
                flexShrink: 0
              }}>
                <button
                  type="button"
                  onClick={() => { setIsAddBannerModalOpen(false); setIsEditBannerModalOpen(false); }}
                  style={{
                    border: '1px solid #dee2e6',
                    color: '#6b7280',
                    background: '#fff',
                    padding: '0.85rem',
                    fontSize: '0.9rem',
                    borderRadius: '10px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={isEditBannerModalOpen ? updateBanner : createBanner}
                  disabled={isSavingBanner}
                  style={{
                    background: isSavingBanner ? '#c9c9c9' : '#6f0022',
                    color: '#fff',
                    border: 'none',
                    padding: '0.85rem',
                    fontSize: '0.9rem',
                    borderRadius: '10px',
                    fontWeight: 700,
                    cursor: isSavingBanner ? 'not-allowed' : 'pointer',
                    boxShadow: isSavingBanner ? 'none' : '0 6px 14px rgba(111, 0, 34, 0.2)'
                  }}
                >
                  {isSavingBanner ? 'Saving...' : (isEditBannerModalOpen ? 'Update Banner' : 'Create Banner')}
                </button>
              </div>
            </div>
          </div>
        )}
        {activeSection === 'profile' && (
          <section style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '2rem 1.5rem',
            border: '1px solid #e9ecef',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.5rem'
          }}>
            <h1 style={{
              margin: 0,
              fontSize: '1.4rem',
              fontFamily: 'Cormorant Garamond, serif',
              fontWeight: 600,
              letterSpacing: '0.5px',
              color: '#6f0022',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              textTransform: 'uppercase',
              textAlign: 'center'
            }}>
              <FiShield size={28} />
              Admin Dashboard
            </h1>

            <div style={{
              width: '88px',
              height: '88px',
              borderRadius: '50%',
              background: '#e0bf63',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.4rem',
              fontWeight: 700,
              color: '#3d2b00'
            }}>
              {staffUser.fullName?.charAt(0).toUpperCase()}
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 600, fontSize: '1.1rem', color: '#1f2937' }}>
                {staffUser.fullName}
              </div>
              <div style={{ fontSize: '0.9rem', color: '#6b7280', marginTop: '0.25rem' }}>
                {staffUser.email}
              </div>
            </div>

            <button
              onClick={() => authManager.logout()}
              onMouseEnter={() => setIsLogoutHovered(true)}
              onMouseLeave={() => setIsLogoutHovered(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.6rem',
                width: '100%',
                maxWidth: '320px',
                padding: '0.85rem 1.25rem',
                background: isLogoutHovered ? '#5a001b' : '#6f0022',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                fontSize: '1rem',
                fontFamily: 'Poppins, sans-serif',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
            >
              <FiLogOut size={20} />
              Logout
            </button>
          </section>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: '#6f0022',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.18)',
        zIndex: 200,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'stretch',
          justifyContent: 'space-around',
          maxWidth: '720px',
          margin: '0 auto'
        }}>
          {navItems.map((item) => {
            const isActive = activeSection === item.key;
            const IconComponent = item.icon;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveSection(item.key)}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.25rem',
                  padding: '0.6rem 0.25rem',
                  background: 'transparent',
                  color: isActive ? '#e0bf63' : 'rgba(255, 255, 255, 0.75)',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'Poppins, sans-serif',
                  fontSize: '0.7rem',
                  fontWeight: isActive ? 600 : 500,
                  transition: 'color 0.2s'
                }}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
              >
                <IconComponent size={22} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
