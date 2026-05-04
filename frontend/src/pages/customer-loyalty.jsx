import { useEffect, useMemo, useState } from 'react';
import authManager from '../auth.js';

const TIER_CONFIG = {
  Silver: { minSpent: 0, maxSpent: 50000, multiplier: 1, nextTier: 'Gold' },
  Gold: { minSpent: 50001, maxSpent: 200000, multiplier: 1.5, nextTier: 'Platinum' },
  Platinum: { minSpent: 200001, maxSpent: null, multiplier: 2, nextTier: null }
};

export default function CustomerLoyaltyPage() {
  const [customer, setCustomer] = useState(null);
  const [cart] = useState(() => JSON.parse(localStorage.getItem('saranyaCart') || '[]'));
  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    [cart]
  );

  useEffect(() => {
    document.title = 'Loyalty Rewards - Saranya Jewellery';

    async function bootstrap() {
      const loggedInCustomer = await authManager.checkCustomerAuth();
      if (!loggedInCustomer) return;
      setCustomer(loggedInCustomer);
    }

    bootstrap();
  }, []);

  const points = Number(customer?.loyaltyPoints || 0);
  const totalSpent = Number(customer?.totalSpent || 0);
  const currentTier = customer?.loyaltyTier || 'Silver';
  const tierSettings = TIER_CONFIG[currentTier] || TIER_CONFIG.Silver;
  const nextTier = tierSettings.nextTier ? TIER_CONFIG[tierSettings.nextTier] : null;
  const amountToNextTier = nextTier ? Math.max(0, (nextTier.minSpent || 0) - totalSpent) : 0;

  return (
    <>
      <div className="top-bar">
        <div>
          <i className="fas fa-phone" /> <a href="tel:+1234567890">Contact Us</a>
        </div>
        <div>
          <span style={{ marginRight: '1rem', color: 'var(--brand-gold-strong)' }}>{customer?.fullName || customer?.email || 'Loading...'}</span>
          <span style={{ marginRight: '1rem' }}>Loyalty: {points} Points</span>
          <button type="button" className="logout-btn" onClick={() => authManager.logout()} style={{ fontSize: '0.85rem', padding: '0.3rem 0.8rem' }}>
            Logout
          </button>
        </div>
      </div>

      <header className="header">
        <div className="nav">
          <a href="/">Home</a>
          <a href="/customer-shop">Shop</a>
          <a href="/customer-orders">My Orders</a>
          <a href="/customer-loyalty" className="active">Loyalty</a>
          <a href="/customer-support">Support</a>
        </div>

        <div className="logo">SARANYA JEWELLERY</div>

        <div className="header-icons">
          <i className="fas fa-search header-icon" />
          <i
            className="fas fa-user header-icon"
            style={{ cursor: 'pointer' }}
            onClick={() => {
              window.location.href = '/customer-dashboard';
            }}
          />
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
          <h1 style={{ textAlign: 'center', marginBottom: '2rem', fontFamily: "'Cormorant Garamond', serif", color: 'var(--brand-burgundy)' }}>
            Loyalty Rewards Program
          </h1>

          <div className="section loyalty-card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
            <div style={{ fontSize: '5rem', marginBottom: '1rem' }}><i className="fas fa-gem" /></div>
            <h2 style={{ color: 'var(--brand-gold)', fontSize: '3rem', margin: '1rem 0' }}>
              <span>{points}</span> <span style={{ fontSize: '1.5rem' }}>Points</span>
            </h2>
            <p style={{ fontSize: '1.1rem', color: 'var(--text-medium)', marginTop: '1rem' }}>Your current loyalty points balance</p>
            <div
              style={{
                marginTop: '1.5rem',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '10px',
                padding: '1rem',
                textAlign: 'left',
                maxWidth: '520px',
                marginLeft: 'auto',
                marginRight: 'auto'
              }}
            >
              <p style={{ margin: '0.35rem 0' }}><strong>Current Tier:</strong> {customer?.isLoyalty ? currentTier : 'Not Enrolled'}</p>
              <p style={{ margin: '0.35rem 0' }}><strong>Total Spent:</strong> Rs. {totalSpent.toLocaleString()}</p>
              <p style={{ margin: '0.35rem 0' }}><strong>Points Multiplier:</strong> {tierSettings.multiplier}x</p>
              <p style={{ margin: '0.35rem 0' }}>
                <strong>Next Tier Target:</strong>{' '}
                {nextTier ? `${tierSettings.nextTier} (Rs. ${nextTier.minSpent.toLocaleString()})` : 'Top Tier Reached'}
              </p>
              <p style={{ margin: '0.35rem 0' }}><strong>Amount to Next Tier:</strong> Rs. {amountToNextTier.toLocaleString()}</p>
            </div>
          </div>

          <div className="section">
            <div className="section-header"><h2>How It Works</h2></div>
            <div className="section-content">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', marginTop: '1.5rem' }}>
                <div style={{ textAlign: 'center', padding: '2rem', background: 'var(--bg-light)', borderRadius: '12px' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}><i className="fas fa-wallet" /></div>
                  <h3 style={{ color: 'var(--brand-burgundy)', marginBottom: '1rem' }}>Earn Points</h3>
                  <p style={{ color: 'var(--text-medium)' }}>Earn 1 point for every Rs. 100 you spend on purchases</p>
                </div>
                <div style={{ textAlign: 'center', padding: '2rem', background: 'var(--bg-light)', borderRadius: '12px' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}><i className="fas fa-gift" /></div>
                  <h3 style={{ color: 'var(--brand-burgundy)', marginBottom: '1rem' }}>Redeem Rewards</h3>
                  <p style={{ color: 'var(--text-medium)' }}>100 points = Rs. 100 discount on your next purchase</p>
                </div>
                <div style={{ textAlign: 'center', padding: '2rem', background: 'var(--bg-light)', borderRadius: '12px' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}><i className="fas fa-clock" /></div>
                  <h3 style={{ color: 'var(--brand-burgundy)', marginBottom: '1rem' }}>Never Expire</h3>
                  <p style={{ color: 'var(--text-medium)' }}>Your points never expire and keep accumulating</p>
                </div>
              </div>
            </div>
          </div>

          <div className="section">
            <div className="section-header"><h2>Points History</h2></div>
            <div className="section-content">
              <div className="empty-state">
                <i className="fas fa-history" style={{ fontSize: '3rem', color: '#ddd', marginBottom: '1rem' }} />
                <p style={{ margin: 0 }}>Your points history will appear here</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="footer">
        <div className="footer-content">
          <div className="footer-section">
            <h3>ABOUT SARANYA</h3>
            <ul>
              <li><a href="/#story">Our Story</a></li>
              <li><a href="/#education">Education</a></li>
              <li><a href="/#faq">FAQ</a></li>
            </ul>
          </div>
          <div className="footer-section">
            <h3>WHY SARANYA?</h3>
            <ul>
              <li><a href="/#quality">Quality Guarantee</a></li>
              <li><a href="/#warranty">Lifetime Warranty</a></li>
              <li><a href="/#certification">Certified Jewellery</a></li>
            </ul>
          </div>
          <div className="footer-section">
            <h3>CONNECT WITH US</h3>
            <div className="social-links">
              <a href="#" className="social-icon"><i className="fab fa-facebook-f" /></a>
              <a href="#" className="social-icon"><i className="fab fa-instagram" /></a>
              <a href="#" className="social-icon"><i className="fab fa-twitter" /></a>
              <a href="#" className="social-icon"><i className="fab fa-pinterest" /></a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2026 Saranya Jewellery. All Rights Reserved.</p>
        </div>
      </footer>
    </>
  );
}
