import { useEffect, useMemo, useState } from 'react';
import authManager from '../auth.js';

const ZAPIER_CHATBOT_SCRIPT_SRC =
  'https://interfaces.zapier.com/assets/web-components/zapier-interfaces/zapier-interfaces.esm.js';

const ACTIVE_ORDER_STATUSES = [
  'Pending',
  'Confirmed',
  'Invoice Created',
  'Payment Received',
  'Preparing',
  'Ready for Collection'
];

function renderStars(rating) {
  return [1, 2, 3, 4, 5].map((value) => (value <= Number(rating || 0) ? '★' : '☆')).join('');
}

function getDraftKey(orderId, productId) {
    return `${orderId}:${productId}`;
}

export default function CustomerDashboardPage() {
  const [customer, setCustomer] = useState(null);
  const [cart] = useState(() => JSON.parse(localStorage.getItem('saranyaCart') || '[]'));
  const [stats, setStats] = useState({ totalOrders: 0, activeOrders: 0, wishlistCount: 0 });
  const [promotions, setPromotions] = useState([]);
  const [standardOffers, setStandardOffers] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [reviewDrafts, setReviewDrafts] = useState({});
  const [reviewsByItem, setReviewsByItem] = useState({});

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: ''
  });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    [cart]
  );

  useEffect(() => {
    document.title = 'Customer Dashboard - Saranya Jewellery';
  }, []);

  useEffect(() => {
    if (document.querySelector(`script[src="${ZAPIER_CHATBOT_SCRIPT_SRC}"]`)) {
      return;
    }

    const script = document.createElement('script');
    script.src = ZAPIER_CHATBOT_SCRIPT_SRC;
    script.type = 'module';
    script.async = true;
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    async function bootstrap() {
      const loggedInCustomer = await authManager.checkCustomerAuth();
      if (!loggedInCustomer) return;

      setCustomer(loggedInCustomer);
      setProfileForm({
        fullName: loggedInCustomer.fullName || '',
        email: loggedInCustomer.email || '',
        phone: loggedInCustomer.phone || '',
        street: loggedInCustomer.address?.street || '',
        city: loggedInCustomer.address?.city || '',
        state: loggedInCustomer.address?.state || '',
        zipCode: loggedInCustomer.address?.zipCode || '',
        country: loggedInCustomer.address?.country || ''
      });
    }

    bootstrap();
  }, []);

  useEffect(() => {
    if (!customer) return;

    async function loadData() {
      await Promise.all([loadOrderStats(), loadPromotions(), loadStandardOffers(), loadAllOrders()]);
      await loadCustomerReviews();
    }

    loadData();
  }, [customer]);

  async function loadOrderStats() {
    try {
      const response = await authManager.apiRequest('/api/orders/my-orders');
      if (!response.ok) {
        setStats({ totalOrders: 0, activeOrders: 0, wishlistCount: 0 });
        return;
      }

      const orders = await response.json();
      setStats({
        totalOrders: orders.length,
        activeOrders: orders.filter((order) => ACTIVE_ORDER_STATUSES.includes(order.status)).length,
        wishlistCount: 0
      });
    } catch (error) {
      console.error('Error loading order stats:', error);
      setStats({ totalOrders: 0, activeOrders: 0, wishlistCount: 0 });
    }
  }

  async function loadPromotions() {
    try {
      const response = await authManager.apiRequest('/api/messages/active');
      if (!response.ok) {
        setPromotions([]);
        return;
      }

      const messages = await response.json();
      setPromotions(messages || []);
    } catch (error) {
      console.error('Error loading promotions:', error);
      setPromotions([]);
    }
  }

  async function loadStandardOffers() {
    try {
      const response = await authManager.apiRequest('/api/loyalty/offers/standard/active/list');
      if (!response.ok) {
        setStandardOffers([]);
        return;
      }

      const offers = await response.json();
      setStandardOffers(offers || []);
    } catch (error) {
      console.error('Error loading standard offers:', error);
      setStandardOffers([]);
    }
  }

  async function loadAllOrders() {
    try {
      const response = await authManager.apiRequest('/api/orders/my-orders');
      if (!response.ok) throw new Error('Failed to load orders');

      const orders = await response.json();
      setAllOrders(orders || []);
    } catch (error) {
      console.error('Error loading orders:', error);
      setAllOrders([]);
    }
  }

  async function loadCustomerReviews() {
    try {
      // Fetch customer's own reviews from backend
      const response = await authManager.apiRequest('/api/reviews/my/reviews');
      if (!response.ok) return;

      const data = await response.json();
      const reviews = data.reviews || [];

      // Build reviewsByItem map with orderId:productId as key
      const reviewMap = {};
      reviews.forEach((review) => {
        const key = getDraftKey(review.orderId, review.productId);
        reviewMap[key] = review;
      });

      setReviewsByItem(reviewMap);
    } catch (error) {
      console.error('Error loading customer reviews:', error);
    }
  }

  function openProfile() {
    if (!customer) {
      alert('Please wait, loading profile...');
      return;
    }
    setIsProfileOpen(true);
    setIsPasswordOpen(false);
  }

  function openPasswordModal() {
    setIsProfileOpen(false);
    setIsPasswordOpen(true);
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
  }

  function closePasswordModal() {
    setIsPasswordOpen(false);
    setIsProfileOpen(true);
  }

  async function updateProfile(event) {
    event.preventDefault();

    try {
      const response = await authManager.apiRequest('/api/customer/profile', {
        method: 'PUT',
        body: JSON.stringify({
          fullName: profileForm.fullName,
          phone: profileForm.phone,
          address: {
            street: profileForm.street,
            city: profileForm.city,
            state: profileForm.state,
            zipCode: profileForm.zipCode,
            country: profileForm.country
          }
        })
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || 'Failed to update profile');

      setCustomer(payload.customer);
      alert('Profile updated successfully!');
      setIsProfileOpen(false);
    } catch (error) {
      alert(error.message || 'Failed to update profile. Please try again.');
    }
  }

  async function changePassword(event) {
    event.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('New passwords do not match!');
      return;
    }

    try {
      const response = await authManager.apiRequest('/api/customer/change-password', {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || 'Failed to change password');

      alert('Password changed successfully!');
      setIsPasswordOpen(false);
    } catch (error) {
      alert(error.message || 'Failed to change password. Please try again.');
    }
  }

  async function saveReview(orderId, productId, productName) {
    const key = getDraftKey(orderId, productId);
    const draft = reviewDrafts[key] || { rating: 0, comment: '' };
    const rating = Number(draft.rating || 0);

    if (rating < 1 || rating > 5) {
      alert('Please select a rating between 1 and 5 stars.');
      return;
    }

    try {
      const response = await authManager.apiRequest('/api/reviews', {
        method: 'POST',
        body: JSON.stringify({
          orderId,
          productId,
          rating,
          title: `${productName} Review`,
          comment: draft.comment || ''
        })
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || 'Failed to save review');

      // Store the review and clear the draft
      setReviewsByItem((prev) => ({
        ...prev,
        [key]: payload.review
      }));
      setReviewDrafts((prev) => ({
        ...prev,
        [key]: { rating: 0, comment: '' }
      }));
      
      // Reload reviews from backend to ensure persistence
      await loadCustomerReviews();
      alert('Review saved successfully. Please wait for customer care approval to see it on the product page.');
    } catch (error) {
      alert(error.message || 'Failed to save review');
    }
  }

  async function deleteReview(reviewId, orderId, productId) {
    if (!reviewId) return;
    if (!window.confirm('Delete this rating and review?')) return;

    try {
      const response = await authManager.apiRequest(`/api/reviews/${reviewId}`, { method: 'DELETE' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || 'Failed to delete review');

      // Remove the review from state
      const key = getDraftKey(orderId, productId);
      setReviewsByItem((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      
      alert('Review deleted successfully.');
    } catch (error) {
      alert(error.message || 'Failed to delete review');
    }
  }

  function logout() {
    authManager.logout();
  }

  return (
    <>
      <div className="top-bar">
        <div>
          <i className="fas fa-phone" /> <a href="tel:+1234567890">Contact Us</a>
        </div>
        <div>
          <span style={{ marginRight: '1rem', color: 'var(--brand-gold-strong)' }}>{customer?.fullName || customer?.email || 'Loading...'}</span>
          <span style={{ marginRight: '1rem' }}>Loyalty: {customer?.loyaltyPoints || 0} Points</span>
          <button type="button" className="logout-btn" onClick={logout} style={{ fontSize: '0.85rem', padding: '0.3rem 0.8rem' }}>
            Logout
          </button>
        </div>
      </div>

      <header className="header">
        <div className="nav">
          <a href="/">Home</a>
          <a href="/customer-shop">Shop</a>
          <a href="/customer-orders">My Orders</a>
          <a href="/customer-loyalty">Loyalty</a>
          <a href="/customer-support">Support</a>
        </div>

        <div className="logo">SARANYA JEWELLERY</div>

        <div className="header-icons">
          <i className="fas fa-search header-icon" />
          <i className="fas fa-user header-icon" onClick={openProfile} style={{ cursor: 'pointer' }} />
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
        <div className="dashboard-container">
          <div className="welcome-section">
            <h2>Welcome Back</h2>
            <p>Discover our latest collections and manage your orders</p>
          </div>

          <div style={{
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '10px',
            padding: '1rem',
            marginBottom: '1.5rem',
            display: 'flex',
            gap: '0.75rem',
            flexWrap: 'wrap',
            justifyContent: 'flex-end'
          }}>
            <button
              type="button"
              onClick={openProfile}
              style={{
                background: '#6c757d',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                padding: '0.65rem 1rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Edit Account
            </button>
            <button
              type="button"
              onClick={logout}
              style={{
                background: '#dc3545',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                padding: '0.65rem 1rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Logout
            </button>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon"><i className="fas fa-box" /></div>
              <h3 className="stat-number">{stats.totalOrders}</h3>
              <p className="stat-label">Total Orders</p>
            </div>
            <div className="stat-card">
              <div className="stat-icon"><i className="fas fa-gem" /></div>
              <h3 className="stat-number">{customer?.loyaltyPoints || 0}</h3>
              <p className="stat-label">Loyalty Points</p>
            </div>
            <div className="stat-card">
              <div className="stat-icon"><i className="fas fa-truck" /></div>
              <h3 className="stat-number">{stats.activeOrders}</h3>
              <p className="stat-label">Active Orders</p>
            </div>
            <div className="stat-card">
              <div className="stat-icon"><i className="fas fa-heart" /></div>
              <h3 className="stat-number">{stats.wishlistCount}</h3>
              <p className="stat-label">Wishlist Items</p>
            </div>
          </div>

          {(promotions.length > 0 || standardOffers.length > 0) ? (
            <div className="section">
              <div className="section-header">
                <h2>Latest Offers and Announcements</h2>
              </div>
              <div className="section-content">
                {standardOffers.map((offer) => (
                  <div
                    key={offer._id}
                    style={{
                      background: 'linear-gradient(135deg, #6f0022 0%, #8b0028 100%)',
                      color: 'white',
                      padding: '1.5rem',
                      borderRadius: '8px',
                      marginBottom: '1rem',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                      border: '2px solid var(--brand-gold-strong)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'start', gap: '1rem' }}>
                      <div style={{ fontSize: '2rem' }}><i className="fas fa-tag" /></div>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--brand-gold-strong)' }}>{offer.title}</h3>
                        <p style={{ margin: '0 0 0.75rem 0', lineHeight: 1.6 }}>{offer.description}</p>
                        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.95rem', marginBottom: '0.75rem' }}>
                          {offer.discountPercentage > 0 && (
                            <div>
                              <span style={{ color: 'var(--brand-gold-strong)', fontWeight: 600 }}>{offer.discountPercentage}%</span>
                              <span style={{ color: '#ddd' }}> Discount</span>
                            </div>
                          )}
                          {offer.discountAmount > 0 && (
                            <div>
                              <span style={{ color: 'var(--brand-gold-strong)', fontWeight: 600 }}>Rs. {offer.discountAmount}</span>
                              <span style={{ color: '#ddd' }}> Off</span>
                            </div>
                          )}
                          {offer.couponCode && (
                            <div>
                              <span style={{ color: '#ddd' }}>Code: </span>
                              <span style={{ color: 'var(--brand-gold-strong)', fontWeight: 600, fontFamily: 'monospace' }}>{offer.couponCode}</span>
                            </div>
                          )}
                        </div>
                        {offer.validUntil ? (
                          <p style={{ fontSize: '0.85rem', color: '#ddd', margin: 0 }}>
                            Valid until: {new Date(offer.validUntil).toLocaleDateString()}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}

                {promotions.map((msg) => {
                  const iconClass =
                    msg.type === 'promotion'
                      ? 'fa-gift'
                      : msg.type === 'announcement'
                        ? 'fa-bullhorn'
                        : msg.type === 'welcome'
                          ? 'fa-handshake'
                          : 'fa-circle-info';

                  return (
                    <div
                      key={msg._id || msg.title}
                      style={{
                        background: 'linear-gradient(135deg, #6f0022 0%, #8b0028 100%)',
                        color: 'white',
                        padding: '1.5rem',
                        borderRadius: '8px',
                        marginBottom: '1rem',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'start', gap: '1rem' }}>
                        <div style={{ fontSize: '2rem' }}><i className={`fas ${iconClass}`} /></div>
                        <div style={{ flex: 1 }}>
                          <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--brand-gold-strong)' }}>{msg.title}</h3>
                          <p style={{ margin: 0, lineHeight: 1.6 }}>{msg.message}</p>
                          {msg.validUntil ? (
                            <p style={{ fontSize: '0.85rem', color: '#ddd', marginTop: '0.5rem' }}>
                              Valid until: {new Date(msg.validUntil).toLocaleDateString()}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="section" style={{ marginTop: '2rem' }}>
            <div className="section-header">
              <h2>Rate Your Purchased Items</h2>
            </div>
            <div className="section-content">
              {!allOrders.length ? (
                <div className="empty-state">
                  <i className="fas fa-star" style={{ fontSize: '2.5rem', color: '#ddd', marginBottom: '1rem' }} />
                  <p style={{ margin: 0 }}>Place an order to start adding product reviews.</p>
                </div>
              ) : (
                allOrders.map((order) => (
                  <div key={order._id} style={{ marginBottom: '2rem', background: '#faf8f3', border: '1px solid #eee', borderRadius: '8px', padding: '1.5rem' }}>
                    <div style={{ marginBottom: '1rem' }}>
                      <h4 style={{ margin: '0 0 0.5rem', color: 'var(--brand-burgundy)' }}>Order #{order.orderNumber}</h4>
                      <p style={{ margin: '0.3rem 0', color: '#666', fontSize: '0.9rem' }}>
                        {new Date(order.createdAt).toLocaleDateString()} • <span style={{ color: 'var(--brand-burgundy)', fontWeight: 600 }}>{order.status}</span>
                      </p>
                    </div>

                    <div style={{ display: 'grid', gap: '1rem' }}>
                      {order.items.map((item, idx) => {
                        const draftKey = getDraftKey(order._id, item.productId);
                        const draft = reviewDrafts[draftKey] || { rating: 0, comment: '' };
                        const savedReview = reviewsByItem[draftKey];

                        return (
                          <div key={idx} style={{ background: 'white', border: '1px solid #ddd', borderRadius: '6px', padding: '1rem', display: 'flex', gap: '1rem' }}>
                            <img
                              src={item.imageUrl || '/SaranyaLOGO.jpg'}
                              alt={item.name}
                              style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '4px' }}
                            />
                            <div style={{ flex: 1 }}>
                              <h5 style={{ margin: '0 0 0.3rem', color: 'var(--brand-burgundy)' }}>{item.name}</h5>
                              <p style={{ margin: '0.2rem 0', color: '#666', fontSize: '0.9rem' }}>{item.category} - {item.karat}</p>
                              <p style={{ margin: '0.2rem 0', color: '#666', fontSize: '0.9rem' }}>Qty: {item.quantity} • Price: Rs. {item.price?.toLocaleString()}</p>

                              {!savedReview ? (
                                <>
                                  <div style={{ marginTop: '0.8rem', display: 'flex', gap: '0.35rem', marginBottom: '0.6rem' }}>
                                    {[1, 2, 3, 4, 5].map((starValue) => (
                                      <button
                                        key={starValue}
                                        type="button"
                                        onClick={() => {
                                          setReviewDrafts((prev) => ({
                                            ...prev,
                                            [draftKey]: { ...draft, rating: starValue }
                                          }));
                                        }}
                                        style={{
                                          border: 'none',
                                          background: 'transparent',
                                          cursor: 'pointer',
                                          fontSize: '1.2rem',
                                          lineHeight: 1,
                                          color: starValue <= Number(draft.rating || 0) ? '#e0bf63' : '#ddd'
                                        }}
                                      >
                                        ★
                                      </button>
                                    ))}
                                  </div>

                                  <textarea
                                    rows={2}
                                    maxLength={1000}
                                    placeholder="Write a short review (optional)"
                                    style={{ width: '100%', border: '1px solid #ddd', borderRadius: '4px', padding: '0.5rem', marginBottom: '0.6rem', fontSize: '0.9rem' }}
                                    value={draft.comment}
                                    onChange={(e) => {
                                      setReviewDrafts((prev) => ({
                                        ...prev,
                                        [draftKey]: { ...draft, comment: e.target.value }
                                      }));
                                    }}
                                  />

                                  <button
                                    type="button"
                                    onClick={() => saveReview(order._id, item.productId, item.name)}
                                    style={{
                                      background: 'var(--brand-burgundy)',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '4px',
                                      padding: '0.6rem 1.2rem',
                                      cursor: 'pointer',
                                      fontWeight: 600,
                                      fontSize: '0.9rem'
                                    }}
                                  >
                                    Add Review
                                  </button>
                                </>
                              ) : (
                                <div style={{ marginTop: '0.8rem', background: '#f5f5f5', borderRadius: '4px', padding: '0.8rem' }}>
                                  <p style={{ margin: '0 0 0.3rem', color: '#666', fontSize: '0.85rem', fontWeight: 600 }}>
                                    Your Review: <span style={{ color: '#e0bf63' }}>{renderStars(savedReview.rating)}</span>
                                  </p>
                                  {savedReview.comment && (
                                    <p style={{ margin: '0.3rem 0', color: '#333', fontSize: '0.9rem' }}>{savedReview.comment}</p>
                                  )}
                                  {savedReview.staffReply?.reply && (
                                    <div style={{ marginTop: '0.5rem', borderLeft: '3px solid #6f0022', paddingLeft: '0.5rem' }}>
                                      <p style={{ margin: '0 0 0.2rem', color: '#6f0022', fontSize: '0.8rem', fontWeight: 600 }}>Staff Reply:</p>
                                      <p style={{ margin: 0, color: '#555', fontSize: '0.85rem' }}>{savedReview.staffReply.reply}</p>
                                    </div>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => deleteReview(savedReview._id, order._id, item.productId)}
                                    style={{
                                      marginTop: '0.5rem',
                                      background: '#dc3545',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '4px',
                                      padding: '0.5rem 1rem',
                                      cursor: 'pointer',
                                      fontWeight: 600,
                                      fontSize: '0.85rem'
                                    }}
                                  >
                                    Delete Review
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </main>

      {isProfileOpen ? (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, overflowY: 'auto' }}>
          <div style={{ maxWidth: '600px', margin: '2rem auto', background: 'white', borderRadius: '8px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, color: 'var(--brand-burgundy)' }}>Edit Profile</h2>
              <button
                type="button"
                onClick={() => setIsProfileOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#999' }}
              >
                ×
              </button>
            </div>

            <form onSubmit={updateProfile}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Full Name *</label>
                <input
                  type="text"
                  required
                  value={profileForm.fullName}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, fullName: e.target.value }))}
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Email (Read Only)</label>
                <input
                  type="email"
                  readOnly
                  value={profileForm.email}
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px', background: '#f5f5f5' }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Phone Number</label>
                <input
                  type="tel"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value }))}
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>

              <h3 style={{ margin: '2rem 0 1rem', color: 'var(--brand-burgundy)', fontSize: '1.1rem' }}>Address</h3>

              <div style={{ marginBottom: '1rem' }}>
                <input
                  type="text"
                  placeholder="Street"
                  value={profileForm.street}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, street: e.target.value }))}
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <input
                  type="text"
                  placeholder="City"
                  value={profileForm.city}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, city: e.target.value }))}
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px' }}
                />
                <input
                  type="text"
                  placeholder="State"
                  value={profileForm.state}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, state: e.target.value }))}
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <input
                  type="text"
                  placeholder="ZIP Code"
                  value={profileForm.zipCode}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, zipCode: e.target.value }))}
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px' }}
                />
                <input
                  type="text"
                  placeholder="Country"
                  value={profileForm.country}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, country: e.target.value }))}
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  type="button"
                  onClick={openPasswordModal}
                  style={{ flex: 1, background: '#6c757d', color: 'white', border: 'none', padding: '1rem', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Change Password
                </button>
                <button
                  type="submit"
                  style={{ flex: 1, background: 'var(--brand-burgundy)', color: 'white', border: 'none', padding: '1rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isPasswordOpen ? (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1001, overflowY: 'auto' }}>
          <div style={{ maxWidth: '500px', margin: '4rem auto', background: 'white', borderRadius: '8px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, color: 'var(--brand-burgundy)' }}>Change Password</h2>
              <button
                type="button"
                onClick={closePasswordModal}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#999' }}
              >
                ×
              </button>
            </div>

            <form onSubmit={changePassword}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Current Password *</label>
                <input
                  type="password"
                  required
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>New Password *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Confirm New Password *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  type="button"
                  onClick={closePasswordModal}
                  style={{ flex: 1, background: '#6c757d', color: 'white', border: 'none', padding: '1rem', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ flex: 1, background: 'var(--brand-burgundy)', color: 'white', border: 'none', padding: '1rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <zapier-interfaces-chatbot-embed
        is-popup="true"
        chatbot-id="cmo5zldf1004p4ftzwiocldrz"
      />
    </>
  );
}
