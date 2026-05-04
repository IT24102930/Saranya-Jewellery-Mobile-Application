import { useEffect, useMemo, useState } from 'react';
import { FiHome, FiUsers, FiTrendingUp, FiLogOut, FiEye, FiDollarSign, FiShield, FiBell, FiShoppingCart, FiPackage, FiCheck, FiClock, FiRefreshCw, FiUser, FiPlus, FiEdit2, FiTrash2, FiMail, FiUserCheck, FiUserX, FiSlash, FiSearch, FiPhone, FiAward, FiStar, FiX } from 'react-icons/fi';
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
          {/* Premium Welcome Hero */}
          <section style={{
            background: 'linear-gradient(135deg, #6f0022 0%, #8b0029 55%, #5a001b 100%)',
            borderRadius: '22px',
            padding: '1.4rem 1.15rem 1.5rem',
            marginBottom: '1rem',
            color: '#fff',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 12px 28px rgba(111, 0, 34, 0.28)'
          }}>
            <div style={{
              position: 'absolute',
              top: '-60px',
              right: '-50px',
              width: '180px',
              height: '180px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(224, 191, 99, 0.28), transparent 70%)',
              pointerEvents: 'none'
            }} />
            <div style={{
              position: 'absolute',
              bottom: '-70px',
              left: '-40px',
              width: '160px',
              height: '160px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(224, 191, 99, 0.14), transparent 70%)',
              pointerEvents: 'none'
            }} />

            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.1rem' }}>
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #e0bf63 0%, #c9a352 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.15rem',
                  fontWeight: 700,
                  color: '#3d2b00',
                  boxShadow: '0 6px 14px rgba(224, 191, 99, 0.45)',
                  flexShrink: 0
                }}>
                  {staffUser.fullName?.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    margin: 0,
                    fontSize: '0.72rem',
                    color: '#e0bf63',
                    letterSpacing: '0.7px',
                    textTransform: 'uppercase',
                    fontWeight: 600
                  }}>
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                  </p>
                  <h2 style={{
                    margin: '0.2rem 0 0',
                    fontFamily: 'Cormorant Garamond, serif',
                    fontSize: '1.45rem',
                    fontWeight: 700,
                    color: '#ffffff',
                    textShadow: '0 1px 2px rgba(0, 0, 0, 0.25)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    Hello, {staffUser.fullName?.split(' ')[0] || 'Admin'}
                  </h2>
                </div>
              </div>

              <div style={{
                background: 'rgba(255, 255, 255, 0.09)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                borderRadius: '16px',
                padding: '0.95rem 1rem',
                border: '1px solid rgba(255, 255, 255, 0.16)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                  <p style={{
                    margin: 0,
                    fontSize: '0.72rem',
                    color: '#e0bf63',
                    letterSpacing: '0.7px',
                    textTransform: 'uppercase',
                    fontWeight: 700
                  }}>
                    Today's Revenue
                  </p>
                  <span style={{
                    background: 'rgba(224, 191, 99, 0.25)',
                    color: '#fff8e1',
                    padding: '0.22rem 0.6rem',
                    borderRadius: '999px',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    letterSpacing: '0.6px',
                    border: '1px solid rgba(224, 191, 99, 0.55)'
                  }}>
                    LIVE
                  </span>
                </div>
                <h1 style={{
                  margin: '0.1rem 0 0',
                  fontSize: '2.05rem',
                  fontWeight: 800,
                  fontFamily: '"Plus Jakarta Sans", "Inter", system-ui, sans-serif',
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: '-0.5px',
                  color: '#ffffff',
                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                  lineHeight: 1.1,
                  wordBreak: 'break-word'
                }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#e0bf63', marginRight: '0.35rem', letterSpacing: '0.5px' }}>LKR</span>
                  {(stats.totalIncome || 0).toLocaleString()}
                </h1>
                <p style={{
                  margin: '0.45rem 0 0',
                  fontSize: '0.75rem',
                  color: '#fff8e1',
                  fontWeight: 500,
                  fontVariantNumeric: 'tabular-nums'
                }}>
                  <span style={{ color: '#e0bf63', fontWeight: 700 }}>{stats.totalOrders || 0}</span> orders · <span style={{ color: '#e0bf63', fontWeight: 700 }}>{stats.completedOrders || 0}</span> completed
                </p>
              </div>
            </div>
          </section>

          {/* Period Performance pills */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: '0.55rem',
            marginBottom: '1rem'
          }}>
            {[
              { label: 'Month', value: stats.monthIncome, accent: '#0891b2', icon: FiDollarSign },
              { label: 'Year', value: stats.yearIncome, accent: '#059669', icon: FiTrendingUp },
              { label: 'Refunds', value: stats.totalRefunds, accent: '#dc2626', icon: FiRefreshCw }
            ].map((tile, idx) => {
              const Icon = tile.icon;
              return (
                <div key={idx} style={{
                  background: '#fff',
                  borderRadius: '14px',
                  padding: '0.85rem 0.65rem',
                  border: '1px solid #eef0f3',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                  textAlign: 'center'
                }}>
                  <div style={{
                    width: '34px',
                    height: '34px',
                    margin: '0 auto 0.45rem',
                    borderRadius: '50%',
                    background: `${tile.accent}14`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Icon size={16} color={tile.accent} strokeWidth={2.4} />
                  </div>
                  <p style={{
                    margin: 0,
                    fontSize: '0.66rem',
                    color: '#94a3b8',
                    fontWeight: 600,
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase'
                  }}>
                    {tile.label}
                  </p>
                  <h4 style={{
                    margin: '0.2rem 0 0',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: '#1f2937',
                    fontFamily: '"Plus Jakarta Sans", "Inter", system-ui, sans-serif',
                    fontVariantNumeric: 'tabular-nums',
                    letterSpacing: '-0.2px',
                    wordBreak: 'break-word',
                    lineHeight: 1.15
                  }}>
                    <span style={{ fontSize: '0.55rem', fontWeight: 600, color: '#94a3b8', marginRight: '0.18rem', letterSpacing: '0.4px' }}>LKR</span>
                    {(tile.value || 0).toLocaleString()}
                  </h4>
                </div>
              );
            })}
          </div>

          {/* Business Overview */}
          <section style={{
            background: '#fff',
            borderRadius: '20px',
            padding: '1.05rem 0.85rem',
            marginBottom: '1rem',
            border: '1px solid #eef0f3',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.9rem', padding: '0 0.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{
                  width: '4px',
                  height: '20px',
                  background: 'linear-gradient(180deg, #6f0022, #e0bf63)',
                  borderRadius: '4px'
                }} />
                <h3 style={{
                  margin: 0,
                  color: '#6f0022',
                  fontSize: '1.05rem',
                  fontFamily: 'Cormorant Garamond, serif',
                  fontWeight: 600,
                  letterSpacing: '0.3px'
                }}>
                  Business Overview
                </h3>
              </div>
              <span style={{
                fontSize: '0.66rem',
                color: '#94a3b8',
                fontWeight: 600,
                letterSpacing: '0.5px',
                textTransform: 'uppercase'
              }}>
                Snapshot
              </span>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: '0.5rem'
            }}>
              {[
                { label: 'Customers', value: stats.totalCustomers, color: '#6f0022', icon: FiUsers },
                { label: 'Products', value: stats.totalProducts, color: '#2563eb', icon: FiShoppingCart },
                { label: 'Total Orders', value: stats.totalOrders, color: '#0d9488', icon: FiPackage },
                { label: 'Loyalty', value: stats.loyaltyMembers, color: '#d4a936', icon: FiTrendingUp },
                { label: 'Completed', value: stats.completedOrders, color: '#10b981', icon: FiCheck },
                { label: 'Pending', value: stats.pendingOrders, color: '#f59e0b', icon: FiClock },
                { label: 'Promo Sent', value: stats.promotionsSentToday, color: '#ec4899', icon: FiBell },
                { label: 'Gold / g', value: `LKR ${(stats.goldRate || 0).toLocaleString()}`, color: '#b45309', icon: FiTrendingUp }
              ].map((stat, idx) => {
                const Icon = stat.icon;
                return (
                  <div key={idx} style={{
                    background: 'linear-gradient(135deg, #fafbfc 0%, #f4f6f9 100%)',
                    borderRadius: '13px',
                    padding: '0.75rem 0.7rem',
                    border: '1px solid #eef0f3',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      position: 'absolute',
                      right: '-12px',
                      bottom: '-12px',
                      width: '50px',
                      height: '50px',
                      borderRadius: '50%',
                      background: `${stat.color}10`,
                      pointerEvents: 'none'
                    }} />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem', position: 'relative' }}>
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '8px',
                        background: `${stat.color}18`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Icon size={14} color={stat.color} strokeWidth={2.5} />
                      </div>
                      <span style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: stat.color,
                        boxShadow: `0 0 0 3px ${stat.color}22`
                      }} />
                    </div>
                    <p style={{
                      margin: 0,
                      fontSize: '0.66rem',
                      color: '#94a3b8',
                      fontWeight: 600,
                      letterSpacing: '0.4px',
                      textTransform: 'uppercase',
                      position: 'relative'
                    }}>
                      {stat.label}
                    </p>
                    <h4 style={{
                      margin: '0.18rem 0 0',
                      color: '#1f2937',
                      fontSize: '1.05rem',
                      fontWeight: 700,
                      fontFamily: '"Plus Jakarta Sans", "Inter", system-ui, sans-serif',
                      fontVariantNumeric: 'tabular-nums',
                      letterSpacing: '-0.3px',
                      lineHeight: 1.2,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      position: 'relative'
                    }}>
                      {stat.value}
                    </h4>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Revenue Trend Chart */}
          <section style={{
            background: 'linear-gradient(180deg, #ffffff 0%, #fafbfc 100%)',
            borderRadius: '20px',
            padding: '1.15rem 0.85rem 0.6rem',
            border: '1px solid #eef0f3',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
            marginBottom: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.55rem', padding: '0 0.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{
                  width: '4px',
                  height: '20px',
                  background: 'linear-gradient(180deg, #6f0022, #e0bf63)',
                  borderRadius: '4px'
                }} />
                <div>
                  <h3 style={{
                    margin: 0,
                    color: '#6f0022',
                    fontSize: '1.05rem',
                    fontFamily: 'Cormorant Garamond, serif',
                    fontWeight: 600
                  }}>
                    Revenue Trend
                  </h3>
                  <p style={{ margin: '0.05rem 0 0', fontSize: '0.7rem', color: '#94a3b8' }}>
                    Last 7 days
                  </p>
                </div>
              </div>
              <div style={{
                background: 'linear-gradient(135deg, #6f0022 0%, #8b0029 100%)',
                color: '#e0bf63',
                padding: '0.32rem 0.7rem',
                borderRadius: '999px',
                fontSize: '0.68rem',
                fontWeight: 700,
                letterSpacing: '0.5px',
                boxShadow: '0 2px 6px rgba(111, 0, 34, 0.25)'
              }}>
                7D
              </div>
            </div>
            <ResponsiveContainer width="100%" height={210}>
              <LineChart data={chartData.revenueTrend} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6f0022" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#6f0022" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} width={42} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #eef0f3', borderRadius: '10px', fontSize: '0.8rem', boxShadow: '0 6px 16px rgba(0,0,0,0.08)' }} />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#6f0022"
                  strokeWidth={2.6}
                  dot={{ fill: '#e0bf63', r: 4, strokeWidth: 2, stroke: '#6f0022' }}
                  activeDot={{ r: 7, fill: '#6f0022', stroke: '#e0bf63', strokeWidth: 2.5 }}
                  name="LKR"
                />
              </LineChart>
            </ResponsiveContainer>
          </section>

          {/* Order Distribution (Donut) */}
          <section style={{
            background: '#fff',
            borderRadius: '20px',
            padding: '1.15rem 0.85rem',
            border: '1px solid #eef0f3',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
            marginBottom: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', margin: '0 0 0.85rem 0.25rem' }}>
              <div style={{
                width: '4px',
                height: '20px',
                background: 'linear-gradient(180deg, #6f0022, #e0bf63)',
                borderRadius: '4px'
              }} />
              <h3 style={{
                margin: 0,
                color: '#6f0022',
                fontSize: '1.05rem',
                fontFamily: 'Cormorant Garamond, serif',
                fontWeight: 600
              }}>
                Order Distribution
              </h3>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={chartData.orderStatusBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={78}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {chartData.orderStatusBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} stroke="#fff" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: '0.85rem', borderRadius: '10px', border: '1px solid #eef0f3', boxShadow: '0 6px 16px rgba(0,0,0,0.08)' }} />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  wrapperStyle={{ fontSize: '0.78rem', paddingTop: '0.4rem' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </section>

          {/* Loyalty Tiers */}
          <section style={{
            background: '#fff',
            borderRadius: '20px',
            padding: '1.15rem 0.85rem',
            border: '1px solid #eef0f3',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', margin: '0 0 0.85rem 0.25rem' }}>
              <div style={{
                width: '4px',
                height: '20px',
                background: 'linear-gradient(180deg, #6f0022, #e0bf63)',
                borderRadius: '4px'
              }} />
              <h3 style={{
                margin: 0,
                color: '#6f0022',
                fontSize: '1.05rem',
                fontFamily: 'Cormorant Garamond, serif',
                fontWeight: 600
              }}>
                Loyalty Tiers
              </h3>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData.loyaltyData} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} width={32} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #eef0f3', borderRadius: '10px', fontSize: '0.85rem', boxShadow: '0 6px 16px rgba(0,0,0,0.08)' }} />
                <Bar dataKey="value" radius={[10, 10, 0, 0]} name="Customers">
                  {chartData.loyaltyData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </section>
        </>
        )}

        {activeSection === 'banners' && (
          <>
            {/* Banners Hero */}
            <section style={{
              background: 'linear-gradient(135deg, #6f0022 0%, #8b0029 55%, #5a001b 100%)',
              borderRadius: '22px',
              padding: '1.4rem 1.15rem 1.5rem',
              marginBottom: '1rem',
              color: '#fff',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 12px 28px rgba(111, 0, 34, 0.28)'
            }}>
              <div style={{
                position: 'absolute',
                top: '-60px',
                right: '-50px',
                width: '180px',
                height: '180px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(224, 191, 99, 0.28), transparent 70%)',
                pointerEvents: 'none'
              }} />
              <div style={{
                position: 'absolute',
                bottom: '-70px',
                left: '-40px',
                width: '160px',
                height: '160px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(224, 191, 99, 0.14), transparent 70%)',
                pointerEvents: 'none'
              }} />

              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1rem' }}>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, #e0bf63 0%, #c9a352 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#3d2b00',
                    boxShadow: '0 6px 14px rgba(224, 191, 99, 0.45)',
                    flexShrink: 0
                  }}>
                    <FiBell size={22} strokeWidth={2.4} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      margin: 0,
                      fontSize: '0.7rem',
                      color: '#e0bf63',
                      letterSpacing: '0.7px',
                      textTransform: 'uppercase',
                      fontWeight: 600
                    }}>
                      Promotions
                    </p>
                    <h2 style={{
                      margin: '0.15rem 0 0',
                      fontFamily: 'Cormorant Garamond, serif',
                      fontSize: '1.4rem',
                      fontWeight: 700,
                      color: '#fff',
                      textShadow: '0 1px 2px rgba(0, 0, 0, 0.25)'
                    }}>
                      Site Banners
                    </h2>
                  </div>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '0.5rem',
                  marginBottom: '1rem'
                }}>
                  {[
                    { label: 'Total', value: banners.length, color: '#fff' },
                    { label: 'Active', value: banners.filter(b => b.isActive).length, color: '#86efac' },
                    { label: 'Inactive', value: banners.filter(b => !b.isActive).length, color: '#fcd34d' }
                  ].map((stat, idx) => (
                    <div key={idx} style={{
                      background: 'rgba(255, 255, 255, 0.09)',
                      backdropFilter: 'blur(10px)',
                      WebkitBackdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.16)',
                      borderRadius: '14px',
                      padding: '0.7rem 0.5rem',
                      textAlign: 'center'
                    }}>
                      <p style={{
                        margin: 0,
                        fontSize: '1.35rem',
                        fontWeight: 700,
                        fontFamily: '"Plus Jakarta Sans", "Inter", system-ui, sans-serif',
                        fontVariantNumeric: 'tabular-nums',
                        color: stat.color,
                        lineHeight: 1
                      }}>
                        {stat.value}
                      </p>
                      <p style={{
                        margin: '0.3rem 0 0',
                        fontSize: '0.65rem',
                        fontWeight: 600,
                        color: 'rgba(255, 255, 255, 0.85)',
                        letterSpacing: '0.5px',
                        textTransform: 'uppercase'
                      }}>
                        {stat.label}
                      </p>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => { setError(''); setBannerForm({ message: '', type: 'info', backgroundColor: '#fff3cd', textColor: '#856404', startDate: '', endDate: '', isActive: true }); setIsAddBannerModalOpen(true); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.55rem',
                    width: '100%',
                    background: 'linear-gradient(135deg, #e0bf63 0%, #c9a352 100%)',
                    color: '#3d2b00',
                    border: 'none',
                    padding: '0.9rem 1rem',
                    borderRadius: '14px',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    boxShadow: '0 8px 18px rgba(224, 191, 99, 0.35)',
                    letterSpacing: '0.3px'
                  }}
                >
                  <FiPlus size={20} strokeWidth={2.6} />
                  Create New Banner
                </button>
              </div>
            </section>

            {error && activeSection === 'banners' && (
              <div style={{
                background: '#fff5f5',
                color: '#991b1b',
                padding: '0.75rem 0.85rem',
                borderRadius: '12px',
                marginBottom: '1rem',
                borderLeft: '4px solid #dc2626',
                fontSize: '0.82rem',
                fontWeight: 500
              }}>
                {error}
              </div>
            )}

            {/* Banner List */}
            <section style={{
              background: '#fff',
              borderRadius: '20px',
              padding: '1.05rem 0.85rem',
              border: '1px solid #eef0f3',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.85rem', padding: '0 0.25rem' }}>
                <div style={{
                  width: '4px',
                  height: '20px',
                  background: 'linear-gradient(180deg, #6f0022, #e0bf63)',
                  borderRadius: '4px'
                }} />
                <h3 style={{
                  margin: 0,
                  color: '#6f0022',
                  fontSize: '1.05rem',
                  fontFamily: 'Cormorant Garamond, serif',
                  fontWeight: 600
                }}>
                  All Banners
                </h3>
                <span style={{
                  marginLeft: 'auto',
                  fontSize: '0.66rem',
                  color: '#94a3b8',
                  fontWeight: 600,
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase'
                }}>
                  {banners.length} {banners.length === 1 ? 'Banner' : 'Banners'}
                </span>
              </div>

              {banners.length === 0 ? (
                <div style={{
                  padding: '2.5rem 1rem',
                  textAlign: 'center',
                  border: '2px dashed #e5e7eb',
                  borderRadius: '16px',
                  background: '#fafbfc'
                }}>
                  <div style={{
                    width: '52px',
                    height: '52px',
                    margin: '0 auto 0.75rem',
                    borderRadius: '50%',
                    background: '#f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <FiBell size={24} color="#94a3b8" strokeWidth={2} />
                  </div>
                  <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: '#64748b' }}>
                    No banners yet
                  </p>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                    Create your first banner to start promoting on the home page.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {banners.map((banner) => {
                    const startLabel = banner.startDate ? new Date(banner.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Now';
                    const endLabel = banner.endDate ? new Date(banner.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '∞';
                    const busy = isBannerBusy === banner._id;
                    const typeConfig = banner.type === 'success'
                      ? { color: '#059669', bg: '#dcfce7' }
                      : banner.type === 'warning'
                        ? { color: '#b45309', bg: '#fef3c7' }
                        : banner.type === 'danger' || banner.type === 'error'
                          ? { color: '#dc2626', bg: '#fee2e2' }
                          : { color: '#0369a1', bg: '#e0f2fe' };

                    return (
                      <div
                        key={banner._id}
                        style={{
                          border: '1px solid #eef0f3',
                          borderRadius: '16px',
                          padding: '0.9rem',
                          background: '#fff',
                          position: 'relative',
                          overflow: 'hidden',
                          opacity: banner.isActive ? 1 : 0.78
                        }}
                      >
                        {/* Status accent bar */}
                        <div style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: '3px',
                          background: banner.isActive ? '#10b981' : '#cbd5e1'
                        }} />

                        {/* Live banner preview */}
                        <div style={{
                          background: banner.backgroundColor || '#fff3cd',
                          color: banner.textColor || '#856404',
                          padding: '0.85rem 1rem',
                          borderRadius: '12px',
                          fontSize: '0.88rem',
                          fontWeight: 600,
                          marginBottom: '0.8rem',
                          wordBreak: 'break-word',
                          lineHeight: 1.45,
                          position: 'relative',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '0.55rem'
                        }}>
                          <FiBell size={16} strokeWidth={2.4} style={{ flexShrink: 0, marginTop: '0.1rem', opacity: 0.85 }} />
                          <span style={{ flex: 1 }}>{banner.message}</span>
                        </div>

                        {/* Meta chips row */}
                        <div style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '0.4rem',
                          marginBottom: '0.8rem'
                        }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            background: typeConfig.bg,
                            color: typeConfig.color,
                            padding: '0.25rem 0.6rem',
                            borderRadius: '8px',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            letterSpacing: '0.3px',
                            textTransform: 'uppercase'
                          }}>
                            {banner.type}
                          </span>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            background: banner.isActive ? '#dcfce7' : '#f1f5f9',
                            color: banner.isActive ? '#166534' : '#64748b',
                            padding: '0.25rem 0.6rem',
                            borderRadius: '8px',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            letterSpacing: '0.3px',
                            textTransform: 'uppercase'
                          }}>
                            <span style={{
                              width: '5px',
                              height: '5px',
                              borderRadius: '50%',
                              background: banner.isActive ? '#22c55e' : '#94a3b8',
                              boxShadow: banner.isActive ? '0 0 0 2px rgba(34, 197, 94, 0.25)' : 'none'
                            }} />
                            {banner.isActive ? 'Live' : 'Off'}
                          </span>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            background: '#fafbfc',
                            color: '#64748b',
                            padding: '0.25rem 0.6rem',
                            borderRadius: '8px',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            border: '1px solid #eef0f3',
                            fontVariantNumeric: 'tabular-nums'
                          }}>
                            <FiClock size={11} strokeWidth={2.4} />
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
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.3rem',
                              padding: '0.6rem 0.4rem',
                              border: 'none',
                              background: banner.isActive
                                ? 'linear-gradient(135deg, #94a3b8, #64748b)'
                                : 'linear-gradient(135deg, #10b981, #059669)',
                              color: '#fff',
                              borderRadius: '10px',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              cursor: busy ? 'not-allowed' : 'pointer',
                              opacity: busy ? 0.55 : 1,
                              boxShadow: banner.isActive
                                ? '0 3px 8px rgba(100, 116, 139, 0.25)'
                                : '0 3px 8px rgba(16, 185, 129, 0.25)'
                            }}
                          >
                            {banner.isActive ? <FiSlash size={13} strokeWidth={2.4} /> : <FiCheck size={14} strokeWidth={2.6} />}
                            {banner.isActive ? 'Disable' : 'Enable'}
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditBannerModal(banner)}
                            disabled={busy}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.3rem',
                              padding: '0.6rem 0.4rem',
                              border: '1px solid #bae6fd',
                              background: '#f0f9ff',
                              color: '#0369a1',
                              borderRadius: '10px',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              cursor: busy ? 'not-allowed' : 'pointer',
                              opacity: busy ? 0.55 : 1
                            }}
                          >
                            <FiEdit2 size={13} strokeWidth={2.4} />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteBanner(banner._id)}
                            disabled={busy}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.3rem',
                              padding: '0.6rem 0.4rem',
                              border: '1px solid #fee2e2',
                              background: '#fff',
                              color: '#b91c1c',
                              borderRadius: '10px',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              cursor: busy ? 'not-allowed' : 'pointer',
                              opacity: busy ? 0.55 : 1
                            }}
                          >
                            <FiTrash2 size={13} strokeWidth={2.4} />
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

        {activeSection === 'customerInsights' && (() => {
          const totalLoyaltyMembers = customerInsights.loyaltyBreakdown.standard + customerInsights.loyaltyBreakdown.silver + customerInsights.loyaltyBreakdown.gold + customerInsights.loyaltyBreakdown.platinum;
          const totalTopSpenderRevenue = customerInsights.topSpenders.reduce((sum, c) => sum + (c.computedSpend || 0), 0);
          const topSpenderName = customerInsights.topSpenders[0]?.fullName?.split(' ')[0] || '—';

          return (
          <>
            {/* Insights Hero */}
            <section style={{
              background: 'linear-gradient(135deg, #6f0022 0%, #8b0029 55%, #5a001b 100%)',
              borderRadius: '22px',
              padding: '1.4rem 1.15rem 1.5rem',
              marginBottom: '1rem',
              color: '#fff',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 12px 28px rgba(111, 0, 34, 0.28)'
            }}>
              <div style={{
                position: 'absolute',
                top: '-60px',
                right: '-50px',
                width: '180px',
                height: '180px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(224, 191, 99, 0.28), transparent 70%)',
                pointerEvents: 'none'
              }} />
              <div style={{
                position: 'absolute',
                bottom: '-70px',
                left: '-40px',
                width: '160px',
                height: '160px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(224, 191, 99, 0.14), transparent 70%)',
                pointerEvents: 'none'
              }} />

              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1rem' }}>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, #e0bf63 0%, #c9a352 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#3d2b00',
                    boxShadow: '0 6px 14px rgba(224, 191, 99, 0.45)',
                    flexShrink: 0
                  }}>
                    <FiEye size={22} strokeWidth={2.4} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      margin: 0,
                      fontSize: '0.7rem',
                      color: '#e0bf63',
                      letterSpacing: '0.7px',
                      textTransform: 'uppercase',
                      fontWeight: 600
                    }}>
                      Analytics
                    </p>
                    <h2 style={{
                      margin: '0.15rem 0 0',
                      fontFamily: 'Cormorant Garamond, serif',
                      fontSize: '1.4rem',
                      fontWeight: 700,
                      color: '#fff',
                      textShadow: '0 1px 2px rgba(0, 0, 0, 0.25)'
                    }}>
                      Customer Insights
                    </h2>
                  </div>
                </div>

                {/* Top spender highlight */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.09)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  borderRadius: '16px',
                  padding: '0.95rem 1rem',
                  border: '1px solid rgba(255, 255, 255, 0.16)',
                  marginBottom: '0.55rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                    <p style={{
                      margin: 0,
                      fontSize: '0.72rem',
                      color: '#e0bf63',
                      letterSpacing: '0.7px',
                      textTransform: 'uppercase',
                      fontWeight: 700
                    }}>
                      Top Spender Revenue
                    </p>
                    <span style={{
                      background: 'rgba(224, 191, 99, 0.25)',
                      color: '#fff8e1',
                      padding: '0.22rem 0.6rem',
                      borderRadius: '999px',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      letterSpacing: '0.6px',
                      border: '1px solid rgba(224, 191, 99, 0.55)'
                    }}>
                      TOP 5
                    </span>
                  </div>
                  <h1 style={{
                    margin: '0.1rem 0 0',
                    fontSize: '1.95rem',
                    fontWeight: 800,
                    fontFamily: '"Plus Jakarta Sans", "Inter", system-ui, sans-serif',
                    fontVariantNumeric: 'tabular-nums',
                    letterSpacing: '-0.5px',
                    color: '#ffffff',
                    textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                    lineHeight: 1.1,
                    wordBreak: 'break-word'
                  }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#e0bf63', marginRight: '0.35rem', letterSpacing: '0.5px' }}>LKR</span>
                    {Math.round(totalTopSpenderRevenue).toLocaleString()}
                  </h1>
                  <p style={{
                    margin: '0.45rem 0 0',
                    fontSize: '0.75rem',
                    color: '#fff8e1',
                    fontWeight: 500
                  }}>
                    <span style={{ color: '#e0bf63', fontWeight: 700 }}>{totalLoyaltyMembers}</span> customers tracked · led by <span style={{ color: '#e0bf63', fontWeight: 700 }}>{topSpenderName}</span>
                  </p>
                </div>
              </div>
            </section>

            {/* Loyalty Breakdown */}
            <section style={{
              background: '#fff',
              borderRadius: '20px',
              padding: '1.05rem 0.85rem',
              border: '1px solid #eef0f3',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
              marginBottom: '1rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.85rem', padding: '0 0.25rem' }}>
                <div style={{
                  width: '4px',
                  height: '20px',
                  background: 'linear-gradient(180deg, #6f0022, #e0bf63)',
                  borderRadius: '4px'
                }} />
                <h3 style={{
                  margin: 0,
                  color: '#6f0022',
                  fontSize: '1.05rem',
                  fontFamily: 'Cormorant Garamond, serif',
                  fontWeight: 600
                }}>
                  Loyalty Breakdown
                </h3>
                <span style={{
                  marginLeft: 'auto',
                  fontSize: '0.66rem',
                  color: '#94a3b8',
                  fontWeight: 600,
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                  fontVariantNumeric: 'tabular-nums'
                }}>
                  {totalLoyaltyMembers} Total
                </span>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: '0.55rem'
              }}>
                {[
                  { label: 'Standard', value: customerInsights.loyaltyBreakdown.standard, color: '#6f0022', gradient: 'linear-gradient(135deg, #6f0022, #8b0029)', icon: FiUser },
                  { label: 'Silver', value: customerInsights.loyaltyBreakdown.silver, color: '#475569', gradient: 'linear-gradient(135deg, #94a3b8, #64748b)', icon: FiAward },
                  { label: 'Gold', value: customerInsights.loyaltyBreakdown.gold, color: '#b45309', gradient: 'linear-gradient(135deg, #d4a936, #b8881c)', icon: FiAward },
                  { label: 'Platinum', value: customerInsights.loyaltyBreakdown.platinum, color: '#3d5a80', gradient: 'linear-gradient(135deg, #3d5a80, #5a7ca8)', icon: FiAward }
                ].map((tier, idx) => {
                  const TierIcon = tier.icon;
                  const pct = totalLoyaltyMembers > 0 ? Math.round((tier.value / totalLoyaltyMembers) * 100) : 0;
                  return (
                    <div key={idx} style={{
                      background: 'linear-gradient(135deg, #fafbfc, #f4f6f9)',
                      border: '1px solid #eef0f3',
                      borderRadius: '14px',
                      padding: '0.85rem 0.75rem',
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        position: 'absolute',
                        right: '-15px',
                        bottom: '-15px',
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        background: `${tier.color}10`,
                        pointerEvents: 'none'
                      }} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem', position: 'relative' }}>
                        <div style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '10px',
                          background: tier.gradient,
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          boxShadow: `0 3px 8px ${tier.color}33`
                        }}>
                          <TierIcon size={15} strokeWidth={2.4} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{
                            margin: 0,
                            color: '#94a3b8',
                            fontSize: '0.62rem',
                            fontWeight: 600,
                            letterSpacing: '0.4px',
                            textTransform: 'uppercase'
                          }}>
                            {tier.label}
                          </p>
                          <p style={{
                            margin: '0.1rem 0 0',
                            color: '#1f2937',
                            fontSize: '1.15rem',
                            fontWeight: 700,
                            fontFamily: '"Plus Jakarta Sans", "Inter", system-ui, sans-serif',
                            fontVariantNumeric: 'tabular-nums',
                            letterSpacing: '-0.3px',
                            lineHeight: 1.1
                          }}>
                            {tier.value}
                          </p>
                        </div>
                      </div>
                      {/* Percentage bar */}
                      <div style={{ position: 'relative' }}>
                        <div style={{
                          height: '5px',
                          background: '#eef0f3',
                          borderRadius: '999px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            width: `${pct}%`,
                            height: '100%',
                            background: tier.gradient,
                            borderRadius: '999px',
                            transition: 'width 0.4s ease'
                          }} />
                        </div>
                        <p style={{
                          margin: '0.3rem 0 0',
                          fontSize: '0.66rem',
                          fontWeight: 600,
                          color: tier.color,
                          fontFamily: '"Plus Jakarta Sans", "Inter", system-ui, sans-serif',
                          fontVariantNumeric: 'tabular-nums'
                        }}>
                          {pct}% of total
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Top Spenders */}
            <section style={{
              background: '#fff',
              borderRadius: '20px',
              padding: '1.05rem 0.85rem',
              border: '1px solid #eef0f3',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.85rem', padding: '0 0.25rem' }}>
                <div style={{
                  width: '4px',
                  height: '20px',
                  background: 'linear-gradient(180deg, #6f0022, #e0bf63)',
                  borderRadius: '4px'
                }} />
                <h3 style={{
                  margin: 0,
                  color: '#6f0022',
                  fontSize: '1.05rem',
                  fontFamily: 'Cormorant Garamond, serif',
                  fontWeight: 600
                }}>
                  Top Spenders
                </h3>
                <span style={{
                  marginLeft: 'auto',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  background: 'linear-gradient(135deg, #e0bf63, #c9a352)',
                  color: '#3d2b00',
                  padding: '0.2rem 0.55rem',
                  borderRadius: '999px',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  letterSpacing: '0.4px',
                  textTransform: 'uppercase'
                }}>
                  <FiTrendingUp size={11} strokeWidth={2.6} />
                  Top {customerInsights.topSpenders.length}
                </span>
              </div>

              {customerInsights.topSpenders.length === 0 ? (
                <div style={{
                  padding: '2.5rem 1rem',
                  textAlign: 'center',
                  border: '2px dashed #e5e7eb',
                  borderRadius: '16px',
                  background: '#fafbfc'
                }}>
                  <div style={{
                    width: '52px',
                    height: '52px',
                    margin: '0 auto 0.75rem',
                    borderRadius: '50%',
                    background: '#f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <FiTrendingUp size={24} color="#94a3b8" strokeWidth={2} />
                  </div>
                  <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: '#64748b' }}>
                    No spender data yet
                  </p>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                    Insights will appear once orders come in.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                  {(() => {
                    const maxSpend = Math.max(...customerInsights.topSpenders.map(c => c.computedSpend || 0), 1);
                    return customerInsights.topSpenders.map((customer, idx) => {
                      const medalConfigs = [
                        { gradient: 'linear-gradient(135deg, #e0bf63, #c9a352)', shadow: 'rgba(224, 191, 99, 0.45)', label: '1st' },
                        { gradient: 'linear-gradient(135deg, #cbd5e1, #94a3b8)', shadow: 'rgba(148, 163, 184, 0.45)', label: '2nd' },
                        { gradient: 'linear-gradient(135deg, #cd7f32, #a0522d)', shadow: 'rgba(205, 127, 50, 0.45)', label: '3rd' }
                      ];
                      const medal = medalConfigs[idx];
                      const isPodium = idx < 3;
                      const pct = Math.round(((customer.computedSpend || 0) / maxSpend) * 100);

                      return (
                        <div key={customer._id} style={{
                          padding: '0.75rem 0.85rem',
                          background: isPodium ? 'linear-gradient(135deg, #fafbfc, #f4f6f9)' : '#fafbfc',
                          border: isPodium ? '1px solid #eef0f3' : '1px solid #eef0f3',
                          borderRadius: '14px',
                          position: 'relative',
                          overflow: 'hidden'
                        }}>
                          {isPodium && (
                            <div style={{
                              position: 'absolute',
                              left: 0,
                              top: 0,
                              bottom: 0,
                              width: '3px',
                              background: medal.gradient
                            }} />
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', marginBottom: '0.55rem' }}>
                            {isPodium ? (
                              <div style={{
                                width: '34px',
                                height: '34px',
                                borderRadius: '50%',
                                background: medal.gradient,
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.78rem',
                                fontWeight: 800,
                                fontFamily: '"Plus Jakarta Sans", "Inter", system-ui, sans-serif',
                                flexShrink: 0,
                                boxShadow: `0 4px 10px ${medal.shadow}`,
                                position: 'relative'
                              }}>
                                {idx + 1}
                                <div style={{
                                  position: 'absolute',
                                  top: '-3px',
                                  right: '-3px',
                                  width: '14px',
                                  height: '14px',
                                  borderRadius: '50%',
                                  background: '#fff',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  border: `2px solid ${idx === 0 ? '#e0bf63' : idx === 1 ? '#94a3b8' : '#cd7f32'}`
                                }}>
                                  <FiStar size={6} strokeWidth={3} fill={idx === 0 ? '#e0bf63' : idx === 1 ? '#94a3b8' : '#cd7f32'} color={idx === 0 ? '#e0bf63' : idx === 1 ? '#94a3b8' : '#cd7f32'} />
                                </div>
                              </div>
                            ) : (
                              <div style={{
                                width: '34px',
                                height: '34px',
                                borderRadius: '50%',
                                background: '#fff',
                                color: '#64748b',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                fontFamily: '"Plus Jakarta Sans", "Inter", system-ui, sans-serif',
                                flexShrink: 0,
                                border: '1.5px solid #e2e8f0'
                              }}>
                                {idx + 1}
                              </div>
                            )}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{
                                fontWeight: 700,
                                color: '#1f2937',
                                fontSize: '0.92rem',
                                fontFamily: '"Plus Jakarta Sans", "Inter", system-ui, sans-serif',
                                letterSpacing: '-0.2px',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}>
                                {customer.fullName || 'Unnamed'}
                              </div>
                              {customer.email && (
                                <div style={{
                                  fontSize: '0.72rem',
                                  color: '#94a3b8',
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
                              fontWeight: 800,
                              fontFamily: '"Plus Jakarta Sans", "Inter", system-ui, sans-serif',
                              fontVariantNumeric: 'tabular-nums',
                              letterSpacing: '-0.3px',
                              flexShrink: 0,
                              whiteSpace: 'nowrap',
                              textAlign: 'right'
                            }}>
                              <span style={{ fontSize: '0.6rem', fontWeight: 600, color: '#94a3b8', marginRight: '0.18rem', letterSpacing: '0.4px' }}>LKR</span>
                              {Math.round(customer.computedSpend || 0).toLocaleString()}
                            </div>
                          </div>
                          {/* Spend bar */}
                          <div style={{
                            height: '4px',
                            background: '#eef0f3',
                            borderRadius: '999px',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              width: `${pct}%`,
                              height: '100%',
                              background: isPodium ? medal.gradient : 'linear-gradient(90deg, #6f0022, #8b0029)',
                              borderRadius: '999px',
                              transition: 'width 0.4s ease'
                            }} />
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </section>
          </>
          );
        })()}

        {activeSection === 'staff' && (
        <section style={{
          background: 'linear-gradient(135deg, #6f0022 0%, #8b0029 55%, #5a001b 100%)',
          borderRadius: '22px',
          padding: '1.4rem 1.15rem 1.5rem',
          marginBottom: '1rem',
          color: '#fff',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 12px 28px rgba(111, 0, 34, 0.28)'
        }}>
          <div style={{
            position: 'absolute',
            top: '-60px',
            right: '-50px',
            width: '180px',
            height: '180px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(224, 191, 99, 0.28), transparent 70%)',
            pointerEvents: 'none'
          }} />
          <div style={{
            position: 'absolute',
            bottom: '-70px',
            left: '-40px',
            width: '160px',
            height: '160px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(224, 191, 99, 0.14), transparent 70%)',
            pointerEvents: 'none'
          }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1rem' }}>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #e0bf63 0%, #c9a352 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#3d2b00',
                boxShadow: '0 6px 14px rgba(224, 191, 99, 0.45)',
                flexShrink: 0
              }}>
                <FiUsers size={22} strokeWidth={2.4} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  margin: 0,
                  fontSize: '0.7rem',
                  color: '#e0bf63',
                  letterSpacing: '0.7px',
                  textTransform: 'uppercase',
                  fontWeight: 600
                }}>
                  Team
                </p>
                <h2 style={{
                  margin: '0.15rem 0 0',
                  fontFamily: 'Cormorant Garamond, serif',
                  fontSize: '1.4rem',
                  fontWeight: 700,
                  color: '#fff',
                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.25)'
                }}>
                  Staff Management
                </h2>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '0.5rem',
              marginBottom: '1rem'
            }}>
              {[
                { label: 'Total', value: staffList.length, color: '#fff' },
                { label: 'Approved', value: staffList.filter(s => s.status === 'Approved').length, color: '#86efac' },
                { label: 'Pending', value: staffList.filter(s => s.status === 'Pending').length, color: '#fcd34d' }
              ].map((stat, idx) => (
                <div key={idx} style={{
                  background: 'rgba(255, 255, 255, 0.09)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.16)',
                  borderRadius: '14px',
                  padding: '0.7rem 0.5rem',
                  textAlign: 'center'
                }}>
                  <p style={{
                    margin: 0,
                    fontSize: '1.35rem',
                    fontWeight: 700,
                    fontFamily: '"Plus Jakarta Sans", "Inter", system-ui, sans-serif',
                    fontVariantNumeric: 'tabular-nums',
                    color: stat.color,
                    lineHeight: 1
                  }}>
                    {stat.value}
                  </p>
                  <p style={{
                    margin: '0.3rem 0 0',
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    color: 'rgba(255, 255, 255, 0.85)',
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase'
                  }}>
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                setError('');
                setForm(emptyForm);
                setIsAddStaffModalOpen(true);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.55rem',
                width: '100%',
                background: 'linear-gradient(135deg, #e0bf63 0%, #c9a352 100%)',
                color: '#3d2b00',
                border: 'none',
                padding: '0.9rem 1rem',
                borderRadius: '14px',
                fontWeight: 700,
                fontSize: '0.95rem',
                cursor: 'pointer',
                boxShadow: '0 8px 18px rgba(224, 191, 99, 0.35)',
                letterSpacing: '0.3px'
              }}
            >
              <FiPlus size={20} strokeWidth={2.6} />
              Add Staff Member
            </button>
          </div>
        </section>
        )}

        {activeSection === 'staff' && isAddStaffModalOpen && (
          <div
            role="presentation"
            onClick={() => { if (!isSaving) setIsAddStaffModalOpen(false); }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(18, 18, 18, 0.65)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
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
              aria-labelledby="add-staff-title"
              onClick={(event) => event.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: '550px',
                maxHeight: '94vh',
                background: '#fff',
                borderRadius: '24px 24px 0 0',
                boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.28)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              {/* Sheet handle */}
              <div style={{ display: 'flex', justifyContent: 'center', padding: '0.55rem 0 0' }}>
                <div style={{ width: '42px', height: '4px', borderRadius: '2px', background: '#e5e7eb' }} />
              </div>

              {/* Hero Header */}
              <div style={{
                background: 'linear-gradient(135deg, #6f0022 0%, #8b0029 55%, #5a001b 100%)',
                padding: '1.1rem 1.1rem 1.25rem',
                color: '#fff',
                position: 'relative',
                overflow: 'hidden',
                flexShrink: 0
              }}>
                <div style={{
                  position: 'absolute',
                  top: '-50px',
                  right: '-40px',
                  width: '160px',
                  height: '160px',
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(224, 191, 99, 0.25), transparent 70%)',
                  pointerEvents: 'none'
                }} />

                <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #e0bf63 0%, #c9a352 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#3d2b00',
                    boxShadow: '0 5px 12px rgba(224, 191, 99, 0.4)',
                    flexShrink: 0
                  }}>
                    <FiUsers size={20} strokeWidth={2.4} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      margin: 0,
                      fontSize: '0.66rem',
                      color: '#e0bf63',
                      letterSpacing: '0.7px',
                      textTransform: 'uppercase',
                      fontWeight: 700
                    }}>
                      Team
                    </p>
                    <h3 id="add-staff-title" style={{
                      margin: '0.1rem 0 0',
                      color: '#fff',
                      fontSize: '1.15rem',
                      fontFamily: 'Cormorant Garamond, serif',
                      fontWeight: 700,
                      textShadow: '0 1px 2px rgba(0, 0, 0, 0.25)'
                    }}>
                      Add Staff Member
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => { if (!isSaving) setIsAddStaffModalOpen(false); }}
                    aria-label="Close add staff dialog"
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      border: '1px solid rgba(255, 255, 255, 0.25)',
                      background: 'rgba(255, 255, 255, 0.12)',
                      color: '#fff',
                      cursor: isSaving ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      backdropFilter: 'blur(6px)'
                    }}
                  >
                    <FiX size={18} strokeWidth={2.4} />
                  </button>
                </div>
              </div>

              {/* Form Content */}
              <form
                onSubmit={createStaff}
                style={{
                  padding: '1rem 1rem calc(1rem + env(safe-area-inset-bottom, 0px))',
                  background: '#fff',
                  overflowY: 'auto',
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem'
                }}
              >
                {error && (
                  <div style={{
                    background: '#fff5f5',
                    color: '#991b1b',
                    padding: '0.7rem 0.85rem',
                    borderRadius: '12px',
                    borderLeft: '4px solid #dc2626',
                    fontSize: '0.82rem',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <span style={{ fontSize: '1.05rem' }}>⚠</span>
                    {error}
                  </div>
                )}

                {/* Full Name */}
                <div>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    color: '#475569',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    marginBottom: '0.45rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    <FiUser size={12} strokeWidth={2.6} color="#6f0022" />
                    Full Name
                  </label>
                  <input
                    required
                    value={form.fullName}
                    onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
                    placeholder="e.g., John Doe"
                    style={{
                      width: '100%',
                      padding: '0.85rem 0.95rem',
                      border: '1px solid #e9ecef',
                      borderRadius: '12px',
                      fontSize: '0.95rem',
                      fontFamily: 'Poppins, sans-serif',
                      background: '#fafbfc',
                      outline: 'none',
                      transition: 'all 0.15s',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#6f0022';
                      e.target.style.background = '#fff';
                      e.target.style.boxShadow = '0 0 0 3px rgba(111, 0, 34, 0.08)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e9ecef';
                      e.target.style.background = '#fafbfc';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                {/* Email */}
                <div>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    color: '#475569',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    marginBottom: '0.45rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    <FiMail size={12} strokeWidth={2.6} color="#6f0022" />
                    Email Address
                  </label>
                  <input
                    required
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="john@example.com"
                    style={{
                      width: '100%',
                      padding: '0.85rem 0.95rem',
                      border: '1px solid #e9ecef',
                      borderRadius: '12px',
                      fontSize: '0.95rem',
                      fontFamily: 'Poppins, sans-serif',
                      background: '#fafbfc',
                      outline: 'none',
                      transition: 'all 0.15s',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#6f0022';
                      e.target.style.background = '#fff';
                      e.target.style.boxShadow = '0 0 0 3px rgba(111, 0, 34, 0.08)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e9ecef';
                      e.target.style.background = '#fafbfc';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                {/* Password */}
                <div>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    color: '#475569',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    marginBottom: '0.45rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    <FiShield size={12} strokeWidth={2.6} color="#6f0022" />
                    Password
                  </label>
                  <input
                    required
                    minLength={8}
                    type="password"
                    autoComplete="new-password"
                    value={form.password}
                    onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                    placeholder="Minimum 8 characters"
                    style={{
                      width: '100%',
                      padding: '0.85rem 0.95rem',
                      border: '1px solid #e9ecef',
                      borderRadius: '12px',
                      fontSize: '0.95rem',
                      fontFamily: 'Poppins, sans-serif',
                      background: '#fafbfc',
                      outline: 'none',
                      transition: 'all 0.15s',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#6f0022';
                      e.target.style.background = '#fff';
                      e.target.style.boxShadow = '0 0 0 3px rgba(111, 0, 34, 0.08)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e9ecef';
                      e.target.style.background = '#fafbfc';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                  <p style={{ margin: '0.4rem 0 0', color: '#94a3b8', fontSize: '0.72rem', fontWeight: 500 }}>
                    Must be at least 8 characters long
                  </p>
                </div>

                {/* Role - chip selector */}
                <div>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    color: '#475569',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    marginBottom: '0.5rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    <FiShield size={12} strokeWidth={2.6} color="#6f0022" />
                    Staff Role
                  </label>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    gap: '0.45rem'
                  }}>
                    {[
                      { value: 'Customer Care', color: '#0891b2' },
                      { value: 'Inventory', color: '#0d9488' },
                      { value: 'Order Management', color: '#7c3aed' },
                      { value: 'Product Management', color: '#2563eb' },
                      { value: 'Loyalty Management', color: '#d4a936' },
                      { value: 'Admin', color: '#6f0022' }
                    ].map((opt) => {
                      const selected = form.role === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setForm((prev) => ({ ...prev, role: opt.value }))}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '0.65rem 0.7rem',
                            border: selected ? `1.5px solid ${opt.color}` : '1px solid #e9ecef',
                            background: selected ? `${opt.color}10` : '#fafbfc',
                            color: selected ? opt.color : '#475569',
                            borderRadius: '12px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.15s',
                            outline: 'none',
                            boxShadow: selected ? `0 3px 8px ${opt.color}22` : 'none'
                          }}
                        >
                          <span style={{
                            width: '14px',
                            height: '14px',
                            borderRadius: '50%',
                            border: selected ? `4px solid ${opt.color}` : '2px solid #cbd5e1',
                            background: selected ? '#fff' : 'transparent',
                            flexShrink: 0,
                            transition: 'all 0.15s'
                          }} />
                          {opt.value}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Action Buttons - sticky bottom */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 2fr',
                  gap: '0.5rem',
                  marginTop: '0.5rem',
                  paddingTop: '0.85rem',
                  borderTop: '1px solid #f1f5f9'
                }}>
                  <button
                    type="button"
                    onClick={() => { if (!isSaving) setIsAddStaffModalOpen(false); }}
                    disabled={isSaving}
                    style={{
                      border: '1px solid #e9ecef',
                      color: '#475569',
                      background: '#fafbfc',
                      padding: '0.85rem 0.6rem',
                      fontSize: '0.9rem',
                      borderRadius: '12px',
                      fontWeight: 700,
                      cursor: isSaving ? 'not-allowed' : 'pointer',
                      opacity: isSaving ? 0.55 : 1
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.45rem',
                      background: isSaving ? '#c9c9c9' : 'linear-gradient(135deg, #6f0022, #8b0029)',
                      color: '#fff',
                      border: 'none',
                      padding: '0.85rem 0.6rem',
                      borderRadius: '12px',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      cursor: isSaving ? 'not-allowed' : 'pointer',
                      boxShadow: isSaving ? 'none' : '0 6px 14px rgba(111, 0, 34, 0.25)'
                    }}
                  >
                    <FiPlus size={16} strokeWidth={2.6} />
                    {isSaving ? 'Creating...' : 'Create Member'}
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
          borderRadius: '20px',
          padding: '1.05rem 0.85rem',
          border: '1px solid #eef0f3',
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.85rem', padding: '0 0.25rem' }}>
            <div style={{
              width: '4px',
              height: '20px',
              background: 'linear-gradient(180deg, #6f0022, #e0bf63)',
              borderRadius: '4px'
            }} />
            <h3 style={{
              margin: 0,
              color: '#6f0022',
              fontSize: '1.05rem',
              fontFamily: 'Cormorant Garamond, serif',
              fontWeight: 600
            }}>
              Staff Directory
            </h3>
            <span style={{
              marginLeft: 'auto',
              fontSize: '0.66rem',
              color: '#94a3b8',
              fontWeight: 600,
              letterSpacing: '0.5px',
              textTransform: 'uppercase'
            }}>
              {filteredList.length} {filteredList.length === 1 ? 'Member' : 'Members'}
            </span>
          </div>

          {/* Filter chips - horizontal scroll on mobile */}
          <div style={{
            display: 'flex',
            gap: '0.4rem',
            overflowX: 'auto',
            paddingBottom: '0.25rem',
            marginBottom: '0.85rem',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none'
          }}>
            {[
              { key: 'all', label: 'All', count: staffList.length },
              { key: 'Pending', label: 'Pending', count: staffList.filter(s => s.status === 'Pending').length },
              { key: 'Approved', label: 'Approved', count: staffList.filter(s => s.status === 'Approved').length },
              { key: 'Revoked', label: 'Revoked', count: staffList.filter(s => s.status === 'Revoked').length }
            ].map((chip) => {
              const isActive = statusFilter === chip.key;
              return (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => setStatusFilter(chip.key)}
                  style={{
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.5rem 0.85rem',
                    border: isActive ? '1px solid #6f0022' : '1px solid #e9ecef',
                    background: isActive ? 'linear-gradient(135deg, #6f0022, #8b0029)' : '#fafbfc',
                    color: isActive ? '#fff' : '#475569',
                    borderRadius: '999px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    boxShadow: isActive ? '0 4px 10px rgba(111, 0, 34, 0.2)' : 'none'
                  }}
                >
                  {chip.label}
                  <span style={{
                    background: isActive ? 'rgba(224, 191, 99, 0.25)' : '#e9ecef',
                    color: isActive ? '#e0bf63' : '#6b7280',
                    padding: '0.1rem 0.45rem',
                    borderRadius: '999px',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    fontVariantNumeric: 'tabular-nums'
                  }}>
                    {chip.count}
                  </span>
                </button>
              );
            })}
          </div>

          {error && (
            <div style={{
              background: '#fff5f5',
              color: '#991b1b',
              padding: '0.7rem 0.85rem',
              borderRadius: '12px',
              marginBottom: '0.85rem',
              borderLeft: '4px solid #dc2626',
              fontSize: '0.82rem',
              fontWeight: 500
            }}>
              {error}
            </div>
          )}

          {/* Staff Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {filteredList.map((item) => {
              const statusConfig = item.status === 'Approved'
                ? { bg: '#dcfce7', text: '#166534', dot: '#22c55e', label: 'Active' }
                : item.status === 'Pending'
                  ? { bg: '#fef3c7', text: '#92400e', dot: '#f59e0b', label: 'Pending' }
                  : { bg: '#fee2e2', text: '#991b1b', dot: '#dc2626', label: 'Revoked' };

              const roleColors = {
                'Admin': '#6f0022',
                'Customer Care': '#0891b2',
                'Inventory': '#0d9488',
                'Order Management': '#7c3aed',
                'Product Management': '#2563eb',
                'Loyalty Management': '#d4a936'
              };
              const roleColor = roleColors[item.role] || '#475569';
              const isBusy = busyId === item._id;

              return (
                <div
                  key={item._id}
                  style={{
                    border: '1px solid #eef0f3',
                    borderRadius: '16px',
                    padding: '0.9rem',
                    background: '#fff',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'transform 0.15s, box-shadow 0.15s'
                  }}
                >
                  {/* Left accent bar by role */}
                  <div style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: '3px',
                    background: roleColor
                  }} />

                  {/* Top: avatar + name + status pill */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.7rem', marginBottom: '0.7rem' }}>
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      background: `linear-gradient(135deg, ${roleColor} 0%, ${roleColor}dd 100%)`,
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.05rem',
                      fontWeight: 700,
                      flexShrink: 0,
                      boxShadow: `0 4px 10px ${roleColor}33`,
                      fontFamily: '"Plus Jakarta Sans", "Inter", system-ui, sans-serif'
                    }}>
                      {item.fullName?.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        flexWrap: 'wrap'
                      }}>
                        <div style={{
                          fontWeight: 700,
                          color: '#1f2937',
                          fontSize: '0.95rem',
                          fontFamily: '"Plus Jakarta Sans", "Inter", system-ui, sans-serif',
                          letterSpacing: '-0.2px'
                        }}>
                          {item.fullName}
                        </div>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          background: statusConfig.bg,
                          color: statusConfig.text,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '999px',
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          letterSpacing: '0.3px',
                          textTransform: 'uppercase'
                        }}>
                          <span style={{
                            width: '5px',
                            height: '5px',
                            borderRadius: '50%',
                            background: statusConfig.dot,
                            boxShadow: `0 0 0 2px ${statusConfig.dot}33`
                          }} />
                          {statusConfig.label}
                        </span>
                      </div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        marginTop: '0.25rem',
                        color: '#6b7280',
                        fontSize: '0.78rem',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        <FiMail size={12} strokeWidth={2.2} style={{ flexShrink: 0 }} />
                        <span style={{
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {item.email}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Role chip */}
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    background: `${roleColor}12`,
                    color: roleColor,
                    padding: '0.3rem 0.65rem',
                    borderRadius: '8px',
                    fontSize: '0.73rem',
                    fontWeight: 700,
                    marginBottom: '0.75rem',
                    border: `1px solid ${roleColor}25`
                  }}>
                    <FiShield size={12} strokeWidth={2.4} />
                    {item.role}
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem' }}>
                    {item.status !== 'Approved' ? (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => performAction(item._id, '/approve')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.3rem',
                          padding: '0.6rem 0.4rem',
                          border: 'none',
                          background: 'linear-gradient(135deg, #10b981, #059669)',
                          color: '#fff',
                          borderRadius: '10px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: isBusy ? 'not-allowed' : 'pointer',
                          opacity: isBusy ? 0.55 : 1,
                          boxShadow: '0 3px 8px rgba(16, 185, 129, 0.25)'
                        }}
                      >
                        <FiUserCheck size={14} strokeWidth={2.4} />
                        Approve
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => performAction(item._id, '/reject')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.3rem',
                          padding: '0.6rem 0.4rem',
                          border: '1px solid #fecaca',
                          background: '#fff',
                          color: '#dc2626',
                          borderRadius: '10px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: isBusy ? 'not-allowed' : 'pointer',
                          opacity: isBusy ? 0.55 : 1
                        }}
                      >
                        <FiSlash size={14} strokeWidth={2.4} />
                        Revoke
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => openEditStaffModal(item)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.3rem',
                        padding: '0.6rem 0.4rem',
                        border: '1px solid #bae6fd',
                        background: '#f0f9ff',
                        color: '#0369a1',
                        borderRadius: '10px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: isBusy ? 'not-allowed' : 'pointer',
                        opacity: isBusy ? 0.55 : 1
                      }}
                    >
                      <FiEdit2 size={13} strokeWidth={2.4} />
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => deleteStaff(item._id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.3rem',
                        padding: '0.6rem 0.4rem',
                        border: '1px solid #fee2e2',
                        background: '#fff',
                        color: '#b91c1c',
                        borderRadius: '10px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: isBusy ? 'not-allowed' : 'pointer',
                        opacity: isBusy ? 0.55 : 1
                      }}
                    >
                      <FiTrash2 size={13} strokeWidth={2.4} />
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredList.length === 0 && (
              <div style={{
                padding: '2.5rem 1rem',
                textAlign: 'center',
                color: '#9ca3af',
                border: '2px dashed #e5e7eb',
                borderRadius: '16px',
                background: '#fafbfc'
              }}>
                <div style={{
                  width: '52px',
                  height: '52px',
                  margin: '0 auto 0.75rem',
                  borderRadius: '50%',
                  background: '#f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <FiUsers size={24} color="#94a3b8" strokeWidth={2} />
                </div>
                <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: '#64748b' }}>
                  No staff members found
                </p>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                  {statusFilter === 'all' ? 'Add your first team member to get started.' : 'Try a different filter.'}
                </p>
              </div>
            )}
          </div>
        </section>
        )}

        {activeSection === 'customers' && (
        <>
          {/* Customers Hero */}
          <section style={{
            background: 'linear-gradient(135deg, #6f0022 0%, #8b0029 55%, #5a001b 100%)',
            borderRadius: '22px',
            padding: '1.4rem 1.15rem 1.5rem',
            marginBottom: '1rem',
            color: '#fff',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 12px 28px rgba(111, 0, 34, 0.28)'
          }}>
            <div style={{
              position: 'absolute',
              top: '-60px',
              right: '-50px',
              width: '180px',
              height: '180px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(224, 191, 99, 0.28), transparent 70%)',
              pointerEvents: 'none'
            }} />
            <div style={{
              position: 'absolute',
              bottom: '-70px',
              left: '-40px',
              width: '160px',
              height: '160px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(224, 191, 99, 0.14), transparent 70%)',
              pointerEvents: 'none'
            }} />

            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1rem' }}>
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #e0bf63 0%, #c9a352 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#3d2b00',
                  boxShadow: '0 6px 14px rgba(224, 191, 99, 0.45)',
                  flexShrink: 0
                }}>
                  <FiUser size={22} strokeWidth={2.4} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    margin: 0,
                    fontSize: '0.7rem',
                    color: '#e0bf63',
                    letterSpacing: '0.7px',
                    textTransform: 'uppercase',
                    fontWeight: 600
                  }}>
                    Audience
                  </p>
                  <h2 style={{
                    margin: '0.15rem 0 0',
                    fontFamily: 'Cormorant Garamond, serif',
                    fontSize: '1.4rem',
                    fontWeight: 700,
                    color: '#fff',
                    textShadow: '0 1px 2px rgba(0, 0, 0, 0.25)'
                  }}>
                    Customer Directory
                  </h2>
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '0.5rem'
              }}>
                {(() => {
                  const totalSpend = orders.reduce((sum, o) => sum + Number(o.total || 0), 0);
                  return [
                    { label: 'Total', value: customerList.length.toString(), color: '#fff' },
                    { label: 'Loyalty', value: customerList.filter(c => c.isLoyalty === true).length.toString(), color: '#e0bf63' },
                    { label: 'Revenue', value: `${(totalSpend / 1000).toFixed(0)}K`, color: '#86efac' }
                  ];
                })().map((stat, idx) => (
                  <div key={idx} style={{
                    background: 'rgba(255, 255, 255, 0.09)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.16)',
                    borderRadius: '14px',
                    padding: '0.7rem 0.5rem',
                    textAlign: 'center'
                  }}>
                    <p style={{
                      margin: 0,
                      fontSize: '1.35rem',
                      fontWeight: 700,
                      fontFamily: '"Plus Jakarta Sans", "Inter", system-ui, sans-serif',
                      fontVariantNumeric: 'tabular-nums',
                      color: stat.color,
                      lineHeight: 1
                    }}>
                      {stat.value}
                    </p>
                    <p style={{
                      margin: '0.3rem 0 0',
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      color: 'rgba(255, 255, 255, 0.85)',
                      letterSpacing: '0.5px',
                      textTransform: 'uppercase'
                    }}>
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Search + Filter */}
          <section style={{
            background: '#fff',
            borderRadius: '20px',
            padding: '1.05rem 0.85rem',
            border: '1px solid #eef0f3',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
            marginBottom: '1rem'
          }}>
            {/* Search */}
            <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
              <FiSearch
                size={16}
                color="#94a3b8"
                strokeWidth={2.4}
                style={{
                  position: 'absolute',
                  left: '0.85rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none'
                }}
              />
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
                value={customerSearchQuery}
                onChange={(e) => setCustomerSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '0.75rem 2.4rem 0.75rem 2.4rem',
                  border: '1px solid #e9ecef',
                  borderRadius: '12px',
                  fontSize: '0.9rem',
                  fontFamily: 'Poppins, sans-serif',
                  background: '#fafbfc',
                  outline: 'none',
                  transition: 'all 0.15s'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#6f0022';
                  e.target.style.background = '#fff';
                  e.target.style.boxShadow = '0 0 0 3px rgba(111, 0, 34, 0.08)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e9ecef';
                  e.target.style.background = '#fafbfc';
                  e.target.style.boxShadow = 'none';
                }}
              />
              {customerSearchQuery && (
                <button
                  type="button"
                  onClick={() => setCustomerSearchQuery('')}
                  aria-label="Clear search"
                  style={{
                    position: 'absolute',
                    right: '0.6rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    border: 'none',
                    background: '#e9ecef',
                    color: '#6b7280',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <FiX size={13} strokeWidth={2.6} />
                </button>
              )}
            </div>

            {/* Filter chips */}
            <div style={{
              display: 'flex',
              gap: '0.4rem',
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none'
            }}>
              {[
                { key: 'all', label: 'All', count: customerList.length, icon: FiUsers },
                { key: 'loyalty', label: 'Loyalty', count: customerList.filter(c => c.isLoyalty === true).length, icon: FiAward }
              ].map((chip) => {
                const isActive = customerLoyaltyFilter === chip.key;
                const ChipIcon = chip.icon;
                return (
                  <button
                    key={chip.key}
                    type="button"
                    onClick={() => setCustomerLoyaltyFilter(chip.key)}
                    style={{
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.5rem 0.85rem',
                      border: isActive ? '1px solid #6f0022' : '1px solid #e9ecef',
                      background: isActive ? 'linear-gradient(135deg, #6f0022, #8b0029)' : '#fafbfc',
                      color: isActive ? '#fff' : '#475569',
                      borderRadius: '999px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      boxShadow: isActive ? '0 4px 10px rgba(111, 0, 34, 0.2)' : 'none'
                    }}
                  >
                    <ChipIcon size={13} strokeWidth={2.4} />
                    {chip.label}
                    <span style={{
                      background: isActive ? 'rgba(224, 191, 99, 0.25)' : '#e9ecef',
                      color: isActive ? '#e0bf63' : '#6b7280',
                      padding: '0.1rem 0.45rem',
                      borderRadius: '999px',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      fontVariantNumeric: 'tabular-nums'
                    }}>
                      {chip.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* List */}
          <section style={{
            background: '#fff',
            borderRadius: '20px',
            padding: '1.05rem 0.85rem',
            border: '1px solid #eef0f3',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.85rem', padding: '0 0.25rem' }}>
              <div style={{
                width: '4px',
                height: '20px',
                background: 'linear-gradient(180deg, #6f0022, #e0bf63)',
                borderRadius: '4px'
              }} />
              <h3 style={{
                margin: 0,
                color: '#6f0022',
                fontSize: '1.05rem',
                fontFamily: 'Cormorant Garamond, serif',
                fontWeight: 600
              }}>
                Results
              </h3>
              <span style={{
                marginLeft: 'auto',
                fontSize: '0.66rem',
                color: '#94a3b8',
                fontWeight: 600,
                letterSpacing: '0.5px',
                textTransform: 'uppercase'
              }}>
                {filteredCustomers.length} {filteredCustomers.length === 1 ? 'Customer' : 'Customers'}
              </span>
            </div>

            {error && (
              <div style={{
                background: '#fff5f5',
                color: '#991b1b',
                padding: '0.7rem 0.85rem',
                borderRadius: '12px',
                marginBottom: '0.85rem',
                borderLeft: '4px solid #dc2626',
                fontSize: '0.82rem',
                fontWeight: 500
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {filteredCustomers && filteredCustomers.length > 0 ? (
                filteredCustomers.map((customer) => {
                  const customerOrderCount = orders.filter(order =>
                    String(order.customerId) === String(customer._id)
                  ).length;
                  const customerSpend = orders
                    .filter(order => String(order.customerId) === String(customer._id))
                    .reduce((sum, o) => sum + Number(o.total || 0), 0);
                  const tier = customer.loyaltyTier || 'Standard';
                  const tierConfig = tier === 'Platinum'
                    ? { color: '#3d5a80', bg: '#e0e7ff', gradient: 'linear-gradient(135deg, #3d5a80, #5a7ca8)' }
                    : tier === 'Gold'
                      ? { color: '#92400e', bg: '#fef3c7', gradient: 'linear-gradient(135deg, #d4a936, #b8881c)' }
                      : tier === 'Silver'
                        ? { color: '#475569', bg: '#f1f5f9', gradient: 'linear-gradient(135deg, #94a3b8, #64748b)' }
                        : { color: '#6f0022', bg: '#fce7eb', gradient: 'linear-gradient(135deg, #6f0022, #8b0029)' };
                  const isBusy = customerBusyId === customer._id;

                  return (
                    <div
                      key={customer._id}
                      style={{
                        border: '1px solid #eef0f3',
                        borderRadius: '16px',
                        padding: '0.9rem',
                        background: '#fff',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                    >
                      {/* Tier accent bar */}
                      <div style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: '3px',
                        background: tierConfig.color
                      }} />

                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.7rem', marginBottom: '0.7rem' }}>
                        <div style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '12px',
                          background: tierConfig.gradient,
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.05rem',
                          fontWeight: 700,
                          flexShrink: 0,
                          boxShadow: `0 4px 10px ${tierConfig.color}33`,
                          fontFamily: '"Plus Jakarta Sans", "Inter", system-ui, sans-serif',
                          position: 'relative'
                        }}>
                          {(customer.fullName || '?').charAt(0).toUpperCase()}
                          {customer.isLoyalty && (
                            <div style={{
                              position: 'absolute',
                              top: '-4px',
                              right: '-4px',
                              width: '18px',
                              height: '18px',
                              borderRadius: '50%',
                              background: '#e0bf63',
                              color: '#3d2b00',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: '2px solid #fff',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
                            }}>
                              <FiStar size={9} strokeWidth={3} fill="#3d2b00" />
                            </div>
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                            <div style={{
                              fontWeight: 700,
                              color: '#1f2937',
                              fontSize: '0.95rem',
                              fontFamily: '"Plus Jakarta Sans", "Inter", system-ui, sans-serif',
                              letterSpacing: '-0.2px'
                            }}>
                              {customer.fullName || 'N/A'}
                            </div>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              background: tierConfig.bg,
                              color: tierConfig.color,
                              padding: '0.15rem 0.5rem',
                              borderRadius: '999px',
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              letterSpacing: '0.3px',
                              textTransform: 'uppercase'
                            }}>
                              <FiAward size={9} strokeWidth={2.6} />
                              {tier}
                            </span>
                          </div>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            marginTop: '0.25rem',
                            color: '#6b7280',
                            fontSize: '0.78rem'
                          }}>
                            <FiMail size={12} strokeWidth={2.2} style={{ flexShrink: 0 }} />
                            <span style={{
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              {customer.email}
                            </span>
                          </div>
                          {customer.phone && (
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              marginTop: '0.2rem',
                              color: '#6b7280',
                              fontSize: '0.78rem'
                            }}>
                              <FiPhone size={12} strokeWidth={2.2} style={{ flexShrink: 0 }} />
                              <span>{customer.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Stats row */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: '0.45rem',
                        marginBottom: '0.7rem'
                      }}>
                        <div style={{
                          background: 'linear-gradient(135deg, #fafbfc, #f4f6f9)',
                          border: '1px solid #eef0f3',
                          borderRadius: '10px',
                          padding: '0.5rem 0.6rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}>
                          <div style={{
                            width: '26px',
                            height: '26px',
                            borderRadius: '7px',
                            background: '#0891b218',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <FiPackage size={13} color="#0891b2" strokeWidth={2.4} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <p style={{
                              margin: 0,
                              fontSize: '0.6rem',
                              color: '#94a3b8',
                              fontWeight: 600,
                              letterSpacing: '0.4px',
                              textTransform: 'uppercase'
                            }}>
                              Orders
                            </p>
                            <p style={{
                              margin: '0.05rem 0 0',
                              fontSize: '0.88rem',
                              fontWeight: 700,
                              color: '#1f2937',
                              fontFamily: '"Plus Jakarta Sans", "Inter", system-ui, sans-serif',
                              fontVariantNumeric: 'tabular-nums',
                              letterSpacing: '-0.2px',
                              lineHeight: 1.1
                            }}>
                              {customerOrderCount}
                            </p>
                          </div>
                        </div>
                        <div style={{
                          background: 'linear-gradient(135deg, #fafbfc, #f4f6f9)',
                          border: '1px solid #eef0f3',
                          borderRadius: '10px',
                          padding: '0.5rem 0.6rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}>
                          <div style={{
                            width: '26px',
                            height: '26px',
                            borderRadius: '7px',
                            background: '#10b98118',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <FiDollarSign size={13} color="#10b981" strokeWidth={2.4} />
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <p style={{
                              margin: 0,
                              fontSize: '0.6rem',
                              color: '#94a3b8',
                              fontWeight: 600,
                              letterSpacing: '0.4px',
                              textTransform: 'uppercase'
                            }}>
                              Spent
                            </p>
                            <p style={{
                              margin: '0.05rem 0 0',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              color: '#1f2937',
                              fontFamily: '"Plus Jakarta Sans", "Inter", system-ui, sans-serif',
                              fontVariantNumeric: 'tabular-nums',
                              letterSpacing: '-0.2px',
                              lineHeight: 1.1,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              <span style={{ fontSize: '0.55rem', fontWeight: 600, color: '#94a3b8', marginRight: '0.15rem' }}>LKR</span>
                              {Math.round(customerSpend).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.4rem' }}>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => openCustomerDetailsModal(customer)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.35rem',
                            padding: '0.6rem 0.4rem',
                            border: 'none',
                            background: 'linear-gradient(135deg, #6f0022, #8b0029)',
                            color: '#fff',
                            borderRadius: '10px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: isBusy ? 'not-allowed' : 'pointer',
                            opacity: isBusy ? 0.55 : 1,
                            boxShadow: '0 3px 8px rgba(111, 0, 34, 0.2)'
                          }}
                        >
                          <FiEye size={14} strokeWidth={2.4} />
                          View Details
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => deleteCustomer(customer._id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.3rem',
                            padding: '0.6rem 0.4rem',
                            border: '1px solid #fee2e2',
                            background: '#fff',
                            color: '#b91c1c',
                            borderRadius: '10px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: isBusy ? 'not-allowed' : 'pointer',
                            opacity: isBusy ? 0.55 : 1
                          }}
                        >
                          <FiTrash2 size={13} strokeWidth={2.4} />
                          {isBusy ? '...' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{
                  padding: '2.5rem 1rem',
                  textAlign: 'center',
                  border: '2px dashed #e5e7eb',
                  borderRadius: '16px',
                  background: '#fafbfc'
                }}>
                  <div style={{
                    width: '52px',
                    height: '52px',
                    margin: '0 auto 0.75rem',
                    borderRadius: '50%',
                    background: '#f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <FiSearch size={24} color="#94a3b8" strokeWidth={2} />
                  </div>
                  <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: '#64748b' }}>
                    {customerSearchQuery.trim() ? 'No matches found' : 'No customers yet'}
                  </p>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                    {customerSearchQuery.trim()
                      ? 'Try adjusting your search terms.'
                      : customerLoyaltyFilter === 'loyalty'
                        ? 'No loyalty customers found yet.'
                        : 'Customers will appear here once they sign up.'
                    }
                  </p>
                </div>
              )}
            </div>
          </section>
        </>
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
