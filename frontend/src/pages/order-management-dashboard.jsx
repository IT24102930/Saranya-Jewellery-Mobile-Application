import { useEffect, useMemo, useState } from 'react';
import authManager from '../auth.js';
import StaffDashboardLayout from '../components/StaffDashboardLayout.jsx';

const DASHBOARD_LINKS = [
  { href: '/order-management-dashboard', label: 'Orders' },
  { href: '/inventory-dashboard', label: 'Inventory' },
  { href: '/customer-care-dashboard', label: 'Customer Care' }
];

const STATUSES = ['All', 'Pending', 'Payment Received', 'Invoice Created', 'Confirmed', 'Preparing', 'Ready for Collection', 'Completed', 'Cancelled', 'Refunded'];

const NEXT_STATUS = {
  Pending: 'Payment Received',
  'Payment Received': 'Invoice Created',
  'Invoice Created': 'Confirmed',
  Confirmed: 'Preparing',
  Preparing: 'Ready for Collection',
  'Ready for Collection': 'Completed'
};

const STATUS_COLORS = {
  Pending: { bg: '#fff5e8', text: '#9a4a00' },
  'Payment Received': { bg: '#e8f4ff', text: '#075985' },
  'Invoice Created': { bg: '#f0edff', text: '#5b21b6' },
  Confirmed: { bg: '#e9f9ef', text: '#166534' },
  Preparing: { bg: '#fff7cc', text: '#854d0e' },
  'Ready for Collection': { bg: '#e8fbff', text: '#0e7490' },
  Completed: { bg: '#eafbf0', text: '#166534' },
  Cancelled: { bg: '#ffeaea', text: '#991b1b' },
  Refunded: { bg: '#f4f4f5', text: '#3f3f46' }
};

function getStatusStyle(status) {
  return STATUS_COLORS[status] || { bg: '#f4f4f5', text: '#3f3f46' };
}

export default function OrderManagementDashboardPage() {
  const [staffUser, setStaffUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [statusFilter, setStatusFilter] = useState('All');
  const [busyId, setBusyId] = useState('');
  const [isCreatingCustomOrder, setIsCreatingCustomOrder] = useState(false);
  const [customOrderForm, setCustomOrderForm] = useState({
    customerName: '',
    customerEmail: '',
    phoneNumber: '',
    orderNotes: '',
    tax: 0,
    items: [{ productId: '', name: '', price: '', quantity: 1 }]
  });
  const [error, setError] = useState('');

  const filteredOrders = useMemo(() => {
    if (statusFilter === 'All') return orders;
    return orders.filter((item) => item.status === statusFilter);
  }, [orders, statusFilter]);

  const totalRevenue = useMemo(
    () => filteredOrders.reduce((sum, order) => sum + Number(order.total || 0), 0),
    [filteredOrders]
  );

  const paidOrders = useMemo(
    () => filteredOrders.filter((order) => order.paymentStatus === 'Paid' || order.status === 'Payment Received').length,
    [filteredOrders]
  );

  const pendingOrders = useMemo(
    () => filteredOrders.filter((order) => order.status === 'Pending' || order.paymentStatus === 'Pending').length,
    [filteredOrders]
  );

  useEffect(() => {
    document.title = 'Order Management Dashboard - Saranya Jewellery';
  }, []);

  useEffect(() => {
    async function bootstrap() {
      const me = await authManager.checkStaffAuth('Order Management');
      if (!me || me.needsApproval) return;
      setStaffUser(me);
      await Promise.all([loadOrders(), loadProducts()]);
    }
    bootstrap();
  }, []);

  async function loadProducts() {
    try {
      const response = await authManager.apiRequest('/api/products');
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to load products');
      setProducts(Array.isArray(data) ? data : []);
    } catch {
      setProducts([]);
    }
  }

  async function loadOrders() {
    setError('');
    try {
      const query = statusFilter === 'All' ? '' : `?status=${encodeURIComponent(statusFilter)}`;
      const response = await authManager.apiRequest(`/api/orders${query}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to load orders');
      setOrders(Array.isArray(data) ? data : []);
    } catch (loadError) {
      setError(loadError.message || 'Failed to load orders');
      setOrders([]);
    }
  }

  useEffect(() => {
    if (!staffUser) return;
    loadOrders();
  }, [statusFilter]);

  async function patchOrder(orderId, endpoint, body = null) {
    setBusyId(orderId);
    setError('');
    try {
      const response = await authManager.apiRequest(endpoint, {
        method: 'PATCH',
        ...(body ? { body: JSON.stringify(body) } : {})
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to update order');
      await loadOrders();
    } catch (patchError) {
      setError(patchError.message || 'Failed to update order');
    } finally {
      setBusyId('');
    }
  }

  async function advanceOrder(order) {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    await patchOrder(order._id, `/api/orders/${order._id}/status`, { status: next });
  }

  async function markPaid(order) {
    await patchOrder(order._id, `/api/orders/${order._id}/payment-received`);
  }

  async function markUnpaid(order) {
    if (!window.confirm('Cancel this order due to payment not received?')) return;
    await patchOrder(order._id, `/api/orders/${order._id}/payment-not-received`);
  }

  function updateCustomItem(index, field, value) {
    setCustomOrderForm((prev) => {
      const nextItems = prev.items.map((item, i) => (i === index ? { ...item, [field]: value } : item));
      return { ...prev, items: nextItems };
    });
  }

  function onSelectProduct(index, productId) {
    const selected = products.find((item) => item._id === productId);
    if (!selected) {
      updateCustomItem(index, 'productId', '');
      return;
    }

    setCustomOrderForm((prev) => {
      const nextItems = prev.items.map((item, i) => {
        if (i !== index) return item;
        return {
          ...item,
          productId: selected._id,
          name: selected.name || '',
          price: Number(selected.price || 0),
          quantity: Number(item.quantity || 1)
        };
      });
      return { ...prev, items: nextItems };
    });
  }

  function addCustomItem() {
    setCustomOrderForm((prev) => ({
      ...prev,
      items: [...prev.items, { productId: '', name: '', price: '', quantity: 1 }]
    }));
  }

  function removeCustomItem(index) {
    setCustomOrderForm((prev) => {
      if (prev.items.length <= 1) return prev;
      return { ...prev, items: prev.items.filter((_, i) => i !== index) };
    });
  }

  async function createCustomOrder(event) {
    event.preventDefault();
    setIsCreatingCustomOrder(true);
    setError('');

    try {
      const payload = {
        customerName: customOrderForm.customerName,
        customerEmail: customOrderForm.customerEmail,
        phoneNumber: customOrderForm.phoneNumber,
        orderNotes: customOrderForm.orderNotes,
        tax: Number(customOrderForm.tax || 0),
        items: customOrderForm.items.map((item) => ({
          productId: item.productId || undefined,
          name: item.name,
          price: Number(item.price || 0),
          quantity: Number(item.quantity || 1)
        }))
      };

      const response = await authManager.apiRequest('/api/orders/custom', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to create custom order');

      setCustomOrderForm({
        customerName: '',
        customerEmail: '',
        phoneNumber: '',
        orderNotes: '',
        tax: 0,
        items: [{ productId: '', name: '', price: '', quantity: 1 }]
      });
      await loadOrders();
    } catch (createError) {
      setError(createError.message || 'Failed to create custom order');
    } finally {
      setIsCreatingCustomOrder(false);
    }
  }

  if (!staffUser) return <p style={{ padding: '1rem' }}>Checking order management access...</p>;

  return (
    <StaffDashboardLayout
      title="Order Management Dashboard"
      staff={staffUser}
      onLogout={() => authManager.logout()}
      links={DASHBOARD_LINKS}
    >
      <section style={{
        borderRadius: 16,
        padding: '1rem',
        border: '1px solid #e6e4dd',
        background: 'linear-gradient(130deg, #fff9ee 0%, #ffffff 65%)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <p style={{ margin: 0, color: '#6b6470', fontSize: '0.85rem', letterSpacing: '0.03em' }}>ORDER CONTROL CENTER</p>
            <h2 style={{ margin: '0.3rem 0 0', color: '#4b122d' }}>Order Management</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(140px, 1fr))', gap: '0.65rem', width: '100%', maxWidth: 560 }}>
            <div style={{ background: '#ffffff', border: '1px solid #ece8df', borderRadius: 12, padding: '0.8rem' }}>
              <p style={{ margin: 0, color: '#786f76', fontSize: '0.8rem' }}>Orders</p>
              <h3 style={{ margin: '0.35rem 0 0', color: '#6f0022' }}>{filteredOrders.length}</h3>
            </div>
            <div style={{ background: '#ffffff', border: '1px solid #ece8df', borderRadius: 12, padding: '0.8rem' }}>
              <p style={{ margin: 0, color: '#786f76', fontSize: '0.8rem' }}>Pending</p>
              <h3 style={{ margin: '0.35rem 0 0', color: '#8b2c20' }}>{pendingOrders}</h3>
            </div>
            <div style={{ background: '#ffffff', border: '1px solid #ece8df', borderRadius: 12, padding: '0.8rem' }}>
              <p style={{ margin: 0, color: '#786f76', fontSize: '0.8rem' }}>Revenue</p>
              <h3 style={{ margin: '0.35rem 0 0', color: '#14532d' }}>Rs. {totalRevenue.toLocaleString()}</h3>
            </div>
          </div>
        </div>
        <div style={{ marginTop: '0.8rem', display: 'inline-flex', gap: '0.4rem', alignItems: 'center', background: '#fff', border: '1px solid #ece8df', borderRadius: 999, padding: '0.35rem 0.75rem' }}>
          <span style={{ color: '#6b6470', fontSize: '0.82rem' }}>Paid:</span>
          <strong style={{ color: '#166534' }}>{paidOrders}</strong>
        </div>
      </section>

      <section style={{ border: '1px solid #ece8df', borderRadius: 16, padding: '1rem', marginTop: '1rem', background: '#fff' }}>
        <h3 style={{ margin: 0, color: '#4b122d' }}>Create Custom Order</h3>
        <p style={{ margin: '0.4rem 0 0.9rem', color: '#6b6470', fontSize: '0.9rem' }}>
          Create an order using customer details and product information.
        </p>
        <form onSubmit={createCustomOrder} style={{ display: 'grid', gap: '0.8rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.7rem' }}>
            <input
              required
              placeholder="Customer Name"
              value={customOrderForm.customerName}
              onChange={(e) => setCustomOrderForm((prev) => ({ ...prev, customerName: e.target.value }))}
              style={{ border: '1px solid #ddd5cc', borderRadius: 8, padding: '0.55rem 0.65rem' }}
            />
            <input
              required
              type="email"
              placeholder="Customer Email"
              value={customOrderForm.customerEmail}
              onChange={(e) => setCustomOrderForm((prev) => ({ ...prev, customerEmail: e.target.value }))}
              style={{ border: '1px solid #ddd5cc', borderRadius: 8, padding: '0.55rem 0.65rem' }}
            />
            <input
              required
              placeholder="Phone Number"
              value={customOrderForm.phoneNumber}
              onChange={(e) => setCustomOrderForm((prev) => ({ ...prev, phoneNumber: e.target.value }))}
              style={{ border: '1px solid #ddd5cc', borderRadius: 8, padding: '0.55rem 0.65rem' }}
            />
            <input
              type="number"
              min="0"
              placeholder="Tax"
              value={customOrderForm.tax}
              onChange={(e) => setCustomOrderForm((prev) => ({ ...prev, tax: e.target.value }))}
              style={{ border: '1px solid #ddd5cc', borderRadius: 8, padding: '0.55rem 0.65rem' }}
            />
          </div>

          <textarea
            rows={2}
            placeholder="Order notes"
            value={customOrderForm.orderNotes}
            onChange={(e) => setCustomOrderForm((prev) => ({ ...prev, orderNotes: e.target.value }))}
            style={{ border: '1px solid #ddd5cc', borderRadius: 8, padding: '0.55rem 0.65rem' }}
          />

          <div style={{ display: 'grid', gap: '0.6rem' }}>
            {customOrderForm.items.map((item, index) => (
              <div key={`custom-item-${index}`} style={{ border: '1px solid #eee3d6', borderRadius: 10, padding: '0.7rem', display: 'grid', gap: '0.55rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr auto', gap: '0.55rem', alignItems: 'center' }}>
                  <select
                    value={item.productId}
                    onChange={(e) => onSelectProduct(index, e.target.value)}
                    style={{ border: '1px solid #ddd5cc', borderRadius: 8, padding: '0.5rem' }}
                  >
                    <option value="">Manual Product Entry</option>
                    {products.map((product) => (
                      <option key={product._id} value={product._id}>
                        {product.name} (Rs. {Number(product.price || 0).toLocaleString()})
                      </option>
                    ))}
                  </select>
                  <input
                    required
                    placeholder="Product Name"
                    value={item.name}
                    onChange={(e) => updateCustomItem(index, 'name', e.target.value)}
                    style={{ border: '1px solid #ddd5cc', borderRadius: 8, padding: '0.5rem' }}
                  />
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Price"
                    value={item.price}
                    onChange={(e) => updateCustomItem(index, 'price', e.target.value)}
                    style={{ border: '1px solid #ddd5cc', borderRadius: 8, padding: '0.5rem' }}
                  />
                  <input
                    required
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => updateCustomItem(index, 'quantity', e.target.value)}
                    style={{ border: '1px solid #ddd5cc', borderRadius: 8, padding: '0.5rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => removeCustomItem(index)}
                    disabled={customOrderForm.items.length === 1}
                    style={{ border: '1px solid #f3d0d0', background: '#fff5f5', color: '#9f1239', borderRadius: 8, padding: '0.5rem 0.65rem', cursor: customOrderForm.items.length === 1 ? 'not-allowed' : 'pointer' }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '0.55rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={addCustomItem}
              style={{ border: '1px solid #d8ccf5', background: '#f8f5ff', color: '#5b21b6', borderRadius: 8, padding: '0.5rem 0.75rem', cursor: 'pointer' }}
            >
              + Add Item
            </button>
            <button
              type="submit"
              disabled={isCreatingCustomOrder}
              style={{ border: '1px solid #cde8d7', background: '#f3fff8', color: '#166534', borderRadius: 8, padding: '0.5rem 0.75rem', cursor: isCreatingCustomOrder ? 'not-allowed' : 'pointer' }}
            >
              {isCreatingCustomOrder ? 'Creating...' : 'Create Custom Order'}
            </button>
          </div>
        </form>
      </section>

      <section style={{ border: '1px solid #ece8df', borderRadius: 16, padding: '1rem', marginTop: '1rem', background: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.7rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0, color: '#4b122d' }}>Orders Queue</h3>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <label htmlFor="status-filter" style={{ fontSize: '0.85rem', color: '#6b6470' }}>Filter</label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                border: '1px solid #ddd5cc',
                borderRadius: 8,
                padding: '0.45rem 0.6rem',
                background: '#fffdf9'
              }}
            >
              {STATUSES.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
        </div>
        {error && (
          <p style={{ color: '#b42318', background: '#fff1f1', border: '1px solid #f7c9c9', borderRadius: 8, padding: '0.6rem', marginTop: '0.8rem' }}>
            {error}
          </p>
        )}
        <div style={{ display: 'grid', gap: '0.85rem', marginTop: '0.9rem' }}>
          {filteredOrders.map((order) => {
            const busy = busyId === order._id;
            const statusStyle = getStatusStyle(order.status);
            return (
              <article key={order._id} style={{ border: '1px solid #f0ebe4', borderRadius: 12, padding: '1rem', background: '#fffcf7' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.8rem', flexWrap: 'wrap' }}>
                  <div>
                    <h4 style={{ margin: '0 0 0.25rem', color: '#3f2431' }}>{order.orderNumber} | {order.customerName}</h4>
                    <p style={{ margin: 0, color: '#6b6470', fontSize: '0.9rem' }}>
                      Items: {Array.isArray(order.items) ? order.items.length : 0} | Total: Rs. {Number(order.total || 0).toLocaleString()}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{
                      padding: '0.24rem 0.55rem',
                      borderRadius: 999,
                      fontSize: '0.78rem',
                      background: statusStyle.bg,
                      color: statusStyle.text,
                      fontWeight: 600
                    }}>
                      {order.status}
                    </span>
                    <span style={{
                      padding: '0.24rem 0.55rem',
                      borderRadius: 999,
                      fontSize: '0.78rem',
                      background: order.paymentStatus === 'Paid' ? '#eafbf0' : '#fff5e8',
                      color: order.paymentStatus === 'Paid' ? '#166534' : '#9a4a00',
                      fontWeight: 600
                    }}>
                      Payment: {order.paymentStatus || 'Pending'}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => markPaid(order)}
                    style={{
                      border: '1px solid #cde8d7',
                      background: '#f3fff8',
                      color: '#166534',
                      borderRadius: 8,
                      padding: '0.45rem 0.65rem',
                      cursor: busy ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Mark Paid
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => markUnpaid(order)}
                    style={{
                      border: '1px solid #f3d0d0',
                      background: '#fff5f5',
                      color: '#9f1239',
                      borderRadius: 8,
                      padding: '0.45rem 0.65rem',
                      cursor: busy ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Payment Not Received
                  </button>
                  <button
                    type="button"
                    disabled={busy || !NEXT_STATUS[order.status]}
                    onClick={() => advanceOrder(order)}
                    style={{
                      border: '1px solid #d8ccf5',
                      background: '#f8f5ff',
                      color: '#5b21b6',
                      borderRadius: 8,
                      padding: '0.45rem 0.65rem',
                      cursor: busy || !NEXT_STATUS[order.status] ? 'not-allowed' : 'pointer',
                      opacity: busy || !NEXT_STATUS[order.status] ? 0.65 : 1
                    }}
                  >
                    {NEXT_STATUS[order.status] ? `Move to ${NEXT_STATUS[order.status]}` : 'No Next Stage'}
                  </button>
                </div>
              </article>
            );
          })}
          {filteredOrders.length === 0 && (
            <p style={{ margin: 0, color: '#6b6470', border: '1px dashed #ded7cf', borderRadius: 10, padding: '1rem', textAlign: 'center' }}>
              No orders for selected filter.
            </p>
          )}
        </div>
      </section>
    </StaffDashboardLayout>
  );
}
