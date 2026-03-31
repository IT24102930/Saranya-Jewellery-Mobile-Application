import { useEffect, useMemo, useState } from 'react';
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

export default function AdminDashboardPage() {
  const [staffUser, setStaffUser] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [customerList, setCustomerList] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [statusFilter, setStatusFilter] = useState('all');
  const [busyId, setBusyId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  
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

  const filteredList = useMemo(() => {
    if (statusFilter === 'all') return staffList;
    if (statusFilter === 'active') return staffList.filter((item) => item.isActive);
    if (statusFilter === 'inactive') return staffList.filter((item) => !item.isActive);
    return staffList.filter((item) => item.status === statusFilter);
  }, [staffList, statusFilter]);

  useEffect(() => {
    document.title = 'Admin Dashboard - Saranya Jewellery';
  }, []);

  useEffect(() => {
    async function bootstrap() {
      const me = await authManager.checkStaffAuth('Admin');
      if (!me || me.needsApproval) return;
      setStaffUser(me);
      await Promise.all([loadStaff(), loadStats(), loadCustomers()]);
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

  if (!staffUser) return <p style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Checking admin access...</p>;

  return (
    <div style={{ background: '#fafbfc', minHeight: '100vh' }}>
      {/* Header */}
      <header style={{
        background: '#fff',
        borderBottom: '1px solid #e9ecef',
        padding: '1.5rem 2rem',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '2rem'
        }}>
          <div>
            <h1 style={{
              margin: 0,
              color: '#6f0022',
              fontSize: '1.8rem',
              fontFamily: 'Cormorant Garamond, serif',
              fontWeight: 600
            }}>
              Admin Dashboard
            </h1>
            <p style={{
              margin: '0.3rem 0 0',
              color: '#666',
              fontSize: '0.95rem'
            }}>
              {staffUser.fullName} • {staffUser.role}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <a
              href="/home"
              style={{
                padding: '0.5rem 1rem',
                color: '#6f0022',
                textDecoration: 'none',
                fontSize: '0.95rem',
                fontWeight: 500,
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.color = '#e0bf63'}
              onMouseLeave={(e) => e.target.style.color = '#6f0022'}
            >
              Back to Home
            </a>
            <button
              onClick={() => authManager.logout()}
              style={{
                background: '#6f0022',
                color: '#fff',
                border: 'none',
                padding: '0.6rem 1.2rem',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '0.95rem',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.background = '#4f0018'}
              onMouseLeave={(e) => e.target.style.background = '#6f0022'}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '2rem',
      }}>
        {/* Stats Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>
          {[
            { label: 'Total Customers', value: stats.totalCustomers, color: '#6f0022' },
            { label: 'Total Products', value: stats.totalProducts, color: '#0066cc' },
            { label: 'Total Orders', value: stats.totalOrders, color: '#28a745' },
            { label: 'Loyalty Members', value: stats.loyaltyMembers, color: '#e0bf63' },
            { label: 'Total Income', value: `LKR ${(stats.totalIncome || 0).toLocaleString()}`, color: '#ffc107' },
            { label: 'This Month Income', value: `LKR ${(stats.monthIncome || 0).toLocaleString()}`, color: '#17a2b8' },
            { label: 'This Year Income', value: `LKR ${(stats.yearIncome || 0).toLocaleString()}`, color: '#6f0022' },
            { label: 'Completed Orders', value: stats.completedOrders, color: '#28a745' },
            { label: 'Pending Orders', value: stats.pendingOrders, color: '#ffc107' },
            { label: 'Total Refunds', value: `LKR ${(stats.totalRefunds || 0).toLocaleString()}`, color: '#dc3545' },
            { label: 'Gold Rate (Today)', value: `LKR ${(stats.goldRate || 0).toLocaleString()}/gram`, color: '#e0bf63' },
            { label: 'Promotions Sent Today', value: stats.promotionsSentToday, color: '#ff6b6b' }
          ].map((stat, idx) => (
            <div
              key={idx}
              style={{
                background: '#fff',
                borderRadius: '12px',
                padding: '1.5rem',
                border: '1px solid #e9ecef',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.12)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <p style={{
                  margin: 0,
                  color: '#666',
                  fontSize: '0.9rem',
                  fontWeight: 500
                }}>
                  {stat.label}
                </p>
                <span
                  style={{
                    width: '32px',
                    height: '6px',
                    borderRadius: '999px',
                    background: stat.color,
                    display: 'inline-block',
                    marginTop: '0.35rem'
                  }}
                />
              </div>
              <h2 style={{
                margin: '0.8rem 0 0',
                color: stat.color,
                fontSize: '2rem',
                fontWeight: 700,
                wordBreak: 'break-word'
              }}>
                {stat.value}
              </h2>
            </div>
          ))}
        </div>

        {/* Create Staff Section */}
        <section style={{
          background: '#fff',
          borderRadius: '12px',
          padding: '2rem',
          border: '1px solid #e9ecef',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
          marginBottom: '2rem'
        }}>
          <h3 style={{
            margin: '0 0 1.5rem',
            color: '#6f0022',
            fontSize: '1.4rem',
            fontFamily: 'Cormorant Garamond, serif',
            fontWeight: 600
          }}>
            Add New Staff Member
          </h3>
          
          <form
            onSubmit={createStaff}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1rem'
            }}
          >
            <input
              required
              value={form.fullName}
              onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
              placeholder="Full Name"
              style={{
                padding: '0.75rem 1rem',
                border: '1px solid #dee2e6',
                borderRadius: '6px',
                fontSize: '0.95rem',
                fontFamily: 'Poppins, sans-serif',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#6f0022'}
              onBlur={(e) => e.target.style.borderColor = '#dee2e6'}
            />
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="Email Address"
              style={{
                padding: '0.75rem 1rem',
                border: '1px solid #dee2e6',
                borderRadius: '6px',
                fontSize: '0.95rem',
                fontFamily: 'Poppins, sans-serif',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#6f0022'}
              onBlur={(e) => e.target.style.borderColor = '#dee2e6'}
            />
            <input
              required
              minLength={6}
              type="password"
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
              placeholder="Password (min. 6 characters)"
              style={{
                padding: '0.75rem 1rem',
                border: '1px solid #dee2e6',
                borderRadius: '6px',
                fontSize: '0.95rem',
                fontFamily: 'Poppins, sans-serif',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#6f0022'}
              onBlur={(e) => e.target.style.borderColor = '#dee2e6'}
            />
            <select
              value={form.role}
              onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
              style={{
                padding: '0.75rem 1rem',
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
              <option>Customer Care</option>
              <option>Inventory</option>
              <option>Order Management</option>
              <option>Product Management</option>
              <option>Loyalty Management</option>
              <option>Admin</option>
            </select>
            <button
              type="submit"
              disabled={isSaving}
              style={{
                background: '#6f0022',
                color: '#fff',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '0.95rem',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                opacity: isSaving ? 0.7 : 1,
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => !isSaving && (e.target.style.background = '#4f0018')}
              onMouseLeave={(e) => !isSaving && (e.target.style.background = '#6f0022')}
            >
              {isSaving ? 'Creating...' : 'Add Staff Member'}
            </button>
          </form>
        </section>

        {/* Staff Management Section */}
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
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
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
                    Active
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
                    <td style={{ padding: '1rem', color: '#666' }}>
                      {item.isActive ? (
                        <span style={{ color: '#28a745', fontWeight: 600 }}>Yes</span>
                      ) : (
                        <span style={{ color: '#999' }}>No</span>
                      )}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{
                        display: 'flex',
                        gap: '0.5rem',
                        flexWrap: 'wrap'
                      }}>
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
                        <button
                          disabled={busyId === item._id}
                          onClick={() => performAction(item._id, '/toggle-active')}
                          style={{
                            padding: '0.4rem 0.8rem',
                            border: '1px solid #6f0022',
                            background: '#fff',
                            color: '#6f0022',
                            borderRadius: '4px',
                            fontSize: '0.8rem',
                            fontWeight: 500,
                            cursor: busyId === item._id ? 'not-allowed' : 'pointer',
                            opacity: busyId === item._id ? 0.6 : 1,
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => !busyId && (e.target.style.background = '#6f0022', e.target.style.color = '#fff')}
                          onMouseLeave={(e) => !busyId && (e.target.style.background = '#fff', e.target.style.color = '#6f0022')}
                        >
                          {item.isActive ? 'Deactivate' : 'Activate'}
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
                    <td colSpan={5} style={{
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

        {/* Customers Management Section */}
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
              Customer Management
            </h3>
            <select
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
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
              <option value="all">All Customers</option>
              <option value="active">Active Only</option>
              <option value="premium">Premium Members</option>
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
                    Phone
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
                {customerList && customerList.length > 0 ? (
                  customerList.map((customer) => (
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
                      <td style={{ padding: '1rem', color: '#555' }}>
                        {customer.phone || 'N/A'}
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
                      <td style={{ padding: '1rem' }}>
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
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} style={{
                      padding: '2rem 1rem',
                      textAlign: 'center',
                      color: '#999'
                    }}>
                      No customers found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
