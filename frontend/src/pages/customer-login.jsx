import { useEffect, useMemo, useState } from 'react';
import authManager from '../auth.js';

function getSafeRedirectPath() {
  const redirectParam = new URLSearchParams(window.location.search).get('redirect');
  if (!redirectParam) return '/customer-dashboard';
  if (!redirectParam.startsWith('/') || redirectParam.startsWith('//')) return '/customer-dashboard';
  if (redirectParam.startsWith('/customer-login')) return '/customer-dashboard';
  return redirectParam;
}

export default function CustomerLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [alertState, setAlertState] = useState({ message: '', type: 'error' });
  const [cartCount, setCartCount] = useState(0);
  const [userIconHref, setUserIconHref] = useState('/customer-login');

  const redirectAfterLogin = useMemo(() => getSafeRedirectPath(), []);
  const registerHref = `/customer-register?redirect=${encodeURIComponent(redirectAfterLogin)}`;

  useEffect(() => {
    document.title = 'Customer Login - Saranya Jewellery';

    const cart = JSON.parse(localStorage.getItem('saranyaCart') || '[]');
    const count = cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    setCartCount(count);

    async function updateHeader() {
      try {
        const response = await authManager.apiRequest('/api/customer/me');
        if (!response.ok) return;
        const data = await response.json();
        if (data.customer) {
          setUserIconHref('/customer-dashboard');
        }
      } catch (_error) {
        // Keep guest default.
      }
    }

    updateHeader();
  }, []);

  function showAlert(message, type = 'error') {
    setAlertState({ message, type });
    window.setTimeout(() => setAlertState({ message: '', type: 'error' }), 5000);
  }

  function handleProtectedNav(event, target) {
    event.preventDefault();
    authManager.redirectToLogin('customer', { returnTo: target });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const cleanEmail = email.trim();

    if (!cleanEmail || !password) {
      showAlert('Please fill in all fields');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      showAlert('Please enter a valid email address');
      return;
    }

    setLoading(true);
    const result = await authManager.loginCustomer(cleanEmail, password);
    if (result.success) {
      showAlert('Login successful! Redirecting...', 'success');
      window.setTimeout(() => {
        window.location.href = redirectAfterLogin;
      }, 500);
      return;
    }

    showAlert(result.error || 'Invalid email or password');
    setLoading(false);
  }

  return (
    <>
      <div className="top-bar">
        <div>
          <i className="fas fa-phone" /> <a href="tel:+1234567890">Contact Us</a>
        </div>
        <div />
      </div>

      <header className="header">
        <div className="nav">
          <a href="/">Home</a>
          <a href="/customer-shop">Shop</a>
          <a href="/customer-orders" onClick={(event) => handleProtectedNav(event, '/customer-orders')}>My Orders</a>
          <a href="/customer-loyalty" onClick={(event) => handleProtectedNav(event, '/customer-loyalty')}>Loyalty</a>
          <a href="/customer-support" onClick={(event) => handleProtectedNav(event, '/customer-support')}>Support</a>
        </div>

        <div className="logo">SARANYA JEWELLERY</div>

        <div className="header-icons">
          <i className="fas fa-search header-icon" />
          <a href={userIconHref}><i className="fas fa-user header-icon" /></a>
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
        <div className="login-container" style={{ marginTop: '2rem', marginBottom: '3rem' }}>
          <div className="logo-area">
            <h1>Saranya</h1>
            <p>Customer Login</p>
          </div>

          <div className={`alert ${alertState.message ? `alert-${alertState.type} show` : ''}`}>{alertState.message}</div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="Enter your email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                inputMode="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="next"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                placeholder="Enter your password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="go"
              />
            </div>

            <button type="submit" className="btn" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div style={{ textAlign: 'right', marginTop: '0.8rem' }}>
            <a href="/customer-reset-password" style={{ color: 'var(--brand-burgundy)', fontSize: '0.92rem', textDecoration: 'underline' }}>
              Forgot Password?
            </a>
          </div>

          <div className="footer-links">
            <a href={registerHref}>Create Account</a>
            <span className="divider">|</span>
            <a href="/">Back to Home</a>
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
              <li><a href="/#shipping">Free Shipping</a></li>
            </ul>
          </div>
          <div className="footer-section">
            <h3>SERVICES</h3>
            <ul>
              <li><a href="/#custom">Custom Design</a></li>
              <li><a href="/#resize">Free Ring Resize</a></li>
              <li><a href="/#gift">Gift Services</a></li>
            </ul>
          </div>
          <div className="footer-section">
            <h3>POLICIES</h3>
            <ul>
              <li><a href="/#policies">Our Policies</a></li>
              <li><a href="/#privacy">Privacy Policy</a></li>
              <li><a href="/#terms">Terms & Conditions</a></li>
              <li><a href="/#returns">Return Policy</a></li>
              <li><a href="/#payment">Payment Methods</a></li>
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
