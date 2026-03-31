import { useEffect, useMemo, useState } from 'react';

function getSafeRedirect() {
  const redirectTarget = new URLSearchParams(window.location.search).get('redirect');
  if (!redirectTarget) return null;
  if (!redirectTarget.startsWith('/') || redirectTarget.startsWith('//')) return null;
  return redirectTarget;
}

export default function CustomerRegisterPage() {
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [alertState, setAlertState] = useState({ message: '', type: 'error' });
  const safeRedirect = useMemo(() => getSafeRedirect(), []);

  useEffect(() => {
    document.title = 'Customer Registration - Saranya Jewellery';
  }, []);

  function showAlert(message, type = 'error') {
    setAlertState({ message, type });
    window.setTimeout(() => setAlertState({ message: '', type: 'error' }), 5000);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const fullName = form.fullName.trim();
    const email = form.email.trim();
    const phone = form.phone.trim();

    if (!fullName || !email || !form.password || !form.confirmPassword) {
      showAlert('Please fill in all required fields');
      return;
    }
    if (fullName.length < 3) {
      showAlert('Name must be at least 3 characters long');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showAlert('Please enter a valid email address');
      return;
    }

    if (phone && !/^[\d\s+\-()]+$/.test(phone)) {
      showAlert('Please enter a valid phone number');
      return;
    }
    if (form.password.length < 6) {
      showAlert('Password must be at least 6 characters long');
      return;
    }
    if (form.password !== form.confirmPassword) {
      showAlert('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/customer/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, phone, password: form.password })
      });

      const data = await response.json();
      if (!response.ok) {
        showAlert(data.message || 'Registration failed');
        setLoading(false);
        return;
      }

      showAlert('Registration successful! Redirecting to login...', 'success');
      setForm({ fullName: '', email: '', phone: '', password: '', confirmPassword: '' });
      window.setTimeout(() => {
        const loginPath = safeRedirect
          ? `/customer-login?redirect=${encodeURIComponent(safeRedirect)}`
          : '/customer-login';
        window.location.href = loginPath;
      }, 1500);
    } catch (error) {
      console.error('Registration error:', error);
      showAlert('Network error. Please check your connection and try again.');
      setLoading(false);
    }
  }

  const loginHref = safeRedirect
    ? `/customer-login?redirect=${encodeURIComponent(safeRedirect)}`
    : '/customer-login';

  return (
    <div className="register-container">
      <div className="logo-area">
        <h1>Saranya</h1>
        <p>Customer Registration</p>
      </div>

      <div className="info-note">Join us to enjoy exclusive collections and earn loyalty rewards.</div>
      <div className={`alert ${alertState.message ? `alert-${alertState.type} show` : ''}`}>{alertState.message}</div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="fullName">Full Name</label>
          <input
            type="text"
            id="fullName"
            name="fullName"
            placeholder="Enter your full name"
            required
            value={form.fullName}
            onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
          />
        </div>
        <div className="form-group">
          <label htmlFor="email">Email Address</label>
          <input
            type="email"
            id="email"
            name="email"
            placeholder="Enter your email"
            required
            value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
          />
        </div>
        <div className="form-group">
          <label htmlFor="phone">Phone Number (Optional)</label>
          <input
            type="tel"
            id="phone"
            name="phone"
            placeholder="Enter your phone number"
            value={form.phone}
            onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            name="password"
            placeholder="Create a password"
            required
            minLength={6}
            value={form.password}
            onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
          />
        </div>
        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm Password</label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            placeholder="Re-enter password"
            required
            minLength={6}
            value={form.confirmPassword}
            onChange={(event) => setForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
          />
        </div>

        <button type="submit" className="btn" disabled={loading}>
          {loading ? 'Registering...' : 'Register'}
        </button>
      </form>

      <div className="footer-links">
        <a href={loginHref}>Already have an account? Login</a>
        <span className="divider">|</span>
        <a href="/">Back to Home</a>
      </div>
    </div>
  );
}
