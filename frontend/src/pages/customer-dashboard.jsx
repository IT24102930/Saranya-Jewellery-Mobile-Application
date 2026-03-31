import { useEffect, useMemo, useState } from 'react';
import authManager from '../auth.js';

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

function getDraftKey(item) {
  return `${item.orderId}:${item.productId}`;
}

export default function CustomerDashboardPage() {
  const [customer, setCustomer] = useState(null);
  const [cart] = useState(() => JSON.parse(localStorage.getItem('saranyaCart') || '[]'));
  const [stats, setStats] = useState({ totalOrders: 0, activeOrders: 0, wishlistCount: 0 });
  const [promotions, setPromotions] = useState([]);
  const [reviewItems, setReviewItems] = useState([]);
  const [reviewDrafts, setReviewDrafts] = useState({});

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
      await Promise.all([loadOrderStats(), loadPromotions(), loadReviewItems()]);
    }

    loadData();
  }, [customer]);

  useEffect(() => {
    if (!customer) return;
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('openProfile') === 'true') {
      setIsProfileOpen(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
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

  async function loadReviewItems() {
    try {
      const response = await authManager.apiRequest('/api/reviews/customer/eligible-items');
      if (!response.ok) throw new Error('Failed to load review items');

      const items = await response.json();
      setReviewItems(items);

      const nextDrafts = {};
      items.forEach((item) => {
        const key = getDraftKey(item);
        nextDrafts[key] = {
          rating: item.review?.rating || 0,
          comment: item.review?.comment || ''
        };
      });
      setReviewDrafts(nextDrafts);
    } catch (error) {
      console.error('Error loading review items:', error);
      setReviewItems([]);
      setReviewDrafts({});
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

  async function saveReview(item) {
    const key = getDraftKey(item);
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
          orderId: item.orderId,
          productId: item.productId,
          rating,
          comment: draft.comment || ''
        })
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || 'Failed to save review');

      alert('Review saved successfully.');
      await loadReviewItems();
    } catch (error) {
      alert(error.message || 'Failed to save review');
    }
  }

  async function deleteReview(reviewId) {
    if (!reviewId) return;
    if (!window.confirm('Delete this rating and review?')) return;

    try {
      const response = await authManager.apiRequest(`/api/reviews/${reviewId}`, { method: 'DELETE' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || 'Failed to delete review');

      alert('Review deleted successfully.');
      await loadReviewItems();
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

          {promotions.length > 0 ? (
            <div className="section">
              <div className="section-header">
                <h2>Latest Offers and Announcements</h2>
              </div>
              <div className="section-content">
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
              {!reviewItems.length ? (
                <div className="empty-state">
                  <i className="fas fa-star" style={{ fontSize: '2.5rem', color: '#ddd', marginBottom: '1rem' }} />
                  <p style={{ margin: 0 }}>Place an order to start adding product reviews.</p>
                </div>
              ) : (
                reviewItems.slice(0, 20).map((item) => {
                  const key = getDraftKey(item);
                  const draft = reviewDrafts[key] || { rating: 0, comment: '' };

                  return (
                    <div key={key} style={{ border: '1px solid #eee', borderRadius: '10px', padding: '1rem', marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '0.9rem' }}>
                        <img
                          src={item.productImage || '/SaranyaLOGO.jpg'}
                          alt={item.productName}
                          style={{ width: '70px', height: '70px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #eee' }}
                        />
                        <div style={{ flex: 1 }}>
                          <h4 style={{ margin: '0 0 0.3rem', color: 'var(--brand-burgundy)' }}>{item.productName}</h4>
                          <p style={{ margin: '0.2rem 0', color: '#666', fontSize: '0.9rem' }}>
                            Order: {item.orderNumber} • {new Date(item.orderDate).toLocaleDateString()}
                          </p>
                          <p style={{ margin: '0.2rem 0', color: '#666', fontSize: '0.9rem' }}>Status: {item.orderStatus}</p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.6rem' }}>
                        {[1, 2, 3, 4, 5].map((starValue) => (
                          <button
                            key={starValue}
                            type="button"
                            onClick={() => {
                              setReviewDrafts((prev) => ({
                                ...prev,
                                [key]: { ...draft, rating: starValue }
                              }));
                            }}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              cursor: 'pointer',
                              fontSize: '1.35rem',
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
                        style={{ width: '100%', border: '1px solid #ddd', borderRadius: '6px', padding: '0.65rem', marginBottom: '0.6rem' }}
                        value={draft.comment}
                        onChange={(event) => {
                          const comment = event.target.value;
                          setReviewDrafts((prev) => ({
                            ...prev,
                            [key]: { ...draft, comment }
                          }));
                        }}
                      />

                      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={() => saveReview(item)}
                          style={{
                            background: 'var(--brand-burgundy)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '0.6rem 1rem',
                            cursor: 'pointer',
                            fontWeight: 600
                          }}
                        >
                          {item.review ? 'Update Review' : 'Submit Review'}
                        </button>

                        {item.review ? (
                          <button
                            type="button"
                            onClick={() => deleteReview(item.review._id)}
                            style={{
                              background: '#dc3545',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '0.6rem 1rem',
                              cursor: 'pointer',
                              fontWeight: 600
                            }}
                          >
                            Delete Rating
                          </button>
                        ) : null}
                      </div>

                      {item.review ? (
                        <div style={{ marginTop: '0.9rem', background: '#faf7ee', borderRadius: '6px', padding: '0.8rem' }}>
                          <p style={{ margin: '0 0 0.35rem', color: '#666', fontSize: '0.9rem' }}>
                            Your review: <span style={{ color: '#e0bf63' }}>{renderStars(item.review.rating)}</span>
                          </p>
                          {item.review.careReply?.comment ? (
                            <p style={{ margin: 0, color: '#6f0022', fontSize: '0.92rem' }}>
                              <strong>Customer Care Reply:</strong> {item.review.careReply.comment}
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  );
                })
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
    </>
  );
}
