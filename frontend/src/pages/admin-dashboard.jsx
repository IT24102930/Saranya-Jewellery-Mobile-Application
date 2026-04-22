import { useEffect, useMemo, useState } from 'react';
import { FiHome, FiUsers, FiTrendingUp, FiLogOut, FiEye, FiDollarSign, FiShield, FiBell, FiShoppingCart, FiPackage, FiCheck, FiClock, FiRefreshCw } from 'react-icons/fi';
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
    { key: 'revenueFilters', icon: FiDollarSign, label: 'Revenue' }
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#fafbfc' }}>
      {/* Sidebar */}
      <aside style={{
        width: '320px',
        background: '#6f0022',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        height: '100vh',
        left: 0,
        top: 0,
        zIndex: 100
      }}>
        {/* Sidebar Header */}
        <div style={{
          padding: '2rem 1.5rem 1.5rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <h1 style={{
            margin: 0,
            fontSize: '1.2rem',
            fontFamily: 'Cormorant Garamond, serif',
            fontWeight: 600,
            letterSpacing: '0.5px',
            color: '#e0bf63',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            textTransform: 'uppercase'
          }}>
            <FiShield size={28} />
            Admin Dashboard
          </h1>
        </div>

        {/* Navigation Items */}
        <nav style={{
          flex: 1,
          padding: '1.5rem 1rem',
          overflowY: 'auto'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {navItems.map((item) => {
              const isActive = activeSection === item.key;
              const IconComponent = item.icon;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveSection(item.key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    width: '100%',
                    padding: '1rem 1rem',
                    background: isActive ? '#e0bf63' : 'transparent',
                    color: isActive ? '#3d2b00' : '#fff',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '1.1rem',
                    fontFamily: 'Poppins, sans-serif',
                    fontWeight: isActive ? 600 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'rgba(224, 191, 99, 0.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <IconComponent size={24} style={{ minWidth: '24px' }} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* User Profile Section */}
        <div style={{
          padding: '1.5rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: '#e0bf63',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#3d2b00',
            flexShrink: 0
          }}>
            {staffUser.fullName?.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontWeight: 600,
              fontSize: '0.95rem',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              Hello, {staffUser.fullName?.split(' ')[0]}
            </div>
          </div>
          <button
            onClick={() => authManager.logout()}
            style={{
              background: isLogoutHovered ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.2)',
              color: '#fff',
              border: 'none',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem',
              transition: 'background 0.2s',
              flexShrink: 0
            }}
            title="Logout"
            onMouseEnter={() => setIsLogoutHovered(true)}
            onMouseLeave={() => setIsLogoutHovered(false)}
          >
            <FiLogOut size={20} />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{
        flex: 1,
        marginLeft: '320px',
        padding: '2rem',
        overflowY: 'auto'
      }}>

        {activeSection === 'analytics' && (
        <>
          {/* Revenue Trend Chart */}
          <section style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '2rem',
            border: '1px solid #e9ecef',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
            marginBottom: '2rem'
          }}>
            <h3 style={{ margin: '0 0 1.5rem', color: '#6f0022', fontSize: '1.3rem', fontFamily: 'Cormorant Garamond, serif', fontWeight: 600 }}>Revenue Trend (Last 7 Days)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData.revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
                <XAxis dataKey="date" stroke="#666" />
                <YAxis stroke="#666" />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e9ecef', borderRadius: '8px' }} />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#6f0022" strokeWidth={3} dot={{ fill: '#6f0022', r: 5 }} activeDot={{ r: 7 }} name="Daily Revenue (LKR)" />
              </LineChart>
            </ResponsiveContainer>
          </section>

          {/* Charts Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
            {/* Order Status Breakdown */}
            <section style={{
              background: '#fff',
              borderRadius: '12px',
              padding: '2rem',
              border: '1px solid #e9ecef',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
            }}>
              <h3 style={{ margin: '0 0 1.5rem', color: '#6f0022', fontSize: '1.2rem', fontFamily: 'Cormorant Garamond, serif', fontWeight: 600 }}>Order Status Distribution</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={chartData.orderStatusBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.orderStatusBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </section>

            {/* Loyalty Tier Distribution */}
            <section style={{
              background: '#fff',
              borderRadius: '12px',
              padding: '2rem',
              border: '1px solid #e9ecef',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
            }}>
              <h3 style={{ margin: '0 0 1.5rem', color: '#6f0022', fontSize: '1.2rem', fontFamily: 'Cormorant Garamond, serif', fontWeight: 600 }}>Customer Loyalty Tiers</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData.loyaltyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
                  <XAxis dataKey="name" stroke="#666" />
                  <YAxis stroke="#666" />
                  <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e9ecef', borderRadius: '8px' }} />
                  <Bar dataKey="value" fill="#6f0022" radius={[8, 8, 0, 0]} name="Customer Count" />
                </BarChart>
              </ResponsiveContainer>
            </section>
          </div>

          {/* Key Statistics */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1.5rem'
          }}>
            {[
              { label: 'Total Customers', value: stats.totalCustomers, color: '#6f0022', icon: FiUsers },
              { label: 'Total Products', value: stats.totalProducts, color: '#0066cc', icon: FiShoppingCart },
              { label: 'Total Orders', value: stats.totalOrders, color: '#28a745', icon: FiPackage },
              { label: 'Loyalty Members', value: stats.loyaltyMembers, color: '#e0bf63', icon: FiTrendingUp },
              { label: 'Total Income', value: `LKR ${(stats.totalIncome || 0).toLocaleString()}`, color: '#ffc107', icon: FiDollarSign },
              { label: 'This Month Income', value: `LKR ${(stats.monthIncome || 0).toLocaleString()}`, color: '#17a2b8', icon: FiDollarSign },
              { label: 'This Year Income', value: `LKR ${(stats.yearIncome || 0).toLocaleString()}`, color: '#6f0022', icon: FiDollarSign },
              { label: 'Completed Orders', value: stats.completedOrders, color: '#28a745', icon: FiCheck },
              { label: 'Pending Orders', value: stats.pendingOrders, color: '#ffc107', icon: FiClock },
            { label: 'Total Refunds', value: `LKR ${(stats.totalRefunds || 0).toLocaleString()}`, color: '#dc3545', icon: FiRefreshCw },
            { label: 'Gold Rate (Today)', value: `LKR ${(stats.goldRate || 0).toLocaleString()}/gram`, color: '#e0bf63', icon: FiTrendingUp },
            { label: 'Promotions Sent Today', value: stats.promotionsSentToday, color: '#ff6b6b', icon: FiBell }
          ].map((stat, idx) => {
            const IconComponent = stat.icon;
            return (
            <div
              key={idx}
              style={{
                background: '#fff',
                borderRadius: '14px',
                padding: '1.8rem',
                border: '1px solid #e9ecef',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-6px)';
                e.currentTarget.style.boxShadow = '0 12px 24px rgba(0, 0, 0, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)';
              }}
            >
              {/* Color accent top border */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '4px',
                background: stat.color,
                borderRadius: '14px 14px 0 0'
              }} />
              
              {/* Content */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <p style={{
                    margin: '0.5rem 0 0',
                    color: '#666',
                    fontSize: '0.95rem',
                    fontWeight: 500,
                    letterSpacing: '0.3px',
                    textTransform: 'uppercase'
                  }}>
                    {stat.label}
                  </p>
                  <h2 style={{
                    margin: '0.8rem 0 0',
                    color: stat.color,
                    fontSize: '1.8rem',
                    fontWeight: 700,
                    wordBreak: 'break-word',
                    lineHeight: 1.2
                  }}>
                    {stat.value}
                  </h2>
                </div>
                
                {/* Icon badge */}
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '14px',
                  background: `${stat.color}15`,
                  border: `2px solid ${stat.color}30`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <IconComponent size={28} color={stat.color} strokeWidth={2} />
                </div>
              </div>
            </div>
            );
          })}
          </div>
        </>
        )}

        {activeSection === 'banners' && (
          <>
            <section style={{
              background: '#fff',
              borderRadius: '12px',
              padding: '2rem',
              border: '1px solid #e9ecef',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
              marginBottom: '2rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <h3 style={{ margin: 0, color: '#6f0022', fontSize: '1.4rem', fontFamily: 'Cormorant Garamond, serif', fontWeight: 600 }}>Site Banners</h3>
                  <p style={{ margin: '0.35rem 0 0', color: '#666', fontSize: '0.95rem' }}>Manage promotional banners displayed on the home page.</p>
                </div>
                <button type="button" onClick={() => { setError(''); setBannerForm({ message: '', type: 'info', backgroundColor: '#fff3cd', textColor: '#856404', startDate: '', endDate: '' }); setIsAddBannerModalOpen(true); }} style={{ background: '#6f0022', color: '#fff', border: 'none', padding: '0.85rem 1.35rem', borderRadius: '999px', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', boxShadow: '0 8px 16px rgba(111, 0, 34, 0.18)', transition: 'transform 0.2s, background 0.2s' }} onMouseEnter={(e) => { e.target.style.background = '#4f0018'; e.target.style.transform = 'translateY(-1px)'; }} onMouseLeave={(e) => { e.target.style.background = '#6f0022'; e.target.style.transform = 'translateY(0)'; }}>Create Banner</button>
              </div>
            </section>

            {error && activeSection === 'banners' && (
              <div style={{ background: '#f8d7da', border: '1px solid #f5c6cb', color: '#721c24', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                {error}
              </div>
            )}

            <section style={{ background: '#fff', borderRadius: '12px', padding: '2rem', border: '1px solid #e9ecef', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
              <h4 style={{ margin: '0 0 1rem', color: '#333' }}>All Banners ({banners.length})</h4>
              
              {banners.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>
                  No banners yet. Create one to get started.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.92rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e9ecef', background: '#f8f9fa' }}>
                        <th style={{ padding: '1rem', textAlign: 'left', color: '#333', fontWeight: 600 }}>Message</th>
                        <th style={{ padding: '1rem', textAlign: 'left', color: '#333', fontWeight: 600 }}>Type</th>
                        <th style={{ padding: '1rem', textAlign: 'center', color: '#333', fontWeight: 600 }}>Active</th>
                        <th style={{ padding: '1rem', textAlign: 'left', color: '#333', fontWeight: 600 }}>Date Range</th>
                        <th style={{ padding: '1rem', textAlign: 'center', color: '#333', fontWeight: 600 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {banners.map((banner) => (
                        <tr key={banner._id} style={{ borderBottom: '1px solid #e9ecef', background: '#fff' }}>
                          <td style={{ padding: '1rem', color: '#333', maxWidth: '250px', wordBreak: 'break-word' }}>{banner.message}</td>
                          <td style={{ padding: '1rem' }}>
                            <span style={{ background: '#e7f3ff', color: '#0066cc', padding: '0.35rem 0.7rem', borderRadius: '4px', fontWeight: 600, fontSize: '0.8rem', display: 'inline-block' }}>
                              {banner.type}
                            </span>
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => toggleBannerActive(banner._id, banner.isActive)}
                              disabled={isBannerBusy === banner._id}
                              style={{
                                background: banner.isActive ? '#28a745' : '#dc3545',
                                color: '#fff',
                                border: 'none',
                                padding: '0.4rem 0.8rem',
                                borderRadius: '4px',
                                fontWeight: 600,
                                fontSize: '0.8rem',
                                cursor: isBannerBusy === banner._id ? 'not-allowed' : 'pointer',
                                opacity: isBannerBusy === banner._id ? 0.6 : 1,
                                transition: 'background 0.2s'
                              }}
                              title={banner.isActive ? 'Click to deactivate' : 'Click to activate'}
                            >
                              {banner.isActive ? 'Active' : 'Inactive'}
                            </button>
                          </td>
                          <td style={{ padding: '1rem', fontSize: '0.9rem', color: '#666' }}>
                            {banner.startDate ? new Date(banner.startDate).toLocaleDateString() : 'Now'} to {banner.endDate ? new Date(banner.endDate).toLocaleDateString() : 'No end'}
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'center' }}>
                            <button 
                              type="button" 
                              onClick={() => openEditBannerModal(banner)} 
                              disabled={isBannerBusy === banner._id} 
                              style={{ 
                                background: '#0066cc', 
                                color: '#fff', 
                                border: 'none', 
                                padding: '0.5rem 1rem', 
                                borderRadius: '4px', 
                                cursor: isBannerBusy === banner._id ? 'not-allowed' : 'pointer', 
                                marginRight: '0.5rem', 
                                fontSize: '0.85rem',
                                fontWeight: 500,
                                opacity: isBannerBusy === banner._id ? 0.6 : 1
                              }}
                            >
                              Edit
                            </button>
                            <button 
                              type="button" 
                              onClick={() => deleteBanner(banner._id)} 
                              disabled={isBannerBusy === banner._id} 
                              style={{ 
                                background: '#dc3545', 
                                color: '#fff', 
                                border: 'none', 
                                padding: '0.5rem 1rem', 
                                borderRadius: '4px', 
                                cursor: isBannerBusy === banner._id ? 'not-allowed' : 'pointer', 
                                fontSize: '0.85rem',
                                fontWeight: 500,
                                opacity: isBannerBusy === banner._id ? 0.6 : 1
                              }}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
          <section style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '2rem',
            border: '1px solid #e9ecef',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
          }}>
            <h3 style={{ margin: 0, color: '#6f0022', fontSize: '1.4rem', fontFamily: 'Cormorant Garamond, serif', fontWeight: 600 }}>
              Customer Insights Panel
            </h3>
            <p style={{ margin: '0.35rem 0 1.2rem', color: '#666', fontSize: '0.95rem' }}>
              Top spenders, loyalty split, and customers at risk of inactivity.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.9rem', marginBottom: '1rem' }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e9ecef', borderRadius: '10px', padding: '0.9rem' }}><strong>Standard:</strong> {customerInsights.loyaltyBreakdown.standard}</div>
              <div style={{ background: '#f8fafc', border: '1px solid #e9ecef', borderRadius: '10px', padding: '0.9rem' }}><strong>Silver:</strong> {customerInsights.loyaltyBreakdown.silver}</div>
              <div style={{ background: '#f8fafc', border: '1px solid #e9ecef', borderRadius: '10px', padding: '0.9rem' }}><strong>Gold:</strong> {customerInsights.loyaltyBreakdown.gold}</div>
              <div style={{ background: '#f8fafc', border: '1px solid #e9ecef', borderRadius: '10px', padding: '0.9rem' }}><strong>Platinum:</strong> {customerInsights.loyaltyBreakdown.platinum}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
              <div style={{ border: '1px solid #e9ecef', borderRadius: '10px', padding: '1rem' }}>
                <h4 style={{ margin: '0 0 0.8rem', color: '#6f0022' }}>Top Spenders</h4>
                {customerInsights.topSpenders.map((customer) => (
                  <div key={customer._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #f1f3f5' }}>
                    <span>{customer.fullName}</span>
                    <strong>LKR {Math.round(customer.computedSpend || 0).toLocaleString()}</strong>
                  </div>
                ))}
                {customerInsights.topSpenders.length === 0 && <p style={{ color: '#888', margin: 0 }}>No spender insights yet.</p>}
              </div>
            </div>
          </section>
        )}

        {activeSection === 'staff' && (
        <>
        {/* Create Staff Section */}
        <section style={{
          background: '#fff',
          borderRadius: '12px',
          padding: '2rem',
          border: '1px solid #e9ecef',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
          marginBottom: '2rem'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div>
              <h3 style={{
                margin: 0,
                color: '#6f0022',
                fontSize: '1.4rem',
                fontFamily: 'Cormorant Garamond, serif',
                fontWeight: 600
              }}>
                Staff Management
              </h3>
              <p style={{ margin: '0.35rem 0 0', color: '#666', fontSize: '0.95rem' }}>
                Add and manage staff accounts from one place.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setError('');
                setIsAddStaffModalOpen(true);
              }}
              style={{
                background: '#6f0022',
                color: '#fff',
                border: 'none',
                padding: '0.85rem 1.35rem',
                borderRadius: '999px',
                fontWeight: 700,
                fontSize: '0.95rem',
                cursor: 'pointer',
                boxShadow: '0 8px 16px rgba(111, 0, 34, 0.18)',
                transition: 'transform 0.2s, background 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#4f0018';
                e.target.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#6f0022';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              Add New Staff Member
            </button>
          </div>
        </section>
        </>
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
          borderRadius: '12px',
          padding: '2rem',
          border: '1px solid #e9ecef',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <h3 style={{
              margin: 0,
              color: '#6f0022',
              fontSize: '1.4rem',
              fontFamily: 'Cormorant Garamond, serif',
              fontWeight: 600
            }}>
              Staff Directory
            </h3>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '0.6rem 1rem',
                border: '1px solid #dee2e6',
                borderRadius: '6px',
                fontSize: '0.95rem',
                fontFamily: 'Poppins, sans-serif',
                background: '#fff',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Staff</option>
              <option value="Pending">Pending Approval</option>
              <option value="Approved">Approved</option>
              <option value="Revoked">Revoked</option>
            </select>
          </div>

          {error && (
            <div style={{
              background: '#f8d7da',
              color: '#721c24',
              padding: '1rem',
              borderRadius: '6px',
              marginBottom: '1.5rem',
              borderLeft: '4px solid #dc3545'
            }}>
              {error}
            </div>
          )}

          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.95rem'
            }}>
              <thead>
                <tr style={{
                  borderBottom: '2px solid #e9ecef',
                  background: '#f8f9fa'
                }}>
                  <th style={{
                    padding: '1rem',
                    textAlign: 'left',
                    color: '#333',
                    fontWeight: 600,
                    fontSize: '0.9rem'
                  }}>
                    Name
                  </th>
                  <th style={{
                    padding: '1rem',
                    textAlign: 'left',
                    color: '#333',
                    fontWeight: 600,
                    fontSize: '0.9rem'
                  }}>
                    Role
                  </th>
                  <th style={{
                    padding: '1rem',
                    textAlign: 'left',
                    color: '#333',
                    fontWeight: 600,
                    fontSize: '0.9rem'
                  }}>
                    Status
                  </th>
                  <th style={{
                    padding: '1rem',
                    textAlign: 'left',
                    color: '#333',
                    fontWeight: 600,
                    fontSize: '0.9rem'
                  }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((item) => (
                  <tr
                    key={item._id}
                    style={{
                      borderBottom: '1px solid #e9ecef',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8f9fa'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
                  >
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: 500, color: '#333' }}>{item.fullName}</div>
                      <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.2rem' }}>
                        {item.email}
                      </div>
                    </td>
                    <td style={{ padding: '1rem', color: '#555' }}>
                      <span style={{
                        background: '#e9ecef',
                        padding: '0.3rem 0.7rem',
                        borderRadius: '4px',
                        fontSize: '0.85rem',
                        fontWeight: 500
                      }}>
                        {item.role}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        background: item.status === 'Approved' ? '#d4edda' : item.status === 'Pending' ? '#fff3cd' : '#f8d7da',
                        color: item.status === 'Approved' ? '#155724' : item.status === 'Pending' ? '#856404' : '#721c24',
                        padding: '0.3rem 0.7rem',
                        borderRadius: '4px',
                        fontSize: '0.85rem',
                        fontWeight: 500
                      }}>
                        {item.status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{
                        display: 'flex',
                        gap: '0.5rem',
                        flexWrap: 'wrap'
                      }}>
                        {item.status !== 'Approved' && (
                          <button
                            disabled={busyId === item._id}
                            onClick={() => performAction(item._id, '/approve')}
                            style={{
                              padding: '0.4rem 0.8rem',
                              border: '1px solid #28a745',
                              background: '#fff',
                              color: '#28a745',
                              borderRadius: '4px',
                              fontSize: '0.8rem',
                              fontWeight: 500,
                              cursor: busyId === item._id ? 'not-allowed' : 'pointer',
                              opacity: busyId === item._id ? 0.6 : 1,
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => !busyId && (e.target.style.background = '#28a745', e.target.style.color = '#fff')}
                            onMouseLeave={(e) => !busyId && (e.target.style.background = '#fff', e.target.style.color = '#28a745')}
                          >
                            Approve
                          </button>
                        )}
                        {item.status === 'Approved' && (
                          <button
                            disabled={busyId === item._id}
                            onClick={() => performAction(item._id, '/reject')}
                            style={{
                              padding: '0.4rem 0.8rem',
                              border: '1px solid #dc3545',
                              background: '#fff',
                              color: '#dc3545',
                              borderRadius: '4px',
                              fontSize: '0.8rem',
                              fontWeight: 500,
                              cursor: busyId === item._id ? 'not-allowed' : 'pointer',
                              opacity: busyId === item._id ? 0.6 : 1,
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => !busyId && (e.target.style.background = '#dc3545', e.target.style.color = '#fff')}
                            onMouseLeave={(e) => !busyId && (e.target.style.background = '#fff', e.target.style.color = '#dc3545')}
                          >
                            Reject
                          </button>
                        )}
                        <button
                          disabled={busyId === item._id}
                          onClick={() => openEditStaffModal(item)}
                          style={{
                            padding: '0.4rem 0.8rem',
                            border: '1px solid #0ea5e9',
                            background: '#fff',
                            color: '#0ea5e9',
                            borderRadius: '4px',
                            fontSize: '0.8rem',
                            fontWeight: 500,
                            cursor: busyId === item._id ? 'not-allowed' : 'pointer',
                            opacity: busyId === item._id ? 0.6 : 1,
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => !busyId && (e.target.style.background = '#0ea5e9', e.target.style.color = '#fff')}
                          onMouseLeave={(e) => !busyId && (e.target.style.background = '#fff', e.target.style.color = '#0ea5e9')}
                        >
                          Edit
                        </button>
                        <button
                          disabled={busyId === item._id}
                          onClick={() => deleteStaff(item._id)}
                          style={{
                            padding: '0.4rem 0.8rem',
                            border: '1px solid #999',
                            background: '#fff',
                            color: '#999',
                            borderRadius: '4px',
                            fontSize: '0.8rem',
                            fontWeight: 500,
                            cursor: busyId === item._id ? 'not-allowed' : 'pointer',
                            opacity: busyId === item._id ? 0.6 : 1,
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => !busyId && (e.target.style.background = '#999', e.target.style.color = '#fff')}
                          onMouseLeave={(e) => !busyId && (e.target.style.background = '#fff', e.target.style.color = '#999')}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredList.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{
                      padding: '2rem 1rem',
                      textAlign: 'center',
                      color: '#999'
                    }}>
                      No staff members found for the selected filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        )}

        {activeSection === 'customers' && (
        <section style={{
          background: '#fff',
          borderRadius: '12px',
          padding: '2rem',
          border: '1px solid #e9ecef',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
          marginTop: '2rem'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <h3 style={{
              margin: 0,
              color: '#6f0022',
              fontSize: '1.4rem',
              fontFamily: 'Cormorant Garamond, serif',
              fontWeight: 600
            }}>
              Customers
            </h3>
            <div style={{
              display: 'flex',
              gap: '1rem',
              flexWrap: 'wrap',
              alignItems: 'center'
            }}>
              <select
                value={customerLoyaltyFilter}
                onChange={(e) => setCustomerLoyaltyFilter(e.target.value)}
                style={{
                  padding: '0.6rem 1rem',
                  border: '1px solid #dee2e6',
                  borderRadius: '6px',
                  fontSize: '0.95rem',
                  fontFamily: 'Poppins, sans-serif',
                  background: '#fff',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#6f0022'}
                onBlur={(e) => e.target.style.borderColor = '#dee2e6'}
              >
                <option value="all">All Customers</option>
                <option value="loyalty">Loyalty Customers</option>
              </select>
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
                value={customerSearchQuery}
                onChange={(e) => setCustomerSearchQuery(e.target.value)}
                style={{
                  padding: '0.6rem 1rem',
                  border: '1px solid #dee2e6',
                  borderRadius: '6px',
                  fontSize: '0.95rem',
                  fontFamily: 'Poppins, sans-serif',
                  background: '#fff',
                  flex: '0 1 300px',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#6f0022'}
                onBlur={(e) => e.target.style.borderColor = '#dee2e6'}
              />
            </div>
          </div>

          {error && (
            <div style={{
              background: '#f8d7da',
              color: '#721c24',
              padding: '1rem',
              borderRadius: '6px',
              marginBottom: '1.5rem',
              borderLeft: '4px solid #dc3545'
            }}>
              {error}
            </div>
          )}

          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.95rem'
            }}>
              <thead>
                <tr style={{
                  borderBottom: '2px solid #e9ecef',
                  background: '#f8f9fa'
                }}>
                  <th style={{
                    padding: '1rem',
                    textAlign: 'left',
                    color: '#333',
                    fontWeight: 600,
                    fontSize: '0.9rem'
                  }}>
                    Customer Name
                  </th>
                  <th style={{
                    padding: '1rem',
                    textAlign: 'left',
                    color: '#333',
                    fontWeight: 600,
                    fontSize: '0.9rem'
                  }}>
                    Email
                  </th>
                  <th style={{
                    padding: '1rem',
                    textAlign: 'left',
                    color: '#333',
                    fontWeight: 600,
                    fontSize: '0.9rem'
                  }}>
                    Orders
                  </th>
                  <th style={{
                    padding: '1rem',
                    textAlign: 'left',
                    color: '#333',
                    fontWeight: 600,
                    fontSize: '0.9rem'
                  }}>
                    Loyalty Tier
                  </th>
                  <th style={{
                    padding: '1rem',
                    textAlign: 'left',
                    color: '#333',
                    fontWeight: 600,
                    fontSize: '0.9rem'
                  }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers && filteredCustomers.length > 0 ? (
                  filteredCustomers.map((customer) => {
                    const customerOrderCount = orders.filter(order => 
                      String(order.customerId) === String(customer._id)
                    ).length;

                    return (
                      <tr
                        key={customer._id}
                        style={{
                          borderBottom: '1px solid #e9ecef',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f8f9fa'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
                      >
                        <td style={{ padding: '1rem' }}>
                          <div style={{ fontWeight: 500, color: '#333' }}>{customer.fullName || 'N/A'}</div>
                        </td>
                        <td style={{ padding: '1rem', color: '#555' }}>
                          {customer.email}
                        </td>
                        <td style={{ padding: '1rem', color: '#333', fontWeight: 600 }}>
                          {customerOrderCount}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{
                            background: '#e9ecef',
                            padding: '0.3rem 0.7rem',
                            borderRadius: '4px',
                            fontSize: '0.85rem',
                            fontWeight: 500
                          }}>
                            {customer.loyaltyTier || 'Standard'}
                          </span>
                        </td>
                        <td style={{ padding: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button
                            disabled={customerBusyId === customer._id}
                            onClick={() => openCustomerDetailsModal(customer)}
                            title="View full customer details"
                            style={{
                              padding: '0.4rem 0.8rem',
                              border: '1px solid #0066cc',
                              background: '#fff',
                              color: '#0066cc',
                              borderRadius: '4px',
                              fontSize: '0.8rem',
                              fontWeight: 500,
                              cursor: customerBusyId === customer._id ? 'not-allowed' : 'pointer',
                              opacity: customerBusyId === customer._id ? 0.6 : 1,
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => !customerBusyId && (e.target.style.background = '#0066cc', e.target.style.color = '#fff')}
                            onMouseLeave={(e) => !customerBusyId && (e.target.style.background = '#fff', e.target.style.color = '#0066cc')}
                          >
                            Info
                          </button>
                          <button
                            disabled={customerBusyId === customer._id}
                            onClick={() => deleteCustomer(customer._id)}
                            style={{
                              padding: '0.4rem 0.8rem',
                              border: '1px solid #dc3545',
                              background: '#fff',
                              color: '#dc3545',
                              borderRadius: '4px',
                              fontSize: '0.8rem',
                              fontWeight: 500,
                              cursor: customerBusyId === customer._id ? 'not-allowed' : 'pointer',
                              opacity: customerBusyId === customer._id ? 0.6 : 1,
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => !customerBusyId && (e.target.style.background = '#dc3545', e.target.style.color = '#fff')}
                            onMouseLeave={(e) => !customerBusyId && (e.target.style.background = '#fff', e.target.style.color = '#dc3545')}
                          >
                            {customerBusyId === customer._id ? 'Deleting...' : 'Delete'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} style={{
                      padding: '2rem 1rem',
                      textAlign: 'center',
                      color: '#999'
                    }}>
                      {customerSearchQuery.trim() 
                        ? 'No customers match your search.' 
                        : customerLoyaltyFilter === 'loyalty'
                          ? 'No loyalty customers found.'
                          : 'No customers found.'
                      }
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
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
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem',
              zIndex: 1000,
              overflowY: 'auto'
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              onClick={(event) => event.stopPropagation()}
              style={{
                width: 'min(100%, 550px)',
                maxHeight: '90vh',
                background: '#fff',
                borderRadius: '24px',
                border: '1px solid #eadfd6',
                boxShadow: '0 24px 60px rgba(0, 0, 0, 0.28)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              {/* Modal Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'start',
                gap: '1rem',
                padding: '2rem',
                borderBottom: '1px solid #f1e8ea',
                background: '#f9f7f4',
                flexShrink: 0
              }}>
                <div>
                  <h2 style={{
                    margin: 0,
                    color: '#6f0022',
                    fontSize: '1.8rem',
                    fontFamily: 'Cormorant Garamond, serif',
                    fontWeight: 600
                  }}>
                    {selectedCustomerDetails.fullName}
                  </h2>
                  <p style={{ margin: '0.5rem 0 0', color: '#666', fontSize: '0.95rem' }}>
                    Customer ID: {selectedCustomerDetails._id}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeCustomerDetailsModal}
                  aria-label="Close customer details dialog"
                  style={{
                    width: '2.9rem',
                    height: '2.9rem',
                    borderRadius: '50%',
                    border: '1px solid #eadfd6',
                    background: '#fff',
                    color: '#6f0022',
                    fontSize: '1.45rem',
                    lineHeight: 1,
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#f1e8ea'}
                  onMouseLeave={(e) => e.target.style.background = '#fff'}
                >
                  ×
                </button>
              </div>

              {/* Modal Content */}
              <div style={{ padding: '2rem', maxHeight: '70vh', overflowY: 'auto' }}>
                {customerDetailsError && (
                  <div style={{
                    background: '#f8d7da',
                    color: '#721c24',
                    padding: '1rem',
                    borderRadius: '8px',
                    marginBottom: '1.5rem',
                    border: '1px solid #f1b0b7'
                  }}>
                    {customerDetailsError}
                  </div>
                )}

                {isLoadingCustomerDetails ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                    Loading customer details...
                  </div>
                ) : (
                  <>
                    {/* Personal Information Section */}
                    <div style={{ marginBottom: '2rem' }}>
                      <h3 style={{
                        margin: '0 0 1rem',
                        color: '#6f0022',
                        fontSize: '1.2rem',
                        fontFamily: 'Cormorant Garamond, serif',
                        fontWeight: 600,
                        borderBottom: '2px solid #e0bf63',
                        paddingBottom: '0.5rem'
                      }}>
                        Personal Information
                      </h3>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                          <p style={{ margin: '0 0 0.3rem', color: '#666', fontSize: '0.9rem', fontWeight: 500, textTransform: 'uppercase' }}>Full Name</p>
                          <p style={{ margin: 0, color: '#333', fontSize: '1rem', fontWeight: 500 }}>{selectedCustomerDetails.fullName}</p>
                        </div>
                        <div>
                          <p style={{ margin: '0 0 0.3rem', color: '#666', fontSize: '0.9rem', fontWeight: 500, textTransform: 'uppercase' }}>Email</p>
                          <p style={{ margin: 0, color: '#333', fontSize: '1rem', wordBreak: 'break-all' }}>{selectedCustomerDetails.email}</p>
                        </div>
                        <div>
                          <p style={{ margin: '0 0 0.3rem', color: '#666', fontSize: '0.9rem', fontWeight: 500, textTransform: 'uppercase' }}>Phone</p>
                          <p style={{ margin: 0, color: '#333', fontSize: '1rem' }}>{selectedCustomerDetails.phone || 'N/A'}</p>
                        </div>
                        <div>
                          <p style={{ margin: '0 0 0.3rem', color: '#666', fontSize: '0.9rem', fontWeight: 500, textTransform: 'uppercase' }}>Registered Date</p>
                          <p style={{ margin: 0, color: '#333', fontSize: '1rem' }}>
                            {selectedCustomerDetails.registeredDate 
                              ? new Date(selectedCustomerDetails.registeredDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                              : 'N/A'
                            }
                          </p>
                        </div>
                      </div>
                      {selectedCustomerDetails.address && (
                        <div style={{ marginTop: '1rem' }}>
                          <p style={{ margin: '0 0 0.3rem', color: '#666', fontSize: '0.9rem', fontWeight: 500, textTransform: 'uppercase' }}>Address</p>
                          <p style={{ margin: 0, color: '#333', fontSize: '1rem' }}>
                            {selectedCustomerDetails.address.street}, {selectedCustomerDetails.address.city}, {selectedCustomerDetails.address.state} {selectedCustomerDetails.address.zipCode}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Order Summary Section */}
                    <div style={{ marginBottom: '2rem' }}>
                      <h3 style={{
                        margin: '0 0 1rem',
                        color: '#6f0022',
                        fontSize: '1.2rem',
                        fontFamily: 'Cormorant Garamond, serif',
                        fontWeight: 600,
                        borderBottom: '2px solid #e0bf63',
                        paddingBottom: '0.5rem'
                      }}>
                        Order Summary
                      </h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                        <div style={{
                          background: '#f8fafc',
                          border: '1px solid #e9ecef',
                          borderRadius: '10px',
                          padding: '1rem',
                          textAlign: 'center'
                        }}>
                          <p style={{ margin: '0 0 0.5rem', color: '#666', fontSize: '0.9rem', fontWeight: 500 }}>Total Orders</p>
                          <p style={{ margin: 0, color: '#0066cc', fontSize: '1.8rem', fontWeight: 700 }}>{selectedCustomerDetails.orderCount}</p>
                        </div>
                        <div style={{
                          background: '#f8fafc',
                          border: '1px solid #e9ecef',
                          borderRadius: '10px',
                          padding: '1rem',
                          textAlign: 'center'
                        }}>
                          <p style={{ margin: '0 0 0.5rem', color: '#666', fontSize: '0.9rem', fontWeight: 500 }}>Total Spent</p>
                          <p style={{ margin: 0, color: '#28a745', fontSize: '1.8rem', fontWeight: 700 }}>LKR {Math.round(selectedCustomerDetails.totalSpent).toLocaleString()}</p>
                        </div>
                        <div style={{
                          background: '#f8fafc',
                          border: '1px solid #e9ecef',
                          borderRadius: '10px',
                          padding: '1rem',
                          textAlign: 'center'
                        }}>
                          <p style={{ margin: '0 0 0.5rem', color: '#666', fontSize: '0.9rem', fontWeight: 500 }}>Avg. Order Value</p>
                          <p style={{ margin: 0, color: '#6f0022', fontSize: '1.8rem', fontWeight: 700 }}>
                            LKR {selectedCustomerDetails.orderCount > 0 ? Math.round(selectedCustomerDetails.totalSpent / selectedCustomerDetails.orderCount).toLocaleString() : '0'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Loyalty Program Section */}
                    <div style={{ marginBottom: '2rem' }}>
                      <h3 style={{
                        margin: '0 0 1rem',
                        color: '#6f0022',
                        fontSize: '1.2rem',
                        fontFamily: 'Cormorant Garamond, serif',
                        fontWeight: 600,
                        borderBottom: '2px solid #e0bf63',
                        paddingBottom: '0.5rem'
                      }}>
                        Loyalty Program
                      </h3>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div style={{
                          background: '#f8fafc',
                          border: '1px solid #e9ecef',
                          borderRadius: '10px',
                          padding: '1rem'
                        }}>
                          <p style={{ margin: '0 0 0.5rem', color: '#666', fontSize: '0.9rem', fontWeight: 500, textTransform: 'uppercase' }}>Loyalty Tier</p>
                          <p style={{ 
                            margin: 0, 
                            color: '#6f0022', 
                            fontSize: '1.3rem', 
                            fontWeight: 700,
                            background: selectedCustomerDetails.loyaltyTierStatus === 'Platinum' ? '#3d5a80' : 
                                        selectedCustomerDetails.loyaltyTierStatus === 'Gold' ? '#e0bf63' :
                                        selectedCustomerDetails.loyaltyTierStatus === 'Silver' ? '#c0c0c0' : '#999',
                            color: selectedCustomerDetails.loyaltyTierStatus === 'Gold' ? '#333' : '#fff',
                            padding: '0.5rem 1rem',
                            borderRadius: '8px',
                            textAlign: 'center',
                            width: 'fit-content'
                          }}>
                            {selectedCustomerDetails.loyaltyTierStatus}
                          </p>
                        </div>
                        <div style={{
                          background: '#f8fafc',
                          border: '1px solid #e9ecef',
                          borderRadius: '10px',
                          padding: '1rem'
                        }}>
                          <p style={{ margin: '0 0 0.5rem', color: '#666', fontSize: '0.9rem', fontWeight: 500, textTransform: 'uppercase' }}>Loyalty Points</p>
                          <p style={{ margin: 0, color: '#e0bf63', fontSize: '1.3rem', fontWeight: 700 }}>{selectedCustomerDetails.loyaltyPointsBalance}</p>
                          <p style={{ margin: '0.3rem 0 0', color: '#999', fontSize: '0.85rem' }}>
                            {selectedCustomerDetails.isLoyalty ? 'Active Member' : 'Not a member'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Order History Section */}
                    {selectedCustomerDetails.orders && selectedCustomerDetails.orders.length > 0 ? (
                      <div style={{ marginBottom: '2rem' }}>
                        <h3 style={{
                          margin: '0 0 1rem',
                          color: '#6f0022',
                          fontSize: '1.2rem',
                          fontFamily: 'Cormorant Garamond, serif',
                          fontWeight: 600,
                          borderBottom: '2px solid #e0bf63',
                          paddingBottom: '0.5rem'
                        }}>
                          Order History
                        </h3>
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                            <thead>
                              <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #e9ecef' }}>
                                <th style={{ padding: '0.8rem', textAlign: 'left', fontWeight: 600, color: '#333' }}>Order #</th>
                                <th style={{ padding: '0.8rem', textAlign: 'left', fontWeight: 600, color: '#333' }}>Date</th>
                                <th style={{ padding: '0.8rem', textAlign: 'left', fontWeight: 600, color: '#333' }}>Items</th>
                                <th style={{ padding: '0.8rem', textAlign: 'right', fontWeight: 600, color: '#333' }}>Amount</th>
                                <th style={{ padding: '0.8rem', textAlign: 'left', fontWeight: 600, color: '#333' }}>Status</th>
                              </tr>
                            </thead>
                            <tbody>
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
                                  <tr key={order._id} style={{ borderBottom: '1px solid #e9ecef' }}>
                                    <td style={{ padding: '0.8rem', fontWeight: 600, color: '#333' }}>{order.orderNumber}</td>
                                    <td style={{ padding: '0.8rem', color: '#555' }}>
                                      {new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                    </td>
                                    <td style={{ padding: '0.8rem', color: '#555' }}>{itemCount} item{itemCount !== 1 ? 's' : ''}</td>
                                    <td style={{ padding: '0.8rem', textAlign: 'right', fontWeight: 700, color: '#6f0022' }}>LKR {Math.round(Number(order.total || 0)).toLocaleString()}</td>
                                    <td style={{ padding: '0.8rem' }}>
                                      <span style={{
                                        background: statusColor.bg,
                                        color: statusColor.text,
                                        padding: '0.3rem 0.7rem',
                                        borderRadius: '999px',
                                        fontSize: '0.8rem',
                                        fontWeight: 600,
                                        display: 'inline-block'
                                      }}>
                                        {order.status}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div style={{
                        background: '#f8fafc',
                        border: '1px solid #e9ecef',
                        borderRadius: '10px',
                        padding: '1.5rem',
                        textAlign: 'center',
                        color: '#999',
                        marginBottom: '2rem'
                      }}>
                        No orders yet.
                      </div>
                    )}

                    {/* Coupons Used Section */}
                    {selectedCustomerDetails.couponsUsed && selectedCustomerDetails.couponsUsed.length > 0 ? (
                      <div style={{ marginBottom: '2rem' }}>
                        <h3 style={{
                          margin: '0 0 1rem',
                          color: '#6f0022',
                          fontSize: '1.2rem',
                          fontFamily: 'Cormorant Garamond, serif',
                          fontWeight: 600,
                          borderBottom: '2px solid #e0bf63',
                          paddingBottom: '0.5rem'
                        }}>
                          Coupons Used
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
                          {selectedCustomerDetails.couponsUsed.map((coupon, idx) => (
                            <div key={idx} style={{
                              background: '#f8fafc',
                              border: '1px solid #e9ecef',
                              borderRadius: '10px',
                              padding: '1rem'
                            }}>
                              <p style={{ margin: '0 0 0.5rem', color: '#666', fontSize: '0.85rem', fontWeight: 500, textTransform: 'uppercase' }}>Code</p>
                              <p style={{ margin: '0 0 0.8rem', color: '#6f0022', fontSize: '1.1rem', fontWeight: 700, fontFamily: 'monospace' }}>{coupon.code}</p>
                              <p style={{ margin: '0 0 0.3rem', color: '#666', fontSize: '0.85rem', fontWeight: 500, textTransform: 'uppercase' }}>Discount</p>
                              <p style={{ margin: '0 0 0.8rem', color: '#28a745', fontSize: '1rem', fontWeight: 600 }}>LKR {Math.round(coupon.discount).toLocaleString()}</p>
                              <p style={{ margin: 0, color: '#999', fontSize: '0.85rem' }}>Order: {coupon.orderNumber}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div style={{
                        background: '#f8fafc',
                        border: '1px solid #e9ecef',
                        borderRadius: '10px',
                        padding: '1.5rem',
                        textAlign: 'center',
                        color: '#999',
                        marginBottom: '2rem'
                      }}>
                        No coupons used yet.
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Modal Footer */}
              <div style={{
                padding: '1.5rem 2rem',
                borderTop: '1px solid #f1e8ea',
                background: '#f9f7f4',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '1rem'
              }}>
                <button
                  type="button"
                  onClick={closeCustomerDetailsModal}
                  style={{
                    border: '1px solid #dee2e6',
                    color: '#6b7280',
                    background: '#fff',
                    padding: '0.8rem 1.5rem',
                    fontSize: '0.95rem',
                    borderRadius: '999px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#f1e8ea';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = '#fff';
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
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem',
              zIndex: 1000
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              onClick={(event) => event.stopPropagation()}
              style={{
                width: 'min(100%, 500px)',
                maxHeight: '90vh',
                background: '#fff',
                borderRadius: '24px',
                border: '1px solid #eadfd6',
                boxShadow: '0 24px 60px rgba(0, 0, 0, 0.28)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              {/* Header with gradient accent */}
              <div style={{
                position: 'relative',
                overflow: 'hidden',
                paddingBottom: '0',
                flexShrink: 0
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
                    <h3 style={{
                      margin: 0,
                      color: '#6f0022',
                      fontSize: '2rem',
                      fontFamily: 'Cormorant Garamond, serif',
                      fontWeight: 600,
                      letterSpacing: '0.5px'
                    }}>
                      {isEditBannerModalOpen ? 'Edit Banner' : 'Create Banner'}
                    </h3>
                    <p style={{ 
                      margin: '0.6rem 0 0', 
                      color: '#888', 
                      fontSize: '0.95rem',
                      fontWeight: 400
                    }}>
                      {isEditBannerModalOpen ? 'Update your banner content and settings' : 'Create a new promotional banner for your store'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setIsAddBannerModalOpen(false); setIsEditBannerModalOpen(false); }}
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
              <form onSubmit={isEditBannerModalOpen ? updateBanner : createBanner} style={{ padding: '2.5rem', background: '#fff', overflowY: 'auto', flex: 1 }}>
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

                {/* Banner Message */}
                <div style={{ marginBottom: '1.8rem' }}>
                  <label style={{
                    display: 'block',
                    color: '#333',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    marginBottom: '0.6rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.3px'
                  }}>
                    Banner Message
                  </label>
                  <textarea
                    value={bannerForm.message}
                    onChange={(e) => setBannerForm({ ...bannerForm, message: e.target.value })}
                    placeholder="Enter your banner message (e.g., 'New collection launched! Check it out.')"
                    style={{
                      width: '100%',
                      minHeight: '100px',
                      padding: '0.95rem 1.1rem',
                      border: '1px solid #e0e7ff',
                      borderRadius: '12px',
                      fontFamily: 'Poppins, sans-serif',
                      fontSize: '1rem',
                      background: '#f9f9f9',
                      resize: 'vertical',
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

                {/* Banner Type and Background Color */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.8rem', marginBottom: '1.8rem' }}>
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
                      Banner Type
                    </label>
                    <select
                      value={bannerForm.type}
                      onChange={(e) => setBannerForm({ ...bannerForm, type: e.target.value })}
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
                      <option value="info">Information</option>
                      <option value="success">Success</option>
                      <option value="warning">Warning</option>
                      <option value="promo">Promotion</option>
                    </select>
                  </div>
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
                      Background Color
                    </label>
                    <div style={{
                      display: 'flex',
                      gap: '0.8rem',
                      alignItems: 'center'
                    }}>
                      <input
                        type="color"
                        value={bannerForm.backgroundColor}
                        onChange={(e) => setBannerForm({ ...bannerForm, backgroundColor: e.target.value })}
                        style={{
                          width: '60px',
                          height: '44px',
                          border: '1px solid #e0e7ff',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          transition: 'border-color 0.2s'
                        }}
                        onFocus={(e) => e.target.style.border = '2px solid #6f0022'}
                        onBlur={(e) => e.target.style.border = '1px solid #e0e7ff'}
                      />
                      <span style={{ color: '#999', fontSize: '0.85rem', fontFamily: 'monospace' }}>{bannerForm.backgroundColor}</span>
                    </div>
                  </div>
                </div>

                {/* Text Color and Start Date */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.8rem', marginBottom: '1.8rem' }}>
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
                      Text Color
                    </label>
                    <div style={{
                      display: 'flex',
                      gap: '0.8rem',
                      alignItems: 'center'
                    }}>
                      <input
                        type="color"
                        value={bannerForm.textColor}
                        onChange={(e) => setBannerForm({ ...bannerForm, textColor: e.target.value })}
                        style={{
                          width: '60px',
                          height: '44px',
                          border: '1px solid #e0e7ff',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          transition: 'border-color 0.2s'
                        }}
                        onFocus={(e) => e.target.style.border = '2px solid #6f0022'}
                        onBlur={(e) => e.target.style.border = '1px solid #e0e7ff'}
                      />
                      <span style={{ color: '#999', fontSize: '0.85rem', fontFamily: 'monospace' }}>{bannerForm.textColor}</span>
                    </div>
                  </div>
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
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={bannerForm.startDate}
                      onChange={(e) => setBannerForm({ ...bannerForm, startDate: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
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
                      title="Start date cannot be in the past"
                    />
                  </div>
                </div>

                {/* End Date and Active Status */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.8rem', marginBottom: '1.8rem' }}>
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
                      End Date
                    </label>
                    <input
                      type="date"
                      value={bannerForm.endDate}
                      onChange={(e) => setBannerForm({ ...bannerForm, endDate: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
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
                      title="End date cannot be in the past"
                    />
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    paddingBottom: '0.5rem'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.8rem',
                      padding: '0.8rem 1.1rem',
                      background: '#f9f9f9',
                      borderRadius: '12px',
                      border: '1px solid #e0e7ff'
                    }}>
                      <input
                        type="checkbox"
                        id="isActiveBanner"
                        checked={bannerForm.isActive}
                        onChange={(e) => setBannerForm({ ...bannerForm, isActive: e.target.checked })}
                        style={{
                          width: '18px',
                          height: '18px',
                          cursor: 'pointer',
                          accentColor: '#6f0022'
                        }}
                      />
                      <label htmlFor="isActiveBanner" style={{
                        fontWeight: 600,
                        color: '#333',
                        cursor: 'pointer',
                        margin: 0,
                        fontSize: '0.95rem'
                      }}>
                        Active
                      </label>
                    </div>
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
                    onClick={() => { setIsAddBannerModalOpen(false); setIsEditBannerModalOpen(false); }}
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
                    disabled={isSavingBanner}
                    style={{
                      background: isSavingBanner ? '#c9c9c9' : 'linear-gradient(135deg, #6f0022, #8b0029)',
                      color: '#fff',
                      border: 'none',
                      padding: '0.85rem 2rem',
                      borderRadius: '999px',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      cursor: isSavingBanner ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: isSavingBanner ? 'none' : '0 8px 16px rgba(111, 0, 34, 0.2)'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSavingBanner) {
                        e.target.style.boxShadow = '0 12px 24px rgba(111, 0, 34, 0.3)';
                        e.target.style.transform = 'translateY(-2px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSavingBanner) {
                        e.target.style.boxShadow = '0 8px 16px rgba(111, 0, 34, 0.2)';
                        e.target.style.transform = 'translateY(0)';
                      }
                    }}
                  >
                    {isSavingBanner ? 'Saving...' : (isEditBannerModalOpen ? 'Update Banner' : 'Create Banner')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
