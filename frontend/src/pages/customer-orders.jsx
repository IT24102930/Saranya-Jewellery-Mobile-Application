import { useEffect, useMemo, useState } from 'react';
import authManager from '../auth.js';

const FILTERS = ['all', 'Pending', 'Confirmed', 'Invoice Created', 'Payment Received', 'Preparing', 'Ready for Collection', 'Completed', 'Cancelled'];

const STATUS_TONE = {
  Pending: 'warn',
  Confirmed: 'info',
  'Invoice Created': 'purple',
  'Payment Received': 'success',
  Preparing: 'info',
  'Ready for Collection': 'success',
  Completed: 'success',
  Cancelled: 'danger',
  Refunded: 'pink'
};

export default function CustomerOrdersPage() {
  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cart] = useState(() => JSON.parse(localStorage.getItem('saranyaCart') || '[]'));

  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    [cart]
  );

  const filteredOrders = useMemo(
    () => (filter === 'all' ? orders : orders.filter((order) => order.status === filter)),
    [orders, filter]
  );

  useEffect(() => {
    document.title = 'My Orders - Saranya Jewellery';
  }, []);

  useEffect(() => {
    async function bootstrap() {
      const loggedInCustomer = await authManager.checkCustomerAuth();
      if (!loggedInCustomer) return;

      setCustomer(loggedInCustomer);
      await loadOrders();
    }

    bootstrap();
  }, []);

  async function loadOrders() {
    setLoading(true);
    try {
      const response = await authManager.apiRequest('/api/orders/my-orders');
      if (!response.ok) throw new Error('Failed to load orders');

      const data = await response.json();
      setOrders(data);
    } catch (error) {
      console.error('Error loading orders:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  async function viewOrderDetails(orderId) {
    try {
      const response = await authManager.apiRequest(`/api/orders/${orderId}`);
      if (!response.ok) throw new Error('Failed to load order details');

      const data = await response.json();
      setSelectedOrder(data);
    } catch (error) {
      console.error('Error loading order details:', error);
      alert('Failed to load order details');
    }
  }

  async function cancelOrder(orderId) {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;

    try {
      const response = await authManager.apiRequest(`/api/orders/${orderId}/cancel`, { method: 'PATCH' });
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.message || 'Failed to cancel order');
      }

      alert('Order cancelled successfully');
      await loadOrders();
      if (selectedOrder?._id === orderId) {
        setSelectedOrder(null);
      }
    } catch (error) {
      console.error('Error cancelling order:', error);
      alert(`Failed to cancel order: ${error.message}`);
    }
  }

  async function reorder(orderId) {
    try {
      const response = await authManager.apiRequest(`/api/orders/${orderId}`);
      if (!response.ok) throw new Error('Failed to load order');

      const order = await response.json();
      const nextCart = JSON.parse(localStorage.getItem('saranyaCart') || '[]');

      order.items.forEach((item) => {
        const existingItem = nextCart.find((cartItem) => cartItem.productId === item.productId);
        if (existingItem) {
          existingItem.quantity += item.quantity;
        } else {
          nextCart.push({
            productId: item.productId,
            name: item.name,
            price: item.price,
            imageUrl: item.imageUrl,
            category: item.category || 'N/A',
            karat: item.karat || 'N/A',
            quantity: item.quantity
          });
        }
      });

      localStorage.setItem('saranyaCart', JSON.stringify(nextCart));
      alert('Items added to cart successfully!');
      window.location.href = '/customer-cart';
    } catch (error) {
      console.error('Error reordering:', error);
      alert('Failed to add items to cart');
    }
  }

  function logout() {
    authManager.logout();
  }

  return (
    <>
      <div className="top-bar">
        <div><i className="fas fa-phone" /> <a href="tel:+1234567890">Contact Us</a></div>
        <div>
          <span style={{ marginRight: '1rem', color: 'var(--brand-gold-strong)' }}>{customer?.fullName || customer?.email || 'Loading...'}</span>
          <span style={{ marginRight: '1rem' }}>Loyalty: {customer?.loyaltyPoints || 0} Points</span>
          <button type="button" className="logout-btn" onClick={logout} style={{ fontSize: '0.85rem', padding: '0.3rem 0.8rem' }}>Logout</button>
        </div>
      </div>

      <header className="header">
        <div className="nav">
          <a href="/">Home</a>
          <a href="/customer-shop">Shop</a>
          <a href="/customer-orders" className="active">My Orders</a>
          <a href="/customer-loyalty">Loyalty</a>
          <a href="/customer-support">Support</a>
        </div>
        <div className="logo">SARANYA JEWELLERY</div>
        <div className="header-icons">
          <i className="fas fa-search header-icon" />
          <a href="/customer-dashboard"><i className="fas fa-user header-icon" /></a>
          <a href="/customer-cart" style={{ position: 'relative' }}>
            <i className="fas fa-shopping-cart header-icon" />
            {cartCount > 0 ? (
              <span style={{ position: 'absolute', top: '-8px', right: '-8px', background: 'var(--brand-gold-strong)', color: 'white', borderRadius: '50%', padding: '2px 6px', fontSize: '0.7rem' }}>
                {cartCount}
              </span>
            ) : null}
          </a>
        </div>
      </header>

      <main className="orders-page">
        <header className="orders-hero">
          <h1 className="orders-title">My Orders</h1>
          <p className="orders-subtitle">Track and manage your jewellery orders.</p>
        </header>

        <div className="orders-filters" role="tablist">
          {FILTERS.map((status) => (
            <button
              key={status}
              type="button"
              className={`orders-filter-chip ${filter === status ? 'is-active' : ''}`}
              onClick={() => setFilter(status)}
            >
              {status === 'all' ? 'All' : status}
            </button>
          ))}
        </div>

        {loading ? <div className="orders-empty">Loading orders…</div> : null}

        {!loading && filteredOrders.length === 0 ? (
          <div className="orders-empty">
            <i className="fas fa-box orders-empty-icon" />
            <h2>No orders found</h2>
            <a href="/customer-shop" className="orders-empty-cta">Start Shopping</a>
          </div>
        ) : null}

        {!loading
          ? filteredOrders.map((order) => {
              const isReady = order.status === 'Ready for Collection';
              const tone = STATUS_TONE[order.status] || 'info';

              return (
                <article key={order._id} className={`orders-card ${isReady ? 'is-ready' : ''}`}>
                  {isReady ? (
                    <div className="orders-ready-banner">
                      <p className="orders-ready-title">Ready for Collection</p>
                      <p className="orders-ready-body">Visit Saranya Jewellery to collect your order.</p>
                    </div>
                  ) : null}

                  <div className="orders-card-head">
                    <div className="orders-card-meta">
                      <h3>Order #{order.orderNumber}</h3>
                      <p><i className="fas fa-calendar" /> {new Date(order.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                      <p><i className="fas fa-box" /> {order.items.length} {order.items.length === 1 ? 'item' : 'items'}</p>
                      {order.invoiceNumber ? <p><i className="fas fa-file-invoice" /> {order.invoiceNumber}</p> : null}
                    </div>
                    <div className="orders-card-status">
                      <span className={`orders-status-pill tone-${tone}`}>{order.status}</span>
                      <p className="orders-card-total">Rs. {Number(order.total || 0).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="orders-card-thumbs">
                    {order.items.slice(0, 4).map((item, idx) => (
                      <img
                        key={`${order._id}-${idx}`}
                        src={item.imageUrl || '/SaranyaLOGO.jpg'}
                        alt={item.name}
                        loading="lazy"
                      />
                    ))}
                    {order.items.length > 4 ? (
                      <div className="orders-card-thumb-more">+{order.items.length - 4}</div>
                    ) : null}
                  </div>

                  <div className="orders-card-actions">
                    <button type="button" onClick={() => viewOrderDetails(order._id)} className="orders-action orders-action-primary">
                      <i className="fas fa-eye" /> Details
                    </button>
                    {order.status === 'Completed' ? (
                      <button type="button" onClick={() => reorder(order._id)} className="orders-action orders-action-gold">
                        <i className="fas fa-redo" /> Reorder
                      </button>
                    ) : null}
                    {order.status === 'Pending' ? (
                      <button type="button" onClick={() => cancelOrder(order._id)} className="orders-action orders-action-danger">
                        <i className="fas fa-times" /> Cancel
                      </button>
                    ) : null}
                  </div>
                </article>
              );
            })
          : null}
      </main>

      {selectedOrder ? (
        <div className="orders-modal" role="dialog" aria-modal="true">
          <div className="orders-modal-sheet">
            <div className="orders-modal-header">
              <h2>Order Details</h2>
              <button type="button" className="orders-modal-close" onClick={() => setSelectedOrder(null)} aria-label="Close">×</button>
            </div>

            <div className="orders-modal-body">
              {selectedOrder.status === 'Ready for Collection' ? (
                <div className="orders-ready-banner">
                  <p className="orders-ready-title">Ready for Collection</p>
                  <p className="orders-ready-body">Visit <strong>Saranya Jewellery</strong> to collect your order.</p>
                </div>
              ) : null}

              <div className="orders-detail-grid">
                <section className="orders-detail-block">
                  <h3>Order Information</h3>
                  <p><strong>Order #</strong> {selectedOrder.orderNumber}</p>
                  <p><strong>Date</strong> {new Date(selectedOrder.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  <p><strong>Status</strong> <span className={`orders-status-pill tone-${STATUS_TONE[selectedOrder.status] || 'info'}`}>{selectedOrder.status}</span></p>
                  <p><strong>Payment</strong> {selectedOrder.paymentStatus || 'Pending'} ({selectedOrder.paymentMethod})</p>
                  {selectedOrder.invoiceNumber ? <p><strong>Invoice</strong> {selectedOrder.invoiceNumber}</p> : null}
                </section>

                <section className="orders-detail-block">
                  <h3>Collection</h3>
                  <p><strong>Phone</strong> {selectedOrder.phoneNumber}</p>
                  <p><strong>Pickup</strong> Saranya Jewellery shop</p>
                  <p><strong>Method</strong> Bank Transfer</p>
                  {selectedOrder.paymentReceipt ? <p><strong>Receipt</strong> <a href={selectedOrder.paymentReceipt} target="_blank" rel="noreferrer">View</a></p> : null}
                  {selectedOrder.orderNotes ? <p><strong>Notes</strong> {selectedOrder.orderNotes}</p> : null}
                </section>
              </div>

              <h3 className="orders-items-heading">Order Items</h3>
              <div className="orders-items-list">
                {selectedOrder.items.map((item, idx) => (
                  <div key={`${selectedOrder._id}-${idx}`} className="orders-item-row">
                    <img src={item.imageUrl || '/SaranyaLOGO.jpg'} alt={item.name} loading="lazy" />
                    <div className="orders-item-info">
                      <h4>{item.name}</h4>
                      <p>Qty: {item.quantity}</p>
                      <p className="orders-item-unit">Rs. {Number(item.price || 0).toLocaleString()} each</p>
                    </div>
                    <div className="orders-item-total">Rs. {Number(item.price * item.quantity || 0).toLocaleString()}</div>
                  </div>
                ))}
              </div>

              <div className="orders-modal-summary">
                <div className="cart-summary-row"><span>Subtotal</span><span>Rs. {Number(selectedOrder.subtotal || 0).toLocaleString()}</span></div>
                <div className="cart-summary-row"><span>Tax</span><span>Rs. {Number(selectedOrder.tax || 0).toLocaleString()}</span></div>
                <div className="cart-summary-total"><span>Total</span><strong>Rs. {Number(selectedOrder.total || 0).toLocaleString()}</strong></div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
