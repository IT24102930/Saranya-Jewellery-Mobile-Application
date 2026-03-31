import { useEffect, useMemo, useState } from 'react';
import authManager from '../auth.js';

const FILTERS = ['all', 'Pending', 'Confirmed', 'Invoice Created', 'Payment Received', 'Preparing', 'Ready for Collection', 'Completed', 'Cancelled'];

const STATUS_COLORS = {
  Pending: '#ffc107',
  Confirmed: '#17a2b8',
  'Invoice Created': '#6f42c1',
  'Payment Received': '#28a745',
  Preparing: '#007bff',
  'Ready for Collection': '#20c997',
  Completed: '#28a745',
  Cancelled: '#dc3545',
  Refunded: '#e83e8c'
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
          <a href="/customer-dashboard?openProfile=true"><i className="fas fa-user header-icon" /></a>
          <a href="/customer-cart" style={{ position: 'relative' }}>
            <i className="fas fa-shopping-cart header-icon" />
            {cartCount > 0 ? (
              <span
                style={{
                  position: 'absolute',
                  top: '-8px',
                  right: '-8px',
                  background: 'var(--brand-gold-strong)',
                  color: 'white',
                  borderRadius: '50%',
                  padding: '2px 6px',
                  fontSize: '0.7rem'
                }}
              >
                {cartCount}
              </span>
            ) : null}
          </a>
        </div>
      </header>

      <main>
        <div className="container" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
          <h1 style={{ textAlign: 'center', marginBottom: '2rem', fontFamily: "'Cormorant Garamond', serif", color: 'var(--brand-burgundy)' }}>My Orders</h1>

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {FILTERS.map((status) => (
              <button
                key={status}
                type="button"
                className={`filter-btn ${filter === status ? 'active' : ''}`}
                onClick={() => setFilter(status)}
              >
                {status === 'all' ? 'All Orders' : status}
              </button>
            ))}
          </div>

          {loading ? <div style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>Loading orders...</div> : null}
          {!loading && filteredOrders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', background: 'white', borderRadius: '8px' }}>
              <i className="fas fa-box" style={{ fontSize: '4rem', color: '#ddd', marginBottom: '1rem' }} />
              <h2 style={{ color: '#999', marginBottom: '1rem' }}>No orders found</h2>
              <a href="/customer-shop" style={{ display: 'inline-block', background: 'var(--brand-burgundy)', color: 'white', padding: '1rem 2rem', borderRadius: '4px', textDecoration: 'none' }}>
                Start Shopping
              </a>
            </div>
          ) : null}

          {!loading
            ? filteredOrders.map((order) => {
                const isReady = order.status === 'Ready for Collection';

                return (
                  <div
                    key={order._id}
                    style={{
                      background: 'white',
                      padding: '1.5rem',
                      borderRadius: '8px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                      marginBottom: '1rem',
                      border: isReady ? '2px solid #20c997' : 'none'
                    }}
                  >
                    {isReady ? (
                      <div style={{ background: '#d1f2eb', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', textAlign: 'center' }}>
                        <p style={{ margin: 0, fontWeight: 700, color: '#0d6655', fontSize: '1.1rem' }}>Your jewellery is ready for collection</p>
                        <p style={{ margin: '0.25rem 0 0', color: '#0d6655' }}>Please visit Saranya Jewellery to collect your order.</p>
                      </div>
                    ) : null}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                      <div>
                        <h3 style={{ margin: '0 0 0.5rem', color: 'var(--brand-burgundy)' }}>Order #{order.orderNumber}</h3>
                        <p style={{ color: '#666', margin: '0.25rem 0', fontSize: '0.9rem' }}>
                          <i className="fas fa-calendar" /> {new Date(order.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                        <p style={{ color: '#666', margin: '0.25rem 0', fontSize: '0.9rem' }}><i className="fas fa-box" /> {order.items.length} item(s)</p>
                        {order.invoiceNumber ? (
                          <p style={{ color: '#666', margin: '0.25rem 0', fontSize: '0.9rem' }}><i className="fas fa-file-invoice" /> Invoice: {order.invoiceNumber}</p>
                        ) : null}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '0.5rem 1rem',
                            borderRadius: '20px',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            background: STATUS_COLORS[order.status] || '#999',
                            color: 'white'
                          }}
                        >
                          {order.status}
                        </span>
                        <p style={{ fontSize: '1.3rem', fontWeight: 600, margin: '0.5rem 0 0', color: 'var(--brand-gold-strong)' }}>
                          Rs. {Number(order.total || 0).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                      {order.items.slice(0, 4).map((item, idx) => (
                        <img
                          key={`${order._id}-${idx}`}
                          src={item.imageUrl || '/SaranyaLOGO.jpg'}
                          alt={item.name}
                          style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '4px', flexShrink: 0 }}
                        />
                      ))}
                      {order.items.length > 4 ? (
                        <div style={{ width: '80px', height: '80px', background: '#f0f0f0', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          +{order.items.length - 4}
                        </div>
                      ) : null}
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      <button type="button" onClick={() => viewOrderDetails(order._id)} style={{ flex: 1, minWidth: '150px', background: 'var(--brand-burgundy)', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '4px', cursor: 'pointer' }}>
                        <i className="fas fa-eye" /> View Details
                      </button>
                      {order.status === 'Completed' ? (
                        <button type="button" onClick={() => reorder(order._id)} style={{ flex: 1, minWidth: '150px', background: 'var(--brand-gold-strong)', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '4px', cursor: 'pointer' }}>
                          <i className="fas fa-redo" /> Reorder
                        </button>
                      ) : null}
                      {order.status === 'Pending' ? (
                        <button type="button" onClick={() => cancelOrder(order._id)} style={{ flex: 1, minWidth: '150px', background: '#dc3545', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '4px', cursor: 'pointer' }}>
                          <i className="fas fa-times" /> Cancel Order
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })
            : null}
        </div>
      </main>

      {selectedOrder ? (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', overflowY: 'auto', padding: '2rem' }}>
          <div style={{ background: 'white', borderRadius: '8px', maxWidth: '900px', width: '100%', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
            <button type="button" onClick={() => setSelectedOrder(null)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', fontSize: '2rem', cursor: 'pointer', color: '#999', zIndex: 10 }}>
              ×
            </button>

            <div style={{ padding: '2rem' }}>
              <h2 style={{ margin: '0 0 1.5rem', fontFamily: "'Cormorant Garamond', serif", color: 'var(--brand-burgundy)' }}>Order Details</h2>

              {selectedOrder.status === 'Ready for Collection' ? (
                <div style={{ background: '#d1f2eb', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem', textAlign: 'center' }}>
                  <h3 style={{ margin: '0 0 0.5rem', color: '#0d6655' }}>Ready for Collection</h3>
                  <p style={{ margin: 0, color: '#0d6655' }}>Your jewellery is ready. Please visit <strong>Saranya Jewellery</strong> to collect your order.</p>
                </div>
              ) : null}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                <div>
                  <h3 style={{ margin: '0 0 1rem', color: '#333' }}>Order Information</h3>
                  <p style={{ margin: '0.5rem 0' }}><strong>Order Number:</strong> {selectedOrder.orderNumber}</p>
                  <p style={{ margin: '0.5rem 0' }}><strong>Order Date:</strong> {new Date(selectedOrder.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  <p style={{ margin: '0.5rem 0' }}>
                    <strong>Status:</strong>{' '}
                    <span style={{ display: 'inline-block', padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 600, background: STATUS_COLORS[selectedOrder.status] || '#999', color: 'white', marginLeft: '0.5rem' }}>
                      {selectedOrder.status}
                    </span>
                  </p>
                  <p style={{ margin: '0.5rem 0' }}><strong>Payment:</strong> {selectedOrder.paymentStatus || 'Pending'} ({selectedOrder.paymentMethod})</p>
                  {selectedOrder.invoiceNumber ? <p style={{ margin: '0.5rem 0' }}><strong>Invoice:</strong> {selectedOrder.invoiceNumber}</p> : null}
                </div>

                <div>
                  <h3 style={{ margin: '0 0 1rem', color: '#333' }}>Collection Information</h3>
                  <p style={{ margin: '0.5rem 0' }}><strong>Phone:</strong> {selectedOrder.phoneNumber}</p>
                  <p style={{ margin: '0.5rem 0' }}><strong>Collection:</strong> Visit Saranya Jewellery shop</p>
                  <p style={{ margin: '0.5rem 0' }}><strong>Payment:</strong> Bank Transfer</p>
                  {selectedOrder.paymentReceipt ? <p style={{ margin: '0.5rem 0' }}><strong>Receipt:</strong> <a href={selectedOrder.paymentReceipt} target="_blank" rel="noreferrer" style={{ color: 'var(--brand-burgundy)' }}>View Receipt</a></p> : null}
                  {selectedOrder.orderNotes ? <p style={{ margin: '0.5rem 0' }}><strong>Notes:</strong> {selectedOrder.orderNotes}</p> : null}
                </div>
              </div>

              <h3 style={{ margin: '0 0 1rem', color: '#333' }}>Order Items</h3>
              <div style={{ marginBottom: '2rem' }}>
                {selectedOrder.items.map((item, idx) => (
                  <div key={`${selectedOrder._id}-${idx}`} style={{ display: 'flex', gap: '1rem', padding: '1rem', border: '1px solid #eee', borderRadius: '4px', marginBottom: '1rem' }}>
                    <img src={item.imageUrl || '/SaranyaLOGO.jpg'} alt={item.name} style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '4px' }} />
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: '0 0 0.5rem', color: 'var(--brand-burgundy)' }}>{item.name}</h4>
                      <p style={{ color: '#666', margin: '0.25rem 0', fontSize: '0.9rem' }}>Quantity: {item.quantity}</p>
                      <p style={{ color: 'var(--brand-gold-strong)', fontWeight: 600, margin: '0.25rem 0' }}>Rs. {Number(item.price || 0).toLocaleString()} each</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontWeight: 600, fontSize: '1.1rem', margin: 0 }}>Rs. {Number(item.price * item.quantity || 0).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ background: '#f8f9fa', padding: '1.5rem', borderRadius: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}><span>Subtotal:</span><span>Rs. {Number(selectedOrder.subtotal || 0).toLocaleString()}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}><span>Tax:</span><span>Rs. {Number(selectedOrder.tax || 0).toLocaleString()}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 600, paddingTop: '0.5rem', borderTop: '2px solid #ddd', marginTop: '0.5rem' }}>
                  <span>Total:</span>
                  <span style={{ color: 'var(--brand-gold-strong)' }}>Rs. {Number(selectedOrder.total || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
