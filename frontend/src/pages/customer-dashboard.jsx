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
      const response = await authManager.apiRequest('/api/reviews/my/reviews');
      if (!response.ok) return;

      const data = await response.json();
      const reviews = data.reviews || [];

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

      setReviewsByItem((prev) => ({ ...prev, [key]: payload.review }));
      setReviewDrafts((prev) => ({ ...prev, [key]: { rating: 0, comment: '' } }));

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

  const initials = (customer?.fullName || customer?.email || '?')
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <>
      <div className="top-bar">
        <div>
          <i className="fas fa-phone" /> <a href="tel:+1234567890">Contact Us</a>
        </div>
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
              <span style={{ position: 'absolute', top: '-8px', right: '-8px', background: 'var(--brand-gold-strong)', color: 'white', borderRadius: '50%', padding: '2px 6px', fontSize: '0.7rem' }}>
                {cartCount}
              </span>
            ) : null}
          </a>
        </div>
      </header>

      <main className="dash-page">
        <section className="dash-greeting">
          <div className="dash-avatar">{initials}</div>
          <div className="dash-greeting-info">
            <p className="dash-greeting-hello">Welcome back,</p>
            <h1 className="dash-greeting-name">{customer?.fullName || customer?.email || 'Loading…'}</h1>
            {customer?.loyaltyTier ? <span className="dash-tier-badge">{customer.loyaltyTier} Tier</span> : null}
          </div>
        </section>

        <div className="dash-quick-actions">
          <button type="button" onClick={openProfile} className="dash-action-btn">
            <i className="fas fa-user-edit" />
            <span>Edit Account</span>
          </button>
          <a href="/customer-orders" className="dash-action-btn">
            <i className="fas fa-box" />
            <span>My Orders</span>
          </a>
          <a href="/customer-shop" className="dash-action-btn">
            <i className="fas fa-gem" />
            <span>Shop</span>
          </a>
          <a href="/customer-support" className="dash-action-btn">
            <i className="fas fa-headset" />
            <span>Support</span>
          </a>
          <button type="button" onClick={logout} className="dash-action-btn dash-action-danger">
            <i className="fas fa-sign-out-alt" />
            <span>Logout</span>
          </button>
        </div>

        <section className="dash-stats">
          <div className="dash-stat">
            <div className="dash-stat-icon"><i className="fas fa-box" /></div>
            <div className="dash-stat-text">
              <span className="dash-stat-num">{stats.totalOrders}</span>
              <span className="dash-stat-label">Total Orders</span>
            </div>
          </div>
          <div className="dash-stat">
            <div className="dash-stat-icon dash-stat-icon-gold"><i className="fas fa-gem" /></div>
            <div className="dash-stat-text">
              <span className="dash-stat-num">{customer?.loyaltyPoints || 0}</span>
              <span className="dash-stat-label">Loyalty Points</span>
            </div>
          </div>
          <div className="dash-stat">
            <div className="dash-stat-icon"><i className="fas fa-truck" /></div>
            <div className="dash-stat-text">
              <span className="dash-stat-num">{stats.activeOrders}</span>
              <span className="dash-stat-label">Active</span>
            </div>
          </div>
          <div className="dash-stat">
            <div className="dash-stat-icon"><i className="fas fa-heart" /></div>
            <div className="dash-stat-text">
              <span className="dash-stat-num">{stats.wishlistCount}</span>
              <span className="dash-stat-label">Wishlist</span>
            </div>
          </div>
        </section>

        {(promotions.length > 0 || standardOffers.length > 0) ? (
          <section className="dash-section">
            <h2 className="dash-section-title">Latest Offers & Announcements</h2>
            <div className="dash-offers">
              {standardOffers.map((offer) => (
                <article key={offer._id} className="dash-offer-card">
                  <div className="dash-offer-icon"><i className="fas fa-tag" /></div>
                  <div className="dash-offer-body">
                    <h3>{offer.title}</h3>
                    <p>{offer.description}</p>
                    <div className="dash-offer-meta">
                      {offer.discountPercentage > 0 ? <span className="dash-offer-pill">{offer.discountPercentage}% Off</span> : null}
                      {offer.discountAmount > 0 ? <span className="dash-offer-pill">Rs. {offer.discountAmount} Off</span> : null}
                      {offer.couponCode ? <span className="dash-offer-code">Code: <code>{offer.couponCode}</code></span> : null}
                    </div>
                    {offer.validUntil ? (
                      <p className="dash-offer-valid">Valid until {new Date(offer.validUntil).toLocaleDateString()}</p>
                    ) : null}
                  </div>
                </article>
              ))}

              {promotions.map((msg) => {
                const iconClass =
                  msg.type === 'promotion' ? 'fa-gift'
                    : msg.type === 'announcement' ? 'fa-bullhorn'
                      : msg.type === 'welcome' ? 'fa-handshake'
                        : 'fa-circle-info';

                return (
                  <article key={msg._id || msg.title} className="dash-offer-card">
                    <div className="dash-offer-icon"><i className={`fas ${iconClass}`} /></div>
                    <div className="dash-offer-body">
                      <h3>{msg.title}</h3>
                      <p>{msg.message}</p>
                      {msg.validUntil ? <p className="dash-offer-valid">Valid until {new Date(msg.validUntil).toLocaleDateString()}</p> : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}

        <section className="dash-section">
          <h2 className="dash-section-title">Rate Your Purchased Items</h2>
          {!allOrders.length ? (
            <div className="dash-empty">
              <i className="fas fa-star dash-empty-icon" />
              <p>Place an order to start adding product reviews.</p>
            </div>
          ) : (
            <div className="dash-reviews">
              {allOrders.map((order) => (
                <div key={order._id} className="dash-review-order">
                  <div className="dash-review-order-head">
                    <h4>Order #{order.orderNumber}</h4>
                    <p>{new Date(order.createdAt).toLocaleDateString()} · <span className="dash-review-status">{order.status}</span></p>
                  </div>

                  <div className="dash-review-list">
                    {order.items.map((item, idx) => {
                      const draftKey = getDraftKey(order._id, item.productId);
                      const draft = reviewDrafts[draftKey] || { rating: 0, comment: '' };
                      const savedReview = reviewsByItem[draftKey];

                      return (
                        <div key={idx} className="dash-review-item">
                          <img src={item.imageUrl || '/SaranyaLOGO.jpg'} alt={item.name} loading="lazy" />
                          <div className="dash-review-body">
                            <h5>{item.name}</h5>
                            <p className="dash-review-meta">{item.category} · {item.karat}</p>
                            <p className="dash-review-meta">Qty {item.quantity} · Rs. {item.price?.toLocaleString()}</p>

                            {!savedReview ? (
                              <>
                                <div className="dash-review-stars">
                                  {[1, 2, 3, 4, 5].map((starValue) => (
                                    <button
                                      key={starValue}
                                      type="button"
                                      className={`dash-star-btn ${starValue <= Number(draft.rating || 0) ? 'is-active' : ''}`}
                                      onClick={() => {
                                        setReviewDrafts((prev) => ({
                                          ...prev,
                                          [draftKey]: { ...draft, rating: starValue }
                                        }));
                                      }}
                                      aria-label={`Rate ${starValue}`}
                                    >★</button>
                                  ))}
                                </div>

                                <textarea
                                  rows={2}
                                  maxLength={1000}
                                  placeholder="Write a short review (optional)"
                                  className="dash-review-textarea"
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
                                  className="dash-review-submit"
                                >Add Review</button>
                              </>
                            ) : (
                              <div className="dash-review-saved">
                                <p className="dash-review-saved-line">
                                  Your Review: <span className="dash-review-saved-stars">{renderStars(savedReview.rating)}</span>
                                </p>
                                {savedReview.comment ? <p className="dash-review-saved-comment">{savedReview.comment}</p> : null}
                                {savedReview.staffReply?.reply ? (
                                  <div className="dash-review-reply">
                                    <p className="dash-review-reply-label">Staff Reply</p>
                                    <p>{savedReview.staffReply.reply}</p>
                                  </div>
                                ) : null}
                                <button
                                  type="button"
                                  onClick={() => deleteReview(savedReview._id, order._id, item.productId)}
                                  className="dash-review-delete"
                                >Delete Review</button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {isProfileOpen ? (
        <div className="dash-modal" role="dialog" aria-modal="true">
          <div className="dash-modal-sheet">
            <div className="dash-modal-header">
              <h2>Edit Profile</h2>
              <button type="button" className="dash-modal-close" onClick={() => setIsProfileOpen(false)} aria-label="Close">×</button>
            </div>
            <div className="dash-modal-body">
              <form onSubmit={updateProfile} className="dash-form">
                <div className="dash-form-group">
                  <label htmlFor="profFullName">Full Name *</label>
                  <input
                    id="profFullName"
                    type="text"
                    required
                    value={profileForm.fullName}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, fullName: e.target.value }))}
                    autoComplete="name"
                  />
                </div>

                <div className="dash-form-group">
                  <label htmlFor="profEmail">Email (Read Only)</label>
                  <input id="profEmail" type="email" readOnly value={profileForm.email} />
                </div>

                <div className="dash-form-group">
                  <label htmlFor="profPhone">Phone Number</label>
                  <input
                    id="profPhone"
                    type="tel"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value }))}
                    autoComplete="tel"
                    inputMode="tel"
                  />
                </div>

                <h3 className="dash-form-section">Address</h3>

                <div className="dash-form-group">
                  <input
                    type="text"
                    placeholder="Street"
                    value={profileForm.street}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, street: e.target.value }))}
                    autoComplete="street-address"
                  />
                </div>

                <div className="dash-form-row">
                  <input
                    type="text"
                    placeholder="City"
                    value={profileForm.city}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, city: e.target.value }))}
                    autoComplete="address-level2"
                  />
                  <input
                    type="text"
                    placeholder="State"
                    value={profileForm.state}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, state: e.target.value }))}
                    autoComplete="address-level1"
                  />
                </div>

                <div className="dash-form-row">
                  <input
                    type="text"
                    placeholder="ZIP Code"
                    value={profileForm.zipCode}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, zipCode: e.target.value }))}
                    autoComplete="postal-code"
                    inputMode="numeric"
                  />
                  <input
                    type="text"
                    placeholder="Country"
                    value={profileForm.country}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, country: e.target.value }))}
                    autoComplete="country-name"
                  />
                </div>

                <div className="dash-modal-actions">
                  <button type="button" onClick={openPasswordModal} className="dash-btn-ghost">Change Password</button>
                  <button type="submit" className="dash-btn-primary">Save Changes</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      {isPasswordOpen ? (
        <div className="dash-modal dash-modal-top" role="dialog" aria-modal="true">
          <div className="dash-modal-sheet dash-modal-sheet-sm">
            <div className="dash-modal-header">
              <h2>Change Password</h2>
              <button type="button" className="dash-modal-close" onClick={closePasswordModal} aria-label="Close">×</button>
            </div>
            <div className="dash-modal-body">
              <form onSubmit={changePassword} className="dash-form">
                <div className="dash-form-group">
                  <label htmlFor="curPwd">Current Password *</label>
                  <input
                    id="curPwd"
                    type="password"
                    required
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                    autoComplete="current-password"
                  />
                </div>
                <div className="dash-form-group">
                  <label htmlFor="newPwd">New Password *</label>
                  <input
                    id="newPwd"
                    type="password"
                    required
                    minLength={6}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                    autoComplete="new-password"
                  />
                </div>
                <div className="dash-form-group">
                  <label htmlFor="confPwd">Confirm New Password *</label>
                  <input
                    id="confPwd"
                    type="password"
                    required
                    minLength={6}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                    autoComplete="new-password"
                  />
                </div>

                <div className="dash-modal-actions">
                  <button type="button" onClick={closePasswordModal} className="dash-btn-ghost">Cancel</button>
                  <button type="submit" className="dash-btn-primary">Update Password</button>
                </div>
              </form>
            </div>
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
